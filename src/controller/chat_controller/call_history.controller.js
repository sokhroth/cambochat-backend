// Import required services, models, and helpers
const participant_service = require("../../service/repository/Participant.service");
const message_service = require("../../service/repository/Message.service");
const { Chat, Call } = require("../../../models");
const { generalResponse } = require("../../helper/response.helper");
const { User } = require("../../../models");
const { Op } = require("sequelize");

/**
 * Fetches the call history for the authenticated user.
 * Call history is derived from messages of type "call"
 * in chats the user is a participant of.
 */
async function call_history(req, res) {
  try {
    const user_id = req.authData.user_id; // current logged-in user

    // ✅ Step 1: Handle pagination parameters (default page=1, pageSize=10)
    const page = parseInt(req.body.page) || 1;
    const pageSize = parseInt(req.body.pageSize) || 10;

    // ✅ Step 2: Get all chats where the user is a participant
    const participants =
      await participant_service.getParticipantWithoutPagenation({ user_id });
    const chatIds = participants.Records.map((p) => p.chat_id);

    // If no chats → no call history
    if (!chatIds.length) {
      return generalResponse(res, {
        Records: [],
        Pagination: {
          total_pages: Number(page),
          total_records: Number(pageSize),
          current_page: Number(page),
          records_per_page: Number(pageSize),
        },
      }, "No call history found.", true, 200);
    }

    // ✅ Step 3: Prepare message query payload
    const messagePayload = {
      chat_id: {
        [Op.in]: chatIds, // only chats user is part of
      },
      message_type: "call", // only messages representing calls
    };

    const pagination = { page, pageSize };

    // ✅ Step 4: Fetch call messages with related models
    const result = await message_service.getMessages(
      messagePayload,
      [
        {
          model: Call, // join with Call model
          attributes: ["call_id", "call_type", "call_duration", "call_status"],
          include: [
            {
              model: User, // join caller details
              attributes: ["user_id", "user_name", "profile_pic"],
              as: "caller",
            },
          ],
        },
        {
          model: Chat, // join chat details
          attributes: ["chat_id", "chat_type", "group_name", "group_icon"],
        },
      ],
      pagination,
      [] // no sorting/extra conditions here
    );


    // ✅ Step 5: Return success response with call history
    return generalResponse(
      res,
      result,
      "Call history fetched successfully!",
      true,
      200
    );
  } catch (error) {
    // ❌ Handle unexpected errors
    console.error("Error in fetching call history:", error);
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
  call_history,
};
