const participant_service = require("../../service/repository/Participant.service");
const message_service = require("../../service/repository/Message.service");
const chat_service = require("../../service/repository/Chat.service");
const { getUser } = require("../../service/repository/user.service");
const { generalResponse } = require("../../helper/response.helper");
const { Sequelize } = require("sequelize"); // Ensure Sequelize is imported
const { DEMO_CHAT_ID } = require("../../helper/demo_data.helper");

async function clearChat(req, res) {
  try {
    // Extract required fields from request
    const chat_id = req.body.chat_id;
    const user_id = req.authData.user_id;
    const delete_chat = req.body.delete_chat || false;

    // Validate chat_id
    if (!chat_id) {
      return generalResponse(res, {}, "chat_id is required");
    }

    const isDemoChat = process.env.IS_CLIENT != "true" && DEMO_CHAT_ID.includes(Number(chat_id)) && DEMO_CHAT_ID.includes(Number(chat_id));
    if (isDemoChat) {
      return generalResponse(
        res,
        {},
        "This is demo chat you can not make changes in it",
        false,
        true
      )
    }
    // Validate user existence
    const isUser = await getUser({ user_id: user_id });
    if (!isUser) {
      return generalResponse(res, {}, "User not found.", true, false, 402);
    }

    // Check if user is a participant of the chat
    const participant = await participant_service.getParticipant({
      user_id: user_id,
      chat_id: chat_id,
    });

    if (!participant) {
      return generalResponse(
        res,
        {},
        "You're not a member of this group.",
        true,
        false,
        402
      );
    }

    // Step 1: Mark all messages as deleted for this user (soft delete)
    await message_service.updateMessage(
      { chat_id: chat_id },
      {
        // Append user_id to "deleted_for" array in DB
        deleted_for: Sequelize.literal(
          `array_append("deleted_for", ${user_id})`
        ),
      }
    );

    // Step 2: Handle chat deletion or clearing depending on flag
    if (delete_chat) {
      // If delete_chat = true → add user_id to deleted_for array in chat
      await chat_service.updateChat(
        {
          deleted_for: Sequelize.literal(
            `array_append("deleted_for", ${user_id})`
          ),
        },
        { chat_id: chat_id }
      );
    } else {
      // Else → add user_id to cleared_for array in chat
      await chat_service.updateChat(
        {
          cleared_for: Sequelize.literal(
            `array_append("cleared_for", ${user_id})`
          ),
        },
        { chat_id: chat_id }
      );
    }

    // Return success response
    return generalResponse(res, {}, "Chat cleared successfully!!", true, 200);
  } catch (error) {
    // Log and return error response
    return generalResponse(res, {}, error.message, false, true, 402);
  }
}

module.exports = {
  clearChat,
};
