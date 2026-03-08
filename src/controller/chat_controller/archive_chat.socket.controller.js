// Import required services
const { DEMO_CHAT_ID } = require("../../helper/demo_data.helper");
const chat_service = require("../../service/repository/Chat.service");
const { getUser } = require("../../service/repository/user.service");

async function archive_chat(socket, data, emitEvent) {
  try {
    // ✅ Step 1: Get current user info from auth data
    const isUser = await getUser({ user_id: socket.authData.user_id });

    // ✅ Step 2: Validate required chat_id
    if (!data.chat_id) {
      return emitEvent(
        [socket.id],
        "archive_chat",
        "chat_id is needed.",
        (success = false) // fallback response
      );
    }
    const isDemoChat = process.env.IS_CLIENT != "true" && DEMO_CHAT_ID.includes(Number(data.chat_id));
    if (isDemoChat) {
      return emitEvent(
        [socket.id],
        "archive_chat",
        "This is demo chat you can not make changes in it",
        (success = false) // fallback response
      );
    }

    // ✅ Step 3: Fetch the chat details
    const chat = await chat_service.getChat({ chat_id: data.chat_id });

    // ✅ Step 4: Check if the chat is already archived for this user
    let isarchived = chat.dataValues.archived_for.filter(
      (id) => id == isUser.user_id
    );
    isarchived = isarchived.length > 0; // true if already archived

    // ✅ Step 5: Toggle archive status
    if (!isarchived) {
      // Archive chat → add user_id to archived_for array
      await chat_service.updateChat(
        { archived_for: [...chat.dataValues.archived_for, isUser.user_id] },
        { chat_id: data.chat_id }
      );
    } else {
      // Unarchive chat → remove user_id from archived_for array
      await chat_service.updateChat(
        {
          archived_for: chat.dataValues.archived_for.filter(
            (id) => id != isUser.user_id
          ),
        },
        { chat_id: data.chat_id }
      );
    }

    // ✅ Step 6: Emit success event back to the user
    emitEvent(isUser.dataValues.socket_ids, "archive_chat", {
      success: true,
      chat_id: data.chat_id,
      isArchived: !isarchived, // true if just archived, false if unarchived
      message: `chat archived : ${!isarchived}`, // true if just archived, false if unarchived
    });
  } catch (error) {
    // ❌ Handle unexpected errors
    console.log(error);
    throw new Error(error.message || "Failed to archive");
  }
}

module.exports = {
  archive_chat,
};
