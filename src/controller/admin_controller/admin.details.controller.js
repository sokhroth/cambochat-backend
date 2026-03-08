const { generalResponse } = require("../../helper/response.helper");
const updateFieldsFilter = require("../../helper/updateField.helper");
const {
  updateAdmin,
  getAdmin,
} = require("../../service/repository/Admin.service");

/**
 * ✏️ Update admin profile details
 */
async function update_admin(req, res) {
  try {
    // ✅ Extract admin ID from auth data
    let admin_id = req.authData.admin_id;

    // ❌ Deny access if requester is not an admin
    if (!admin_id) {
      return generalResponse(res, {}, "Only admins can access.", true, true);
    }

    let allowedUpdateFields = [];
    let filteredData;

    // 📋 Define which fields can be updated
    allowedUpdateFields = [
      "full_name",
      "user_name",
      "first_name",
      "email",
      "last_name",
      "current_password",
      "password",
      "profile_pic",
      "country",
      "country_short_name",
      "country_code",
      "state",
      "city",
      "bio",
      "mobile_num",
    ];

    try {
      // ✅ Filter and validate request body fields against allowed fields
      filteredData = updateFieldsFilter(req.body, allowedUpdateFields, false);
    } catch (err) {
      return generalResponse(res, {}, err.message, false, true);
    }
    // 🔄 Auto-generate full_name if first_name + last_name provided
    if (filteredData.first_name && filteredData.last_name) {
      filteredData.full_name = `${filteredData.first_name} ${filteredData.last_name}`;
    }

    // 📷 If profile picture is uploaded, update the path
    if (req?.files?.length > 0) {
      filteredData.profile_pic = req.files[0].path;
    }
    if (filteredData.current_password){
      const admin = await getAdmin({admin_id})
      if (admin.password!= filteredData.current_password){
        return generalResponse(
          res,
          {},
          "Wrong password!",
          false,
          true
        );
      }
    }
    // ✅ Update admin record in DB
    if (process.env.IS_CLIENT =="true"){

      await updateAdmin({ filteredData }, { admin_id: req.adminData.admin_id });
    }

    // 🔎 Fetch updated admin details
    let updatedAdmin = await getAdmin({ admin_id: req.adminData.admin_id });

    // ✅ Return response with updated admin info
    return generalResponse(
      res,
      {
        admin_id: updatedAdmin?.admin_id,
        email: updatedAdmin?.email,
        full_name: updatedAdmin?.full_name,
        first_name: updatedAdmin?.first_name,
        last_name: updatedAdmin?.last_name,
        profile_pic: updatedAdmin?.profile_pic,
        country: updatedAdmin?.country,
        country_short_name: updatedAdmin?.country_short_name,
      },
      "Admin Updated Successfully",
      true,
      true
    );
  } catch (error) {
    // ❌ Handle unexpected errors
    console.error("Error in Admin Update", error);
    return generalResponse(
      res,
      {},
      "Something went wrong while Updating Admin!",
      false,
      true
    );
  }
}

/**
 * 👤 Get admin profile details
 */
async function get_admin_details(req, res) {
  try {
    // ✅ Extract admin ID from auth data
    let admin_id = req.authData.admin_id;

    // ❌ Validate admin ID
    if (!admin_id) {
      return generalResponse(
        res,
        {},
        "Admin ID is required.",
        false,
        true,
        400
      );
    }

    // 🔎 Fetch admin details from DB
    let adminDetails = await getAdmin({ admin_id });

    // ❌ If no admin found
    if (!adminDetails) {
      return generalResponse(res, {}, "Admin not found.", false, true, 404);
    }

    // ✅ Return admin details
    return generalResponse(
      res,
      adminDetails.toJSON(),
      "Admin details fetched successfully.",
      true,
      false
    );
  } catch (error) {
    // ❌ Handle unexpected errors
    console.error("Error in fetching admin details", error);
    return generalResponse(
      res,
      {},
      "Something went wrong while fetching admin details.",
      false,
      true,
      500
    );
  }
}

// 📦 Export functions
module.exports = {
  update_admin,
  get_admin_details,
};
