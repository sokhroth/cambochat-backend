const call_service = require("../../service/repository/call.service");
const message_service = require("../../service/repository/Message.service");
const { getUser } = require("../../service/repository/user.service");
const participant_service = require("../../service/repository/Participant.service");
const {
  sendPushNotification,
} = require("../../service/common/oneSignal.service");
const { User } = require("../../../models");
const { getChat } = require("../../service/repository/Chat.service");

async function missedCall(socket, data, emitEvent, emitToRoom) {
  try {
    // ✅ Validate required data
    if (!data.call_id || !data.peer_id) {
      return emitEvent([socket.id], "call", {
        success: false,
        error: "call_id and peer_id are required.",
      });
    }

    const user_id = socket.authData.user_id;

    // ✅ Check if the user is a participant of the chat
    const isParticipant = await participant_service.isParticipant(
      user_id,
      data.chat_id
    );

    if (!isParticipant) {
      return emitEvent([socket.id], "call", {
        success: false,
        error: "You are not the participant of this chat.",
      });
    }

    // ✅ Fetch and update call status to "missed"
    let call = await call_service.getCall({ call_id: data.call_id });
    call = await call_service.updateCallStatus(data.call_id, {
      call_status: "missed",
      end_time: new Date(),
      call_duration: 0,
    });

    if (!call) {
      return emitEvent([socket.id], "call", {
        success: false,
        error: "Failed to miss a call.",
      });
    }

    // call update result returns [affectedRows, [updatedRows]], so take the first updated call
    call = call[1][0];

    // ✅ Get all participants of this chat
    const participants =
      await participant_service.getParticipantWithoutPagenation(
        {
          chat_id: call.chat_id,
        },
        [
          {
            model: User,
            attributes: ["user_id", "device_token", "socket_ids"],
          },
        ]
      );

    // ✅ Get chat & user details
    const chat = await getChat({ chat_id: data.chat_id });
    const user = await getUser({ user_id: user_id });

    // ✅ If it's a private call & still "ringing", update message to "missed call"
    if (call.call_status == "ringing" && chat.chat_type == "private") {
      await message_service.updateMessage(
        { message_id: call.message_id },
        { message_content: "missed call" }
      );
    }

    // ✅ Push notification for missed call
    sendPushNotification({
      playerIds: participants.Records.map((user) => user.device_token),
      title: "Call missed",
      body: "Call missed",
      collapse_id: call.call_id,
    });

    let name;

    // ✅ Handle group call missed notification
    if (chat.chat_type == "group") {
      sendPushNotification({
        playerIds: participants.Records.map((user) => user.device_token),
        title: `${chat.group_name} group call`,
        message: "ringing",
        data: {
          success: true,
          call: { ...call.dataValues, peer_id: data.peer_id },
          user,
        },
        collapse_id: call.call_id,
      });
    } else {
      // ✅ Handle private call missed notification
      participants.Records.map(async (user) => {
        if (user.user_id != user_id) {
          // Find the caller’s name from saved contact details
          user.User.contact_details.map((contact) => {
            if (contact.user_id == user_id) {
              name = contact.name;
              return;
            }
          });
        }
      });

      // Send push notification with caller’s name
      sendPushNotification({
        playerIds: participants.Records.map((user) => user.device_token),
        title: `${name} is calling you`,
        message: "ringing",
        data: {
          success: true,
          call: { ...call.dataValues, peer_id: data.peer_id },
          user,
          caller_name: name,
        },
        collapse_id: call.call_id,
      });
    }

    // ✅ Notify all sockets in the room about the missed call
    emitToRoom(call.room_id, "missed_call", {
      user,
      call,
      peer_id: data.peer_id,
    });
  } catch (error) {
    console.error("Error in missing call", error);
    // Send error back to the client
    return emitEvent([socket.id], "call", {
      success: false,
      error: error.message,
    });
  }
}

module.exports = {
  missedCall,
};
