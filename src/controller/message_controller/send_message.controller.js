const socket_service = require("../../service/common/socket.service");
const participant_service = require("../../service/repository/Participant.service");
const message_service = require("../../service/repository/Message.service");
const message_seen_service = require("../../service/repository/Message_seen.service");
const chat_service = require("../../service/repository/Chat.service");
const { Chat } = require("../../../models");
const updateFieldsFilter = require("../../helper/updateField.helper");
const {
  getUser,
} = require("../../service/repository/user.service");
const { generalResponse } = require("../../helper/response.helper");
const { User, Message, Story } = require("../../../models");
const filterData = require("../../helper/filter.helper");
const { isBlocked } = require("../../service/common/blocked.service");
const poll_service = require("../../service/repository/Poll.service");
const { sendPushNotification } = require("../../service/common/oneSignal.service");
const { getStory } = require("../../service/repository/Story.service");

async function sendMessage(req, res) {
  try {
    // Get user ID from authenticated request data
    const user_id = req.authData.user_id;
    if (!req.body.chat_type) {
      req.body.chat_type = "private";
    }
    // Fetch sender user details
    const glob_user = await getUser({ user_id: user_id });

    // Define allowed fields and mandatory fields for message
    allowedUpdateFields = [
      "chat_id",
      "user_id",
      "participant_id",
      "reply_to",
      "chat_type",
      "message_length",
      "message_size",
      "forwarded_from",
      "peer_user",
      "message_thumbnail",
      "story_id",
    ];
    allowedMandataryFields = ["message_type", "message_content"];
    let filteredData;
    let filteredDataMadatary;
    let filteredDataPayload;
    try {
      // Filter and validate allowed fields from request body
      filteredData = updateFieldsFilter(req.body, allowedUpdateFields, false);
      // Add poll fields if message type is poll
      if (req.body.message_type === "poll") {
        allowedMandataryFields.push("poll_options");
        allowedMandataryFields.push("allow_multiple_votes");
      }
      // Filter and validate mandatory fields from request body
      filteredDataMadatary = updateFieldsFilter(
        req.body,
        allowedMandataryFields,
        true
      );
      // Merge filtered data
      filteredDataPayload = { ...filteredData, ...filteredDataMadatary };
      // Handle file uploads for different message types
      if (filteredDataPayload.message_type === "image" && !filteredData.forwarded_from) {
        filteredDataPayload.message_content = req.files[0].path;
      }
      if (filteredDataPayload.message_type === "video" && !filteredData.forwarded_from) {
        filteredDataPayload.message_thumbnail = req.files[0].path;
        filteredDataPayload.message_content = req.files[1].path;
      }
      if (filteredDataPayload.message_type == "story_reply") {
        const exitsStory = await getStory({
          story_id: filteredDataPayload.story_id
        })
        filteredDataPayload.user_id = exitsStory.user_id
      }
      if (filteredDataPayload.message_type === "doc" && !filteredData.forwarded_from) {
        filteredDataPayload.message_content = req.files[0].path;
      }
    } catch (err) {
      // Handle validation errors
      console.log(err);
      return generalResponse(
        res,
        { success: false },
        err.message,
        false,
        true
      );
    }

    // Check if user is blocked by or has blocked the recipient
    if (filteredData.user_id && (await isBlocked(user_id, filteredData.user_id) || await isBlocked(filteredData.user_id, user_id))) {
      return generalResponse(
        res,
        {},
        "You can't send message to this user.",
        true,
        false,
        402
      );
    }

    // If chat_id is not present, create or fetch chat between users
    if (filteredDataPayload.user_id && !filteredDataPayload.chat_id) {
      filteredDataPayload.user_id = Number(filteredDataPayload.user_id);
      // Check if recipient user exists
      if ((await getUser({ user_id: filteredDataPayload.user_id })) == null) {
        return generalResponse(
          res,
          { success: false },
          "Recipient not found",
          false,
          true,
          404
        );
      }
      // Check if chat already exists between users
      const isChat = await participant_service.alreadyParticipantIndividual(
        user_id,
        filteredDataPayload.user_id
      );
      if (!isChat) {
        // Create new chat and add both users as participants
        const newChat = await chat_service.createChat({
          chat_type: filteredDataPayload.chat_type,
        });
        filteredDataPayload.chat_id = newChat.chat_id;
        await participant_service.createParticipant(filteredDataPayload);
        await participant_service.createParticipant({
          user_id: user_id,
          chat_id: filteredDataPayload.chat_id,
        });
      } else {
        // Use existing chat and update chat/participant info
        filteredDataPayload.chat_id = isChat;
        chat_service.updateChat({ cleared_for: [], deleted_for: [] }, { chat_id: filteredDataPayload.chat_id })
        participant_service.updateParticipant({ updatedAt: new Date(), updated_at: new Date() }, { chat_id: filteredDataPayload.chat_id },)
      }
    }

    // Options for including related models in message queries
    const includeOptionsforChat = [
      {
        model: Message,
        as: "ParentMessage",
        include: [{
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
          ],
        }]
      },
      {
        model: Message,
        as: "Replies",
      },
      {
        model: Story,
        include: [{
          model: User,
          as: "user",
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
        }]
      },
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
      {
        model: User,
        as: "ActionedUser",
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

    const foreignKeysConfig = [];
    filteredDataPayload.sender_id = user_id;

    // Fetch chat details and check if group is blocked
    const chat = await chat_service.getChat({ chat_id: filteredDataPayload.chat_id })
    if (chat.is_group_blocked) return generalResponse(
      res,
      {},
      "Chat is blocked by admin.",
      false,
      true,
      400
    )

    // Create new message in the database
    const newMessage = await message_service.createMessage(filteredDataPayload);

    participant_service.updateParticipant({ update_counter: true }, {
      chat_id: filteredDataPayload.chat_id
    },)

    // If message is a poll, create poll entry
    if (filteredDataPayload.message_type === "poll") {
      await poll_service.createPoll(
        {
          'message_id': newMessage.message_id,
          'chat_id': filteredDataPayload.chat_id,
          'poll_options': filteredDataPayload.poll_options,
          'allow_multiple_votes': filteredDataPayload.allow_multiple_votes
        }
      );
    }

    // Mark message as seen by sender
    const messageSeenBySender = await message_seen_service.createMessageSeen(
      {
        message_seen_status: "seen",
        message_id: newMessage.message_id,
        chat_id: filteredDataPayload.chat_id,
        user_id: glob_user.user_id
      }
    )

    if (newMessage) {
      // Fetch message details after creation
      let NewMessageAfterCreation = await message_service.getMessages(
        { message_id: newMessage.message_id },
        includeOptionsforChat,
        {
          page: 1,
          pageSize: 1,
        },
        foreignKeysConfig
      );
      // Get all participants in the chat
      const Participants =
        await participant_service.getParticipantWithoutPagenation({
          chat_id: newMessage.chat_id,
        });

      // Prepare peer user data for notification
      for (const element of Participants.Records) {
        if (element.user_id != glob_user.user_id) {
          const is_user = await getUser({
            user_id: element.user_id,
          });

          const keysToRemove = [
            "password",
            "otp",
            "id_proof",
            "selfie",
            "device_token",
          ];
          let user_data = { ...is_user.toJSON() };

          keysToRemove.forEach((key) => {
            user_data = filterData(user_data, key, "key");
          });
          peer_user = user_data;
        }
      }

      const keysToRemove = ["password", "otp", "id_proof", "selfie", "device_token"];

      // Get all users in the chat
      const participants = await participant_service.getParticipantWithoutPagenation({
        chat_id: newMessage.chat_id,
      });

      const users = await Promise.all(
        participants.Records.map((p) => getUser({ user_id: p.user_id }))
      );
      for (const user of users) {
        let user_data = { ...user.toJSON() };
        keysToRemove.forEach((key) => {
          user_data = filterData(user_data, key, "key");
        });

        // Create a deep copy to avoid modifying same object for all users
        let messageCopy = JSON.parse(JSON.stringify(NewMessageAfterCreation));
        if (user.user_id != glob_user.user_id) {
          // This is not sender (other user)
          messageCopy.Records[0].peerUserData = { ...glob_user.toJSON() };

          // Mark message as delivered for peer user
          await message_seen_service.createMessageSeen({
            message_seen_status: "delivered",
            message_id: newMessage.message_id,
            chat_id: filteredDataPayload.chat_id,
            user_id: user.user_id,
          });

          // Get count of unseen messages for peer user
          const unseenCount = await message_seen_service.getMessageSeenCount({
            andConditions: {
              chat_id: filteredDataPayload.chat_id,
              user_id: user.user_id,
            },
            orConditions: {
              message_seen_status: ["delivered", "sent"],
            },
          });

          messageCopy.Records[0].unseen_count = unseenCount.count;
        } else {
          // This is for sender (current user)
          const notsenderUsers = users.filter(user => user.user_id !== glob_user.user_id);


          messageCopy.Records[0].peerUserData = notsenderUsers[0].toJSON();
          keysToRemove.forEach((key) => {
            messageCopy.Records[0].peerUserData = filterData(
              messageCopy.Records[0].peerUserData,
              key,
              "key"
            );
          });
          messageCopy.Records[0].unseen_count = 0;
        }
        // Get sender's name as saved in users contact list, to show name of sender in the notification.
        const contact = user.contact_details.find(
          (c) => c.user_id === glob_user.user_id
        );

        const contact_name = contact ? contact.name : glob_user.user_name;
        let group_name_for_notification = contact_name
        let message_contact_name = ""
        if (chat.chat_type == "group") {
          group_name_for_notification = chat.group_name
          message_contact_name = `${contact_name}: `
        }

        let notification_title
        if (user.user_id != glob_user.user_id) {
          // Send push notification based on message type
          if (filteredDataPayload.message_type === "text") {
            if (chat.chat_type != "group") {
              message_contact_name = ``
            }
            sendPushNotification({
              playerIds: [user.device_token],
              title: `${group_name_for_notification} `,
              message: `${message_contact_name}${messageCopy.Records[0].message_content}`,
              large_icon: glob_user.profile_pic,
              data: {
                message_id: messageCopy.Records[0].message_id,
                message_id: messageCopy.Records[0].chat_id,
                message_content: messageCopy.Records[0].message_content,
                message_type: messageCopy.Records[0].message_type,
                message_thumbnail: messageCopy.Records[0].message_thumbnail,
                sender_id: messageCopy.Records[0].sender_id,
              },
            });
          }
          if (filteredDataPayload.message_type === "location") {
            sendPushNotification({
              playerIds: [user.device_token],
              title: `${group_name_for_notification}`,
              message: `${message_contact_name}📌 Location`,
              large_icon: glob_user.profile_pic,
              data: {
                message_id: messageCopy.Records[0].message_id,
                message_id: messageCopy.Records[0].chat_id,
                message_content: messageCopy.Records[0].message_content,
                message_type: messageCopy.Records[0].message_type,
                message_thumbnail: messageCopy.Records[0].message_thumbnail,
                sender_id: messageCopy.Records[0].sender_id,
              },
            });
          }
          if (filteredDataPayload.message_type === "contact") {
            sendPushNotification({
              playerIds: [user.device_token],
              title: `${group_name_for_notification}`,
              message: `${message_contact_name}👤 Contact`,
              large_icon: glob_user.profile_pic,
              data: {
                message_id: messageCopy.Records[0].message_id,
                message_id: messageCopy.Records[0].chat_id,
                message_content: messageCopy.Records[0].message_content,
                message_type: messageCopy.Records[0].message_type,
                message_thumbnail: messageCopy.Records[0].message_thumbnail,
                sender_id: messageCopy.Records[0].sender_id,
              },
            });
          }
          if (filteredDataPayload.message_type === "image") {
            sendPushNotification({
              playerIds: [user.device_token],
              title: `${group_name_for_notification}`,
              message: `${message_contact_name}📸 Photo`,
              large_icon: glob_user.profile_pic,
              big_picture: NewMessageAfterCreation.Records[0].message_content,
              data: {
                message_id: messageCopy.Records[0].message_id,
                message_id: messageCopy.Records[0].chat_id,
                message_content: messageCopy.Records[0].message_content,
                message_type: messageCopy.Records[0].message_type,
                message_thumbnail: messageCopy.Records[0].message_thumbnail,
                sender_id: messageCopy.Records[0].sender_id,
              },
            });
          }
          if (filteredDataPayload.message_type === "gif") {
            sendPushNotification({
              playerIds: [user.device_token],
              title: `${group_name_for_notification}`,
              message: `${message_contact_name}🖼 Gif`,
              large_icon: glob_user.profile_pic,
              big_picture: NewMessageAfterCreation.Records[0].message_content,
              data: {
                message_id: messageCopy.Records[0].message_id,
                message_id: messageCopy.Records[0].chat_id,
                message_content: messageCopy.Records[0].message_content,
                message_type: messageCopy.Records[0].message_type,
                message_thumbnail: messageCopy.Records[0].message_thumbnail,
                sender_id: messageCopy.Records[0].sender_id,
              },
            });
          }
          if (filteredDataPayload.message_type === "video") {
            sendPushNotification({
              playerIds: [user.device_token],
              title: `${group_name_for_notification}`,
              message: `${message_contact_name}📹 Video`,
              large_icon: glob_user.profile_pic,
              big_picture: messageCopy.Records[0].message_thumbnail,
              data: {
                message_id: messageCopy.Records[0].message_id,
                message_id: messageCopy.Records[0].chat_id,
                message_content: messageCopy.Records[0].message_content,
                message_type: messageCopy.Records[0].message_type,
                message_thumbnail: messageCopy.Records[0].message_thumbnail,
                sender_id: messageCopy.Records[0].sender_id,
              },
            });
          }
          if (filteredDataPayload.message_type === "doc") {
            sendPushNotification({
              playerIds: [user.device_token],
              title: `${group_name_for_notification}`,
              message: `${message_contact_name}📄 Document`,
              large_icon: glob_user.profile_pic,
              big_picture: NewMessageAfterCreation.Records[0].message_content,
              data: {
                message_id: messageCopy.Records[0].message_id,
                message_id: messageCopy.Records[0].chat_id,
                message_content: messageCopy.Records[0].message_content,
                message_type: messageCopy.Records[0].message_type,
                message_thumbnail: messageCopy.Records[0].message_thumbnail,
                sender_id: messageCopy.Records[0].sender_id,
              },
            });
          }
        }

        // Emit message to all user sockets
        socket_service.emitEvent(user.socket_ids, "receive", messageCopy);
      }


      // Clear chat to update the updatedAt field, and also empty the cleared_for and deleted_for arrays.
      chat_service.updateChat(
        {
          cleared_for: [],
          deleted_for: []
        },
        { chat_id: filteredDataPayload.chat_id }
      );

      // Send response indicating message sent successfully
      return generalResponse(
        res,
        newMessage,
        "Message sent Successfully !!",
        true,
        200
      );
    }

    // If message creation failed, send error response
    return generalResponse(
      res,
      {},
      "error in sending message",
      true,
      false,
      400
    );
  } catch (error) {
    // Handle unexpected errors
    console.error("Error in sending Message", error);
    return generalResponse(
      res,
      { success: false },
      error.message,
      false,
      true
    );
  }
}

module.exports = {
  sendMessage
};