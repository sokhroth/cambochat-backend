const { generalResponse } = require("../../helper/response.helper");
const { User } = require("../../../models");
const { getblock } = require("../../service/repository/Block.service");

/**
 * 🚫 Block List Controller
 * Retrieves the list of blocked users for the authenticated user.
 */
async function block_list(req, res) {
  try {
    // 🔑 Extract logged-in user_id from authData
    const user_id = req.authData.user_id;

    // 📄 Extract pagination values from request body (defaults: page=1, pageSize=10)
    const { page = 1, pageSize = 10 } = req.body;

    // ❌ Ensure user_id is available (authentication issue)
    if (!user_id) {
      return generalResponse(res, {}, "Data is Missing.", false, true, 400);
    }

    // 🔎 Query payload to filter blocks by current user
    let blockPayload = { user_id };

    // 📌 Include blocked users info using Sequelize associations
    let includeOptions = [
      {
        model: User,
        as: "blocked", // Alias must match the association in Sequelize model
        blockPayload,
      },
    ];

    // 📥 Fetch blocked list with pagination
    const block_list = await getblock(
      blockPayload,
      includeOptions,
      (pagination = { page, pageSize })
    );

    // 📌 If no blocked users found
    if (block_list.Pagination.total_records == 0) {
      return generalResponse(
        res,
        { Records: [] },
        "No Blocked Users found",
        true,
        true,
        200
      );
    }

    // ✅ Return blocked users
    return generalResponse(res, block_list, "List found", true, false, 200);
  } catch (error) {
    // ❌ Handle unexpected errors
    console.error("Error in get Block list", error);
    return generalResponse(
      res,
      { success: false },
      "Something went wrong while getting Block list",
      false,
      true,
      500
    );
  }
}

// 📦 Export controller
module.exports = {
  block_list,
};
