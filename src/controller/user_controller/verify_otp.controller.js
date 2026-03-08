const {
  updateUser,
} = require("../../service/repository/user.service");
const { generalResponse } = require("../../helper/response.helper");
const updateFieldsFilter = require("../../helper/updateField.helper");
const {
    verifyOtp,
} = require("../../service/common/otp.service");
const { generateToken } = require("../../service/common/token.service");

async function OtpVerification(req, res) {
  try {
    
    // Extract login type (email/phone) and OTP from request body
    const type = req.body.login_type;
    const otp = req.body.otp;

    // If OTP is 0, immediately return failure response
    if (otp == 0 || otp == "0") {
      return generalResponse(
        res, // response
        { success: false }, // data
        "Otp not Verified", // message
        false, // responseType
        true, // toast
        400 // statusCode
      );
    }

    let allowedUpdateFields = [];
    let filteredData;

    // Define allowed fields for validation based on login type
    if (type == "email") {
      allowedUpdateFields = ["email", "otp"];
    } else if (type == "phone") {
      allowedUpdateFields = ["mobile_num", "otp"];
    }

    try {
      // Filter request body to only allow required fields
      filteredData = updateFieldsFilter(req.body, allowedUpdateFields, true);
    } catch (err) {
      console.log(err);

      // If required data is missing, return error response
      return generalResponse(
        res, // response
        { success: false }, // data
        err.message, // message
        false, // responseType
        true // toast
        // statusCode is optional, defaults to 400
      );
    }

    // Verify the OTP against stored values
    const isVerified = await verifyOtp(filteredData);

    if (isVerified) {
      // Generate authentication token after successful OTP verification
      const token = await generateToken({ user_id: isVerified.user_id });

      // If device_token is provided, update user's record
      if (req.body.device_token) {
        await updateUser(
          { device_token: req.body.device_token },
          { user_id: isVerified.user_id }
        );
      }

      // Return success response with token and user details
      return generalResponse(
        res, // response
        {
          token, // JWT token for session
          user: isVerified, // verified user details
        },
        "Otp Verified Successfully", // message
        true, // responseType
        false // toast
        // statusCode defaults to 200
      );
    } else {
      // If OTP verification fails, return failure response
      return generalResponse(
        res, // response
        { success: false }, // data
        "Otp not Verified", // message
        false, // responseType
        true, // toast
        400 // statusCode
      );
    }
  } catch (err) {
    console.log(err);

    // Handle unexpected errors
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
    OtpVerification
};