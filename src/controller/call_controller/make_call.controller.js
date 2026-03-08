const { emitEvent } = require("../../service/common/socket.service");
const call_service = require("../../service/repository/call.service");
const message_service = require("../../service/repository/Message.service");
const { getUser } = require("../../service/repository/user.service");
const participant_service = require("../../service/repository/Participant.service");
const { generateRoomId } = require("../../service/repository/call.service");
const {
  sendPushNotification,
} = require("../../service/common/oneSignal.service");
const { User, Chat, Message } = require("../../../models");
const { getChat } = require("../../service/repository/Chat.service");
const {
  createMessageSeen,
  getMessageSeenCount,
} = require("../../service/repository/Message_seen.service");
const filterData = require("../../helper/filter.helper");

async function makeCall(req, res) {
  try {
    const { chat_id, call_type } = req.body;

    // ✅ Validate required inputs
    if (!chat_id || !call_type) {
      return res.status(400).json({
        success: false,
        error: "chat_id and call_type are required.",
      });
    }

    const user_id = req.authData.user_id;

    // ✅ Get caller's details
    const glob_user = await getUser({ user_id: user_id });

    // ✅ Ensure the caller is a participant in the chat
    const isParticipant = await participant_service.isParticipant(
      user_id,
      chat_id
    );
    if (!isParticipant) {
      return res.status(400).json({
        success: false,
        error: "You cannot make calls in this chat.",
      });
    }

    // ✅ Create a new "call message" in the chat
    const message = await message_service.createMessage({
      chat_id: chat_id,
      message_content: "calling",
      message_type: "call",
      sender_id: user_id,
    });

    // ✅ Fetch message with related data (sender, chat, replies, etc.)
    const includeOptionsforChat = [
      { model: Message, as: "ParentMessage" },
      { model: Message, as: "Replies" },
      {
        model: User,
        attributes: [
          "profile_pic",
          "user_id",
          "full_name",
          "user_name",
          "email",
          "country_code",
          "country",
          "gender",
          "bio",
          "profile_verification_status",
          "login_verification_status",
          "socket_ids",
        ],
      },
      { model: Chat, as: "Chat" },
    ];
    let NewMessageAfterCreation = await message_service.getMessages(
      { message_id: message.message_id },
      includeOptionsforChat,
      { page: 1, pageSize: 1 },
      []
    );

    // ✅ Mark the call message as "seen" by the caller immediately
    await createMessageSeen({
      message_seen_status: "seen",
      message_id: message.message_id,
      chat_id: chat_id,
      user_id: user_id,
    });

    // ✅ Get chat details
    const chat = await getChat({ chat_id: chat_id });

    // ✅ Select attributes based on chat type
    let attributes = [];
    if (chat.chat_type == "group") {
      attributes = ["user_id", "full_name", "device_token", "socket_ids"];
    } else {
      attributes = ["user_id", "contact_details", "device_token", "socket_ids"];
    }

    // ✅ Get all participants of the chat
    const participants =
      await participant_service.getParticipantWithoutPagenation(
        { chat_id: chat_id },
        [{ model: User, attributes: attributes }]
      );

    // ✅ Create a new call record in DB
    const room_id = generateRoomId();
    const call = await call_service.makeCall({
      call_type: call_type,
      call_status: "ringing",
      call_duration: 0,
      // start_time: new Date(),
      end_time: new Date(),
      users: [user_id],
      message_id: message.message_id,
      chat_id: chat_id,
      user_id: user_id,
      room_id: room_id,
      current_users: [user_id],
    });

    if (!call) {
      return res.status(400).json({
        success: false,
        error: "Failed to make a call.",
      });
    }

    // ✅ Collect device tokens for push notifications
    const participant_ids = participants.Records.map((user) => {
      if (user_id != user.User.user_id) return user.User.device_token;
    });

    // ✅ Fetch full user info (excluding sensitive fields)
    const user = await getUser(
      { user_id },
      [],
      [
        "password",
        "otp",
        "platforms",
        "contact_details",
        "login_type",
        "gender",
      ]
    );

    // ✅ Send push notifications
    let name;
    if (chat.chat_type == "group") {
      // For group calls
      sendPushNotification({
        playerIds: participant_ids,
        title: `${chat.group_name} group call`,
        message: "ringing",
        data: {
          success: true,
          call: { ...call.dataValues, caller_name: chat.group_name },
          chat,
          user,
        },
        collapse_id: call.call_id,
      });
    } else {
      // For private calls → Find contact name
      participants.Records.map(async (user) => {
        if (user.user_id != user_id) {
          user.User.contact_details.map((contact) => {
            if (contact.user_id == user_id) {
              name = contact.name;
              return;
            }
          });
        }
      });

      sendPushNotification({
        playerIds: participant_ids,
        title: `${name} is calling you`,
        message: "ringing",
        data: {
          success: true,
          call: { ...call.dataValues, caller_name: name },
          chat,
          user,
        },
        collapse_id: call.call_id,
      });
    }

    // ✅ Return response to API caller
    res.status(200).json({
      success: true,
      call: { ...call.dataValues, caller_name: name ?? "" },
      user,
    });

    // ✅ Notify all participants via socket events
    const messageCopy = JSON.parse(JSON.stringify(NewMessageAfterCreation));
    participants.Records.map(async (participant) => {
      const user_data = await getUser({ user_id: participant.user_id });

      if (participant.user_id != user_id) {
        // Mark message as delivered for other participants
        await createMessageSeen({
          message_seen_status: "delivered",
          message_id: message.message_id,
          chat_id: chat_id,
          user_id: user_data.user_id,
        });

        // Get unseen message count
        const unseenCount = await getMessageSeenCount({
          andConditions: { chat_id: chat_id, user_id: user_data.user_id },
          orConditions: { message_seen_status: ["delivered", "sent"] },
        });

        // Emit incoming call event to the participant
        emitEvent(user_data.socket_ids, "receiving_call", {
          call: { ...call.dataValues, caller_name: name },
          user,
          chat,
        });

        messageCopy.Records[0].peerUserData = user_data;
        messageCopy.Records[0].unseen_count = unseenCount.count;
      } else {
        // Prepare safe user data for the caller
        const keysToRemove = [
          "password",
          "otp",
          "id_proof",
          "selfie",
          "device_token",
        ];
        messageCopy.Records[0].peerUserData = { ...glob_user.toJSON() };
        keysToRemove.forEach((key) => {
          messageCopy.Records[0].peerUserData = filterData(
            messageCopy.Records[0].peerUserData,
            key,
            "key"
          );
        });
        messageCopy.Records[0].unseen_count = 0;
      }
      messageCopy.Records[0].Calls = [call.dataValues];
      
      // Send updated message data to participants
      emitEvent(user_data.socket_ids, "receive", messageCopy);
    });
  } catch (error) {
    console.error("Error in making call", error);
    return res.status(400).json({
      success: false,
      error: error.message,
    });
  }
}

module.exports = { makeCall };
