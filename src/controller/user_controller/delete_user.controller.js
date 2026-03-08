const {
  getUser,
  updateUser,
} = require("../../service/repository/user.service");
const { generalResponse } = require("../../helper/response.helper");
const config_service = require("../../service/common/config.service");
const { DEMO_USER_ID } = require("../../helper/demo_data.helper");

async function deleteUser(req, res) {
  try {
    // Extract user_id from the authenticated request data
    const user_id = req.authData.user_id;
    const isDemoUser = process.env.IS_CLIENT != "true" && DEMO_USER_ID.includes(user_id);

    if (isDemoUser) {
      return generalResponse(
        res, // response object
        { success: false }, // response data
        "User not deleted", // message
        false, // responseType (failure)
        true, // show toast
         // HTTP status code
      );    }    // Fetch user details from DB, only if user exists and is not already deleted
    const isUser = await getUser({ user_id, deleted_at: null });

    // If no user found, return error response
    if (!isUser) {
      return generalResponse(
        res, // response object
        { success: false }, // response data
        "User not found", // message
        false, // responseType (failure)
        true, // show toast
        400 // HTTP status code
      );
    }

    // Optionally delete profile picture from file system/cloud storage (currently commented out)
    // delete_files(isUser.dataValues.profile_pic ? isUser.dataValues.profile_pic : "")

    // Fetch global app config (e.g., app_name)
    const config = await config_service.getConfig({});

    // Soft delete user by updating sensitive fields to null and marking deleted_at timestamp
    const deleted = await updateUser(
      {
        deleted_at: new Date(), // mark deletion time
        user_name: null,
        email: null,
        mobile_num: null,
        profile_pic: null,
        first_name: config.app_name, // anonymize name
        last_name: "user",
        full_name: `${config.app_name} user`,
        device_token: null, // clear device token
      },
      { user_id } // condition: match current user_id
    );

    // If deletion successful, return success response
    if (deleted) {
      return generalResponse(
        res,
        { success: true }, // success flag
        "User deleted successfully", // success message
        true, // responseType (success)
        true, // show toast
        200 // HTTP status code
      );
    }

    // If deletion failed, return server error
    return generalResponse(res, {}, "Failed to delete user", false, true, 500);
  } catch (err) {
    // Catch unexpected errors and return failure response
    console.log(err);
    return generalResponse(res, {}, err.message, false, true, 500);
  }
}


module.exports = {
    deleteUser
};