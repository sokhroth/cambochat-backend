const { generalResponse } = require("../../helper/response.helper");
const updateFieldsFilter = require("../../helper/updateField.helper");
const { createAvatar } = require("../../service/repository/Avatar.service");

/**
 * 🎭 Upload Avatar Controller
 * Handles creating a new avatar with name, gender, and avatar media (file upload).
 */
async function uploadAvatar(req, res) {
  try {
    // 📝 Allowed fields for avatar creation
    
    const allowedFields = ["name", "avatar_gender"];
    let filteredData;

    try {
      // 🔎 Filter only allowed fields from request body (enforces required fields if third param is true)
      filteredData = updateFieldsFilter(req.body, allowedFields, true);
    } catch (err) {
      console.error("Error  ind uploading avatar", err)
      // ❌ Missing required fields
      return generalResponse(
        res,
        { success: false },
        err,
        false,
        true
      );
    }

    // ❌ Ensure file is uploaded
    if (req.files?.length == 0) {
      return generalResponse(
        res,
        { success: false },
        "file is required",
        false,
        true
      );
    }

    // 🖼️ Add uploaded file path to avatar_media field
    if (req.files && req.files[0].path) {
      filteredData.avatar_media = req.files[0].path;
    }

    // 📥 Save avatar in DB
    const avatar = await createAvatar(filteredData);

    // ✅ Success response
    return generalResponse(
      res,
      avatar,
      "Avatar Created Successfully",
      true,
      false
    );
  } catch (error) {
    // ❌ Handle unexpected server errors
    console.error("Error in uploading avatar", error);
    return generalResponse(
      res,
      { success: false },
      "Something went wrong while uploading avatar!",
      false,
      true
    );
  }
}

// 📦 Export controller
module.exports = {
  uploadAvatar,
};
