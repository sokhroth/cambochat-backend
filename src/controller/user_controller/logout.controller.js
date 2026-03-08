const { generalResponse } = require("../../helper/response.helper");
const { disconnectSocketById } = require("../../service/common/socket.service");
const { updateUser } = require("../../service/repository/user.service");

async function logout(req, res) {
  try {
    // Extract user_id from authenticated user data
    const user_id = req.authData.user_id;

    // Update user record by clearing device_token (used for push notifications)
    const updated_user = await updateUser({ device_token: null }, { user_id });

    // Disconnect the user's socket connection if socket_id is provided
    disconnectSocketById(req.body.socket_id);

    // Return success response after successful logout
    return generalResponse(
      res, // response
      { success: true }, // data
      "Logout successfully", // message
      true, // responseType
      true, // toast
      200 // statusCode
    );
  } catch (err) {
    // Log error in console
    console.log(err);

    // Return error response if logout fails
    return generalResponse(
      res, // response
      {}, // data
      err.message, // message
      false, // responseType
      true, // toast
      500 // statusCode
    );
  }
}


module.exports = {
  logout
};  
