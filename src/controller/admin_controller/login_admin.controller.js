const { generalResponse } = require("../../helper/response.helper");
const updateFieldsFilter = require("../../helper/updateField.helper");
const AuthService = require("../../service/common/auth.service");
const { getAdmin } = require("../../service/repository/Admin.service");
const { generateToken } = require("../../service/common/token.service");

/**
 * 🔑 Admin login handler
 * Validates credentials, generates JWT token, and returns admin details
 */
async function login_admin(req, res) {
  try {
    let allowedUpdateFields = [];
    let filteredData;

    // 📋 Fields required for admin login
    allowedUpdateFields = ["email", "password"];

    try {
      // ✅ Validate and extract login fields from request
      filteredData = updateFieldsFilter(req.body, allowedUpdateFields, true);
    } catch (err) {
      console.log(err);

      // ❌ Invalid request body fields
      return generalResponse(res, {}, err.message, false, true);
    }

    // 🔎 Verify admin credentials in database
    let isAdmin = await getAdmin({
      email: filteredData.email,
      password: filteredData.password,
    });

    // ❌ Invalid email or password
    if (isAdmin == null) {
      return generalResponse(res, {}, "Invalid Credentials", false, false);
    } else {
      // ✅ Generate JWT token for valid admin
      const token = await generateToken({
        admin_id: isAdmin.admin_id,
        user_type: "admin",
      });

      // ✅ Send response with admin details + token
      return generalResponse(
        res,
        {
          admin_id: isAdmin?.admin_id,
          email: isAdmin?.email,
          full_name: isAdmin?.full_name,
          first_name: isAdmin?.first_name,
          last_name: isAdmin?.last_name,
          profile_pic: isAdmin?.profile_pic,
          country: isAdmin?.country,
          country_short_name: isAdmin?.country_short_name,
          token,
        },
        "Admin Logged in Successfully",
        true,
        true
      );
    }
  } catch (error) {
    // ❌ Handle unexpected errors
    console.error("Error in Admin Login", error);
    return generalResponse(
      res,
      {},
      "Something went wrong while Signin!",
      false,
      true
    );
  }
}

// 📦 Export login controller
module.exports = {
  login_admin,
};
