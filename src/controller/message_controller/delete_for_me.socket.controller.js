const { DEMO_CHAT_ID } = require("../../helper/demo_data.helper");
const message_service = require("../../service/repository/Message.service");
const { getUser } = require("../../service/repository/user.service");

// Provide : {chat_id : chat id, message_id : message id}
async function delete_for_me(socket, data, emitEvent) {
  try {
    // Validate required message_id and chat_id in data
    if (!data.message_id || !data.chat_id) {
      return emitEvent(
        [socket.id],
        "delete_for_me",
        "Message id and chat id is required.",
        (success = false)
      );
    }
    const isDemoChat = process.env.IS_CLIENT != "true" && DEMO_CHAT_ID.includes(Number(data.chat_id));
    if (isDemoChat) {
      return emitEvent(
        [socket.id],
        "delete_for_me",
        "This is demo chat you can not make changes in it",
        (success = false) // fallback response
      );
    }
    // Fetch user details using user_id from socket authentication data
    const isUser = await getUser({ user_id: socket.authData?.user_id });

    // Check if user exists
    if (!isUser) {
      return next(new Error("User not found."));
    }

    // Fetch the message to be deleted
    const message = await message_service.getMessage(data);
    // Check if the message is already deleted for this user
    const deleted_message = !message.deleted_for.includes(
      isUser.dataValues.user_id.toString()
    )
      // If not deleted, update the message to add user to deleted_for array
      ? await message_service.updateMessage(
          { message_id: Number(data.message_id) },
          {
            deleted_for: [
              ...message.deleted_for,
              isUser.dataValues.user_id.toString(),
            ],
          }
        )
      : null;
    if (deleted_message) {
      // Emit event to user indicating successful deletion
      emitEvent([socket.id], "delete_for_me", "Message deleted successfully.");
    } else {
      // Emit event to user indicating message was already deleted
      emitEvent([socket.id], "delete_for_me", "Message Already deleted.");
    }
  } catch (err) {
    // Handle unexpected errors
    console.log(err);
    return emitEvent(
      [socket.id],
      "delete_for_me",
      "Error in deleting message.",
      (success = false)
    );
  }
}

module.exports = {
  delete_for_me,
};