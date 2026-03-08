const {
  updateUser,
  getUser,
} = require("../../service/repository/user.service");
const { generalResponse } = require("../../helper/response.helper");
const updateFieldsFilter = require("../../helper/updateField.helper");
const {
  fieldExistsErrorResponse,
} = require("../../helper/field.already.exists.err");

const {Op} = require('sequelize');
const { DEMO_USER_ID } = require("../../helper/demo_data.helper");

async function updateProfile(req, res) {
  try {
    const pictureType = req.body.pictureType; // Type of picture being uploaded (id_proof, selfie, profile_pic, avatar)
    const user_id = req.authData.user_id; // Extract user_id from auth data
    const existingUser = await getUser({ user_id: user_id }); // Fetch existing user data

    // Allowed fields that can be updated in the profile
    allowedUpdateFields = [
      "email",
      "password",
      "full_name",
      "first_name",
      "last_name",
      "user_name",
      "country",
      "country_code",
      "mobile_num",
      "login_type",
      "device_token",
      "password",
      "gender",
      // "dob",
      "state",
      "city",
      "bio",
      "profile_verification_status",
      "is_private",
    ];

    let filteredData;
    try {
      // Filter only allowed fields from request body
      filteredData = updateFieldsFilter(req.body, allowedUpdateFields, false);

      // If first_name or last_name updated, recompute full_name
      if (filteredData.first_name || filteredData.last_name) {
        const firstName = filteredData.first_name ?? existingUser.first_name;
        const lastName = filteredData.last_name ?? existingUser.last_name;
        filteredData.full_name = `${firstName} ${lastName}`.trim();
      }
    } catch (err) {
      // Return failure if invalid fields are provided
      return generalResponse(res, { success: false }, err.message, false, true);
    }

    // Add user_id to filtered data
    filteredData.user_id = user_id;

    // Handle uploaded picture type if provided
    if (pictureType != undefined && pictureType != "") {
      if (pictureType == "id_proof") {
        filteredData.id_proof = req.files[0].path; // Save ID proof path
      }
      if (pictureType == "selfie") {
        filteredData.selfie = req.files[0].path; // Save selfie path
      }
      if (pictureType == "profile_pic") {
        filteredData.profile_pic = req.files[0].path; // Save profile picture path
      }
      if (pictureType === "avatar") {
        // If avatar, clean up URL and save as profile picture
        const baseUrl = process.env.baseUrl.trim().replace(/\/?$/, "/");
        filteredData.profile_pic = req.body.avatarUrl.replace(baseUrl, "");
      }
    }

    // Check if user exists
    let isUser = await getUser({ user_id });

    // Validate username if provided
    if (filteredData.user_name) {
      const usernameRegex = /^[a-z_][a-z0-9_]*$/;

      // Username must follow defined format
      if (!usernameRegex.test(filteredData.user_name)) {
        return generalResponse(
          res,
          {},
          "Invalid username. It must start with a lowercase letter or underscore, contain only lowercase letters, numbers, or underscores, and have no spaces or capital letters.",
          false,
          true
        );
      }
    }

    if (isUser) {
      // Check for duplicate username
      if (filteredData.user_name) {
        const user = await getUser(
          {
            user_name: filteredData.user_name,
            user_id: { [Op.not]: user_id },
          },
          [],
          [],
          (basic = true)
        );

        // If username already taken, return error
        if (user) {
          return generalResponse(res, {}, "User_name already exists.");
        }
      }

      // Attempt to update user with new filtered data
      const isDemoUser = process.env.IS_CLIENT != "true" && DEMO_USER_ID.includes(user_id);
   
      if (!isDemoUser) {
         await updateUser(filteredData, {
          user_id: isUser.user_id,
        });      
      }
     
      isUser = await getUser({ user_id });

      return generalResponse(
        res,
        isUser,
        "User updated successfully ",
        true,
        false
      );

      if (isUpdated.length > 0) {
        // Return success response if update successful
      } else {
        // Return failure if update did not apply
        return generalResponse(res, {}, "User Not Updated ", false, false);
      }
    } else {
      // If user does not exist in DB
      return generalResponse(
        res,
        { success: false },
        "User Not Updated ",
        false,
        false,
        404
      );
    }
  } catch (err) {
    console.log(err);

    // Handle Sequelize unique constraint errors (e.g., duplicate email/username)
    if (err.name === "SequelizeUniqueConstraintError") {
      return fieldExistsErrorResponse(
        res,
        err.errors[0].path,
        err.errors[0].value
      );
    }

    // Return general error response for any other errors
    return generalResponse(res, { success: false }, err.message, false, true);
  }
}


module.exports = {
  updateProfile,
};
