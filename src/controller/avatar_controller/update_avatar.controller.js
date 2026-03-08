const { generalResponse } = require("../../helper/response.helper");
const updateFieldsFilter = require("../../helper/updateField.helper");
const {
  getAvatars,
  updateAvatar,
} = require("../../service/repository/Avatar.service");

/**
 * 🎭 Update Avatar Controller
 * Updates avatar details such as name, gender, status, or media.
 */
async function updateAvatars(req, res) {
  try {
    // 📝 Allowed fields for update
    const allowedFields = ["name", "avatar_gender", "status"];
    let filteredData;

    try {
      // 🔎 Filter only allowed fields from request body
      filteredData = updateFieldsFilter(req.body, allowedFields);
    } catch (err) {
      // ❌ Invalid request body fields
      return generalResponse(res, { success: false }, err.message, false, true);
    }

    // ❌ Ensure avatar_id is provided (required for update)
    if (!req.body.avatar_id) {
      return generalResponse(
        res,
        { success: false },
        "avatar_id is required",
        false,
        true
      );
    }

    // 🖼️ If a new file (avatar media) is uploaded, save its path
    if (req.files.length > 0 && req.files[0].path) {
      filteredData.avatar_media = req.files[0].path;
    }

    // 🗑️ Remove avatar_id from update payload (to avoid overwriting primary key)
    const updateData = { ...filteredData };
    delete updateData.avatar_id;

    // ✏️ Update avatar in DB
    await updateAvatar({ avatar_id: req.body.avatar_id }, updateData);

    // 🔄 Fetch updated avatar details
    const newavatar = await getAvatars({ avatar_id: req.body.avatar_id });

    // ✅ Respond with updated avatar
    return generalResponse(res, newavatar, "Avatar Updated", true, false);
  } catch (error) {
    // ❌ Handle unexpected server errors
    console.error("Error in updating avatar", error);
    return generalResponse(
      res,
      { success: false },
      "Something went wrong while updating avatar!",
      false,
      true
    );
  }
}

// 📦 Export controller
module.exports = {
  updateAvatars,
};
