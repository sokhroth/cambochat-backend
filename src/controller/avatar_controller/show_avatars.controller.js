const { generalResponse } = require("../../helper/response.helper");
const updateFieldsFilter = require("../../helper/updateField.helper");
const {
  getAvatars,
} = require("../../service/repository/Avatar.service");

/**
 * 🎭 Get Avatars Controller
 * Fetches avatars with optional filters and pagination.
 */
async function showAvatars(req, res) {
  try {
    // 📝 Allowed fields for filtering avatars
    const allowedFields = ["avatar_id", "name", "avatar_gender", "status"];
    let filteredData;

    try {
      
      // 🔎 Validate and extract filter fields from request
      filteredData = updateFieldsFilter(req.body, allowedFields);
    } catch (err) {
      console.log("error" , err);
      
      // ❌ Invalid request body fields
      return generalResponse(res, { success: false }, err.message, false, true);
    }

    // ✅ Force status = true (only active avatars to be shown)
    // If role-based logic is needed, uncomment the check below
    // if (req.user_type !== "admin") {
    // filteredData.status = true;
    // }

    // 📦 Fetch avatars from DB based on filters
    const avatars = await getAvatars(filteredData);

    // ✅ Respond with found avatars
    return generalResponse(res, avatars, "Avatars Found", true, false);
  } catch (error) {
    // ❌ Handle unexpected server errors
    console.error("Error in finding avatars", error);
    return generalResponse(
      res,
      { success: false },
      "Something went wrong while finding avatars!",
      false,
      true
    );
  }
}

// 📦 Export controller
module.exports = {
  showAvatars,
};
