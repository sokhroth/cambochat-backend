const media_service = require("../../service/repository/Media.service");
const participant_service = require("../../service/repository/Participant.service");
const updateFieldsFilter = require("../../helper/updateField.helper");
const { generalResponse } = require("../../helper/response.helper");
const { Op, Sequelize } = require("sequelize");

async function searchMessage(req, res) {
  try {
    const user_id = req.authData.user_id; // Extract logged-in user's ID
    let filteredData;

    // ✅ Validate and filter request body to allow only "search_text"
    try {
      filteredData = updateFieldsFilter(req.body, ["search_text"], true);
    } catch (err) {
      return generalResponse(res, {}, err.message, true, false, 402);
    }

    let chat_ids;

    // ✅ If chat_id is passed in body → search only within that chat
    if (req.body.chat_id) {
      chat_ids = [req.body.chat_id];
    }
    // ✅ Else → get all chat_ids where the user is a participant
    else {
      chat_ids = await participant_service.getParticipantWithoutPagenation({
        user_id: user_id,
      });
      // Extract chat IDs from participant records
      chat_ids = chat_ids.Records.flatMap((participant) => participant.chat_id);
    }

    // ✅ Query messages from media_service with search filters
    const messages = await media_service.getMedia(
      {
        chat_id: {
          [Op.in]: chat_ids, // Search only in user's chats
        },
        message_content: {
          [Op.iLike]: `%${filteredData.search_text}%`, // Case-insensitive search by message text
        },
        deleted_for_everyone: false, // Exclude globally deleted messages
        deleted_for: {
          // Exclude messages that are deleted for this user
          [Op.not]: Sequelize.literal(`array['${user_id}']::decimal[]`),
        },
        message_type: "text", // Only search in text messages
      },
      req.body.page, // Pagination: page number
      req.body.pageSize // Pagination: page size
    );

    // ✅ Return search results
    return generalResponse(
      res,
      messages,
      "Messages fetched successfully!!",
      true,
      200
    );
  } catch (error) {
    console.error("Error in searching messages:", error);

    // ✅ Return error response if something goes wrong
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
  searchMessage,
};
