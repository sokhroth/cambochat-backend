const participant_service = require("../../service/repository/Participant.service");
const chat_service = require("../../service/repository/Chat.service");
const { generalResponse } = require("../../helper/response.helper");
const { DEMO_CHAT_ID } = require("../../helper/demo_data.helper");

async function updateChat(req, res) {
  try {
    const user_id = req.authData.user_id; // ✅ Extract logged-in user's ID
    const chat_id = req.body.chat_id;     // ✅ Extract chat ID from request body
    const data = req.body;                // ✅ Copy request body into 'data'

    // ✅ Ensure chat_id is provided
    if (!chat_id) {
      return generalResponse(res, {}, "chat_id is required");
    }
    const isDemoChat = process.env.IS_CLIENT != "true" && DEMO_CHAT_ID.includes(Number(chat_id));
    if(isDemoChat){
      return generalResponse(
        res,
        {},
        "This is demo chat you can not update it",
        false,
        true
      )
    }
    // ✅ If a new group icon is uploaded, update the group_icon field
    if (req.group_icon?.length > 0) {
      data.group_icon = req.group_icon[0].path;
    }

    // ✅ Check if the chat exists
    let chat = await chat_service.getChat({ chat_id });
    if (!chat) {
      return generalResponse(res, {}, "Chat not found.");
    }

    // ✅ Verify that the requesting user is a participant of the chat
    const isParticipant = await participant_service.isParticipant(
      user_id,
      chat_id
    );
    if (!isParticipant) {
      return generalResponse(
        res,
        {},
        "You are not a participant of this chat."
      );
    }

    // ✅ Update chat details in the database
    chat = await chat_service.updateChat(data, { chat_id });

    // ✅ Fetch updated chat details after modification
    chat = await chat_service.getChat({ chat_id });

    // ✅ Send success response with updated chat
    return generalResponse(res, chat, "Chat updated.", true);
  } catch (error) {
    console.error("Error in updateChat:", error);

    // ❌ Fix: your original catch block had a bug (incorrect response format)
    return generalResponse(
      res,
      { success: false },
      error.message,
      false,
      true,
      402
    );
  }
}

module.exports = {
  updateChat,
};
