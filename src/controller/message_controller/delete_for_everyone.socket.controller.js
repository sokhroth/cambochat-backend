const participant_service = require("../../service/repository/Participant.service");
const message_service = require("../../service/repository/Message.service");
const { getUser } = require("../../service/repository/user.service");
const { DEMO_CHAT_ID } = require("../../helper/demo_data.helper");

// Provide : {chat_id : chat id, message_id : message id}
async function delete_for_everyone(socket, data, emitEvent) {
  try {
    // Fetch user details using user_id from socket authentication data
    const isUser = await getUser({ user_id: socket.authData.user_id });

    // Validate required chat_id and message_id in data
    if (!data.chat_id || !data.message_id) {
      return emitEvent(
        [socket.id],
        "message_list",
        "Chat id and message Id are required"
      );
    }
    const isDemoChat = process.env.IS_CLIENT != "true" && DEMO_CHAT_ID.includes(Number(data.chat_id));
    if (isDemoChat) {
      return emitEvent(
        [socket.id],
        "delete_for_everyone",
        "This is demo chat you can not make changes in it",
        (success = false) // fallback response
      );
    }
    // Check if user exists
    if (!isUser) {
      return next(new Error("User not found."));
    }

    // Fetch the message to be deleted
    const message = await message_service.getMessage(data);
    // Check if the user is the sender of the message
    if (message && message.sender_id == isUser.user_id) {
      // Update the message to mark as deleted for everyone and reset related fields
      const deleted_message = await message_service.updateMessage(
        { message_id: Number(data.message_id) },
        {
          deleted_for_everyone: true,
          message_content: "This message was deleted.",
          pinned: false,
          pinned_till: null,
          pin_lifetime: null,
          starred_for: [],
        }
      );

      // If message was successfully updated
      if (deleted_message.length > 0) {
        // Fetch all participants in the chat
        const participants =
          await participant_service.getParticipantWithoutPagenation({
            chat_id: message.chat_id,
          });
        // Get user details for all participants
        const users = await Promise.all(
          participants.Records.map(
            async (user) => await getUser({ user_id: user.user_id })
          )
        );
        // Collect all socket IDs from users
        const socket_ids = users.flatMap((user) => user.socket_ids);

        // Emit event to all participants to notify message deletion
        emitEvent(
          [...socket_ids],
          "delete_for_everyone",
          deleted_message[1][0].toJSON()
        );
      }
    } else {
      // If user is not the sender, emit error event
      return emitEvent(
        [socket.id],
        "delete_for_everyone",
        "You are not the sender of this message.",
        (success = false)
      );
    }
  } catch (err) {
    // Handle unexpected errors
    console.log(err);
    throw new Error(err.message || "Failed to delete the message.");
  }
}

module.exports = {
  delete_for_everyone,
};