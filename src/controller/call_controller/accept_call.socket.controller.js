const call_service = require("../../service/repository/call.service");
const message_service = require("../../service/repository/Message.service");
const { getUser } = require("../../service/repository/user.service");
const participant_service = require("../../service/repository/Participant.service");

async function acceptCall(socket, data, emitEvent, emitToRoom, joinRoom) {
  try {
    // ✅ Validate required parameters
    if (!data.call_id || !data.peer_id) {
      return emitEvent([socket.id], "call", {
        success: false,
        error: "call_id and peer_id are required.",
      });
    }

    const user_id = socket.authData.user_id; // ✅ Extract user_id from socket authentication

    // ✅ Check if the user is a participant of the chat
    const isParticipant = await participant_service.isParticipant(
      user_id,
      data.chat_id
    );
    if (!isParticipant) {
      return emitEvent([socket.id], "call", {
        success: false,
        error:
          "You are not a participant of this chat, so you cannot join this call.",
      });
    }

    // ✅ Fetch call details from DB
    let call = await call_service.getCall({ call_id: data.call_id });

    // ✅ If no active users are left in the call, consider it ended
    if (call?.current_users?.length <= 0)
      return emitEvent([socket.id], "call", {
        success: false,
        error: "Call has been ended.",
      });

    // ✅ Update call status → mark as ongoing, set start time, add user
    // call = await call_service.updateCallStatus(data.call_id, {
    //   call_status: "ongoing",
    //   start_time: new Date(),
    //   users: [...call.users, user_id], // add this user to all participants
    //   current_users: [...(call.current_users ?? []), user_id], // add to currently active users
    // });

    const uniqueUsers = [...new Set((call.users ?? []).map(String).concat(String(user_id)))];
    const uniqueCurrentUsers = [...new Set((call.current_users ?? []).map(String).concat(String(user_id)))];

    call = await call_service.updateCallStatus(data.call_id, {
      call_status: "ongoing",
      start_time: !call.start_time && call.users.length < 2 ? new Date() : call.start_time,
      // start_time: call.users.length < 2 ?new Date() : call.start_time,
      users: uniqueUsers,
      current_users: uniqueCurrentUsers,
    });
    const call_temp = await call_service.getCall({ call_id: data.call_id });


    call = call[1][0]; // Sequelize update returns [affectedCount, updatedRows], extract updated row
    if (!call) {
      return emitEvent([socket.id], "call", {
        success: false,
        error: "Failed to accept a call.",
      });
    }

    // ✅ Join socket room for the call (so they can receive events)
    joinRoom(socket, call.room_id);

    // ✅ Update the related message status to "ongoing"
    await message_service.updateMessage(
      { message_id: call.message_id },
      { message_content: "ongoing" }
    );

    // ✅ Fetch user details for notifying other participants
    const user = await getUser({ user_id: user_id });

    // ✅ Notify all users in the room that a new user has joined
    emitToRoom(call.room_id, "user_joined", {
      user,
      call,
      peer_id: data.peer_id,
    });
  } catch (error) {
    console.error("Error in accepting call", error);

    // ❌ If error occurs, notify only the current socket
    return emitEvent([socket.id], "call", {
      success: false,
      error: error.message,
    });
  }
}

module.exports = {
  acceptCall,
};
