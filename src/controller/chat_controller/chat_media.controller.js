const media_service = require("../../service/repository/Media.service");
const { Participant } = require("../../../models");
const updateFieldsFilter = require("../../helper/updateField.helper");
const { generalResponse } = require("../../helper/response.helper");
const { Op ,Sequelize} = require("sequelize");

async function chatMedia(req, res) {
  try {
    // Extract logged-in user's ID from auth data
    const user_id = req.authData.user_id;

    let filteredData;
    try {
      // Validate and filter incoming request body
      // Required fields: chat_id, message_type
      filteredData = await updateFieldsFilter(
        req.body,
        ["chat_id", "message_type"],
        true
      );
    } catch (err) {
      // If required fields are missing or invalid, send error response
      return generalResponse(res, {}, err.message, true, false, 402);
    }

    // Check if the requesting user is a participant of the chat
    const user = await Participant.findOne({
      where: {
        user_id: user_id,
        chat_id: filteredData.chat_id,
      },
    });

    if (!user) {
      // If user is not part of the group/chat, deny access
      return generalResponse(
        res,
        {},
        "You're not a member of this group.",
        true,
        false,
        402
      );
    }

    // If message_type is "media", expand it to include image, video, gif
    if (filteredData.message_type == "media") {
      filteredData.message_type = {
        [Op.in]: ["image", "video", "gif"], // Query should accept multiple types
      };
    }

    // Ensure only media not deleted for everyone is fetched
    filteredData.deleted_for_everyone = false;
    filteredData.deleted_for = Sequelize.literal(
      `NOT ("Message"."deleted_for" @> ARRAY[${user_id}::numeric])`
    );

    // Fetch media records using pagination
    const media = await media_service.getMedia(
      filteredData,
      req.body.page,
      req.body.pageSize
    );

    // Return success response with fetched media
    return generalResponse(
      res,
      media,
      "Media fetched successfully!!",
      true,
      200
    );
  } catch (error) {
    // Log and return error response in case of unexpected failure
    console.error("Error in fetching media:", error);
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
  chatMedia,
};