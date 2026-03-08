const {
  createUser,
  getUser,
  updateUser,
} = require("../../service/repository/user.service");
const { generalResponse } = require("../../helper/response.helper");
const updateFieldsFilter = require("../../helper/updateField.helper");
const AuthService = require("../../service/common/auth.service");
const {
  sendEmailOTP,
  generateOTP,
  sendTwilioOTP,
  sendMesg91TP,
} = require("../../service/common/otp.service");
const { generateToken } = require("../../service/common/token.service");
const filterData = require("../../helper/filter.helper");
const process = require("process");
const config_service = require("../../service/common/config.service");

const getClientIp = (req) => {
  let ip =
    req.headers["x-forwarded-for"] || // Check if IP is passed by a proxy
    req.connection?.remoteAddress || // Get IP from connection
    req.socket?.remoteAddress || // Get IP from socket
    req.connection?.socket?.remoteAddress; // Fallback

  // Handle IPv6-mapped IPv4 addresses (e.g., ::ffff:192.168.0.27)
  if (ip && ip.includes("::ffff:")) {
    ip = ip.split("::ffff:")[1]; // Extract the IPv4 part
  }

  // Handle multiple IPs in x-forwarded-for header (first IP is client's IP)
  if (ip && ip.includes(",")) {
    ip = ip.split(",")[0].trim();
  }

  return ip;
};
/**
 * Handles user signup (email / phone / social).
 * - Validates allowed fields depending on login type
 * - Encrypts password if provided
 * - Generates OTP (dev = fixed, prod = random)
 * - Checks system config for allowed authentication methods
 * - Creates new user if not found, otherwise updates existing user
 * - Sends OTP (email, phone via Msg91/Twilio) or generates token (social login)
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response
 */
async function signupUser(req, res) {
  try {

    const type = req.body.login_type; // Login method: email, phone, or social
    let allowedUpdateFields = [];
    let filteredData;
    let isUser;

    // 🔒 Encrypt password if provided
    if (req?.body?.password) {
      let hashedPassword = req.body.password;
      hashedPassword = await AuthService.encryptPassword(hashedPassword);
      req.body.password = hashedPassword;
    }

    // 🔑 Generate OTP (static in dev, dynamic in prod)
    let otp;
    if (process.env.NODE_ENV == "development") {
      otp = 123456;
    } else {
      otp = await generateOTP();
    }

    // ⚙️ Fetch system config (to check allowed login types)
    const config = await config_service.getConfig();

    // ========================== EMAIL SIGNUP ==========================
    if (type == "email") {
      if (!config.email_authentication) {
        return generalResponse(
          res,
          {},
          "Not accepting authentication through email, try other ways.",
          false,
          true,
          400
        );
      }

      // Allowed fields for email signup
      allowedUpdateFields = ["email", "login_type", "platform"];
      try {
        filteredData = updateFieldsFilter(req.body, allowedUpdateFields, true);
      } catch (err) {
        console.log(err);
        return generalResponse(res, {}, err.message, false, true, 400);
      }

      // Check if user exists with this email
      isUser = await getUser({ email: filteredData.email });

      // ========================== PHONE SIGNUP ==========================
    } else if (type == "phone") {
      if (!config.phone_authentication) {
        return generalResponse(
          res,
          {},
          "Not accepting authentication through phone, try other ways.",
          false,
          true,
          400
        );
      }

      // Allowed fields for phone signup
      allowedUpdateFields = [
        "mobile_num",
        "country_code",
        "login_type",
        "country_short_name",
        "country",
        "platform",
      ];
      try {
        filteredData = updateFieldsFilter(req.body, allowedUpdateFields, true);
      } catch (err) {
        console.log(err);
        return generalResponse(res, {}, err.message, false, true, 400);
      }
      const ip = getClientIp(req);
      filteredData.ip_address = ip;
      // Check if user exists with this phone + country code
      isUser = await getUser({
        mobile_num: filteredData.mobile_num,
        country_code: filterData.country_code, // ⚠️ Possible typo? (should be filteredData)
      });

      // ========================== SOCIAL SIGNUP ==========================
    }
    // else if (type == "social") {
    //   req.body.login_verification_status = true;

    //   // Allowed fields for social signup
    //   allowedUpdateFields = [
    //     "email",
    //     "login_type",
    //     "device_token",
    //     "first_name",
    //     "last_name",
    //     "platform",
    //   ];
    //   try {
    //     filteredData = updateFieldsFilter(req.body, allowedUpdateFields, true);
    //   } catch (err) {
    //     console.log(err);
    //     return generalResponse(res, {}, err.message, false, true);
    //   }

    //   // Check if user exists with same details
    //   isUser = await getUser({ ...filteredData });

    // }
    //  else {
    //   // 🚫 Invalid login type
    //   return generalResponse(res, {}, "in valid login type", false, true, 422);
    // }

    // ==================================================================
    // ========== CASE: USER DOES NOT EXIST -> CREATE NEW USER ==========
    // ==================================================================
    if (isUser == null) {
      filteredData.otp = otp;

      // Save platform in array form
      const platforms = [filteredData.platform];
      const ip_addresses = [filteredData.ip_address];
      delete filteredData.platform;
      delete filteredData.ip_addresses;

      // Create user in DB
      const newUser = await createUser({
        ...filteredData,
        platforms: platforms,
        ip_address: ip_addresses
      });

      // Hide sensitive fields before sending back response
      const keysToRemove = [
        "password",
        "otp",
        "id_proof",
        "selfie",
        "device_token",
      ];
      const user = filterData(newUser, keysToRemove, (mode = "key"));

      // ========== EMAIL OTP SEND ==========
      if (type == "email") {
        const sendOtp = await sendEmailOTP(req.body.email, otp);
        if (sendOtp) {
          return generalResponse(
            res,
            { newUser: true },
            "Otp Sent Successfully",
            true,
            true
          );
        }
        return generalResponse(res, {}, "Failed to send on email ", false, true);
      }

      // ========== PHONE OTP SEND ==========
      if (type == "phone") {
        let sendOtp = false;

        if (newUser.dataValues.country_code == "+91" && process.env.IS_MSG91_ENABLED == "true") {
          sendOtp = await sendMesg91TP(
            newUser.dataValues.country_code,
            newUser.dataValues.mobile_num,
            otp
          );
        } else if (process.env.IS_TWILIO_ENABLED == "true") {

          sendOtp = await sendTwilioOTP(
            newUser.dataValues.country_code,
            newUser.dataValues.mobile_num,
            otp
          );
        }
        else {
          return generalResponse(
            res,
            {},
            "No OTP service is enabled",
            false,
            true
          );
        }

        if (sendOtp) {
          return generalResponse(
            res,
            { newUser: true },
            "Otp Sent Successfully ",
            true,
            true
          );
        } else {
          return generalResponse(
            res,
            { newUser: true },
            "Failed to sent ",
            false,
            true
          );
        }
      }

      // ========== SOCIAL LOGIN ==========
      if (type == "social") {
        const token = await generateToken({
          user_id: newUser.user_id,
          email: newUser.email,
          user_name: newUser.user_name,
          login_type: newUser.login_type,
        });
        return generalResponse(
          res,
          {
            token: token,
            user: newUser,
            newUser: true,
          },
          "User signed Up!!",
          true,
          true
        );
      }

      return generalResponse(res, user, "SignUp Successfully!", true, true);

      // ==================================================================
      // ========== CASE: USER EXISTS -> UPDATE / RESEND OTP ===============
      // ==================================================================
    } else {
      if (
        (!req.body.user_type && isUser.user_type != "regular")
        ||
        (req.body.user_type == "business" && isUser.user_type != "business")
      ) {
        return generalResponse(
          res,
          {},
          `You are ${isUser.user_type} user so you can not login with this app `,
          false,
          true,
          403
        )
      }
      // Update platforms list (avoid duplicates)
      const updatedPlatforms = Array.from(
        new Set(
          [...isUser.platforms, filteredData.platform].filter((p) => p != null)
        )
      );
      const updatedIpAddresses = Array.from(
        new Set(
          [...isUser.ip_address, filteredData.ip_address].filter((p) => p != null)
        )
      );
      updateUser({ platforms: updatedPlatforms }, { user_id: isUser.user_id });
      updateUser({ ip_address: updatedIpAddresses }, { user_id: isUser.user_id });


      // 🚫 Blocked user
      if (isUser.bloked_by_admin) {
        return generalResponse(
          res,
          {},
          "User is blocked by admin",
          false,
          true
        );
      }

      // ========== SOCIAL LOGIN (EXISTING USER) ==========
      if (type == "social") {
        const token = await generateToken({
          user_id: isUser.user_id,
          email: isUser.email,
          user_name: isUser.user_name,
          login_type: isUser.login_type,
        });
        return generalResponse(
          res,
          {
            token: token,
            user: isUser,
            newUser: false,
          },
          "User Already Exist! ",
          false,
          true
        );
      }

      // ========== EMAIL LOGIN (EXISTING USER) ==========
      if (type == "email") {
        const sendOtp = await sendEmailOTP(req.body.email, otp);
        updated = await updateUser(
          { otp: otp },
          { user_id: isUser.user_id }
        );
        let newUser = !isUser.login_verification_status ? true : false;

        if (sendOtp && updated) {
          return generalResponse(
            res,
            { newUser: newUser },
            "Otp Sent Successfully",
            true,
            true
          );
        }
        return generalResponse(res, {}, "Failed to send on email ", false, true);
      }

      // ========== PHONE LOGIN (EXISTING USER) ==========
      if (type == "phone") {
        let sendOtp = false;
        let updated = false;
        let newUser = !isUser.login_verification_status ? true : false;

        if (isUser.country_code == "+91" && process.env.IS_MSG91_ENABLED == "true") {
          sendOtp = await sendMesg91TP(
            isUser.country_code,
            isUser.mobile_num,
            otp
          );

          updated = await updateUser({ otp: otp }, { user_id: isUser.user_id });
        } else if (process.env.IS_TWILIO_ENABLED == "true") {

          sendOtp = await sendTwilioOTP(
            isUser.country_code,
            isUser.mobile_num,
            otp
          );
          updated = await updateUser({ otp: otp }, { user_id: isUser.user_id });
        }
        else {

          return generalResponse(
            res,
            {},
            "No OTP service is enabled",
            false,
            true
          );
        }

        if (sendOtp && updated) {
          return generalResponse(
            res,
            { newUser: newUser },
            "Otp Sent Successfully ",
            true,
            true
          );
        } else {
          return generalResponse(
            res,
            { newUser: newUser },
            "Failed to sent ",
            false,
            true
          );
        }
      }

      return generalResponse(res, "User Already Exist!", false, false);
    }

  } catch (error) {
    console.error("Error in SignUp", error);
    return generalResponse(res, {}, error.message, false, true);
  }
}


module.exports = {
  signupUser
};