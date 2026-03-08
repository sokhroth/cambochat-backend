const { generalResponse } = require("../../helper/response.helper");
const updateFieldsFilter = require("../../helper/updateField.helper");
const { deleteAvatar } = require("../../service/repository/Avatar.service");

/**
 * 🗑️ Delete Avatar Controller
 * Handles deletion of an avatar by its ID.
 */
async function deleteAvatars(req, res) {
  try {
    // ✅ Allowed fields for avatar deletion
    const allowedFields = ["avatar_id"];
    let filteredData;

    try {
      // 🔎 Validate and extract avatar_id from request body
      filteredData = updateFieldsFilter(req.body, allowedFields, true);
    } catch (err) {
      // ❌ Missing or invalid data
      return generalResponse(
        res,
        { success: false },
        "Data is Missing",
        false,
        true
      );
    }

    // ❌ avatar_id is mandatory
    if (!filteredData.avatar_id) {
      return generalResponse(
        res,
        { success: false },
        "avatar_id is required",
        false,
        true
      );
    }

    // 🗑️ Call service to delete avatar by ID
    const deleted = await deleteAvatar({ avatar_id: filteredData.avatar_id });

    // ✅ Respond with success
    return generalResponse(res, deleted, "Avatar Deleted", true, false);
  } catch (error) {
    // ❌ Handle unexpected server errors
    console.error("Error in deleting avatar", error);
    return generalResponse(
      res,
      { success: false },
      "Something went wrong while deleting avatar!",
      false,
      true
    );
  }
}

// 📦 Export controller
module.exports = {
  deleteAvatars,
};
