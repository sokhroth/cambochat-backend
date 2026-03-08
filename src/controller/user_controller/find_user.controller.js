const { getUsers } = require("../../service/repository/user.service");
const { generalResponse } = require("../../helper/response.helper");
const updateFieldsFilter = require("../../helper/updateField.helper");
const { getblock } = require("../../service/repository/Block.service");

async function findUser(req, res) {
  try {
    // Initialize variables for allowed fields and pagination
    let allowedUpdateFields = [];
    let filteredData;
    let pagination;

    // Allowed fields for filtering users
    allowedUpdateFields = ["user_id", "user_name", "user_check"];
    // Allowed fields for pagination
    allowedUpdateFieldsPagination = ["page", "pageSize"];

    // Extract authenticated user's ID
    let user_id = req.authData.user_id;

    try {
      // Filter and validate request body for allowed user fields
      filteredData = updateFieldsFilter(req.body, allowedUpdateFields, false);

      // Filter and validate pagination fields
      pagination = updateFieldsFilter(
        req.body,
        allowedUpdateFieldsPagination,
        false
      );
    } catch (err) {
      // If filtering fails, log error and return missing data response
      console.log(err);
      return generalResponse(res, {}, "Data is Missing", false, true);
    }

    // Keep track of excluded user IDs (e.g., blocked users)
    let excludedUserIds = [];

    // If checking for username availability
    if (filteredData.user_check) {
      // Handle case where username is empty
      if (filteredData.user_name == "") {
        const usernameRegex = /^[a-z_][a-z0-9_]*$/;

        // Validate username format
        if (!usernameRegex.test(filteredData.user_name)) {
          return generalResponse(
            res,
            {},
            "Invalid username. It must start with a lowercase letter or underscore, contain only lowercase letters, numbers, or underscores, and have no spaces or capital letters.",
            false,
            true
          );
        }

        // If invalid username, mark unavailable
        return generalResponse(
          res,
          {
            Records: [],
            Pagination: {},
          },
          "UserName Unavailable",
          false,
          true
        );
      }

      // Fetch users based on filters to check availability
      const isUser = await getUsers(filteredData, pagination);

      // If no user found → Username is available
      if (isUser?.Records?.length <= 0) {
        return generalResponse(
          res,
          {
            Records: [],
            Pagination: {},
          },
          "UserName Available",
          true,
          true
        );
      } else {
        // If user exists → Username unavailable
        return generalResponse(
          res,
          {
            Records: [],
            Pagination: {},
          },
          "UserName Unavailable",
          false,
          true
        );
      }
    }

    // Create a set of unique blocked user IDs
    const uniqueIds = new Set();

    // Fetch block list where current user blocked others
    const block1 = await getblock({ user_id: user_id });

    // Fetch block list where current user is blocked
    const block2 = await getblock({ blocked_id: user_id });

    // If block records found, add blocked IDs to exclusion list
    if (block1?.Records?.length > 0 || block1?.Records?.length > 0) {
      block1?.Records?.forEach((blocks) => {
        uniqueIds.add(blocks?.dataValues?.blocked_id);
      });
      block2?.Records?.forEach((blocks) => {
        uniqueIds.add(blocks?.dataValues?.user_id);
      });

      // Convert unique IDs set to array
      excludedUserIds = Array.from(uniqueIds);
    }

    // If requested user_id belongs to excluded list → return not found
    if (excludedUserIds.includes(req.body?.user_id)) {
      return generalResponse(
        res,
        {
          Records: [],
          pagination: {},
        },
        "User Not found",
        true,
        true
      );
    }

    // Select specific attributes to return for user
    const attributes = [
      "updatedAt",
      "profile_pic",
      "user_id",
      "full_name",
      "user_name",
      "email",
      "country_code",
      "country",
      "gender",
      "bio",
      "profile_verification_status",
      "login_verification_status",
      "first_name",
      "last_name",
      "mobile_num",
      "user_type"
    ];

    // Fetch users with given filters, pagination, and selected attributes
    const isUser = await getUsers(filteredData, pagination, attributes);

    // If no users found → return not found
    if (isUser?.Records?.length <= 0) {
      return generalResponse(
        res,
        {
          Records: [],
          Pagination: {},
        },
        "User Not found",
        true,
        true
      );
    }

    // Process records, invoking model getters
    const updatedRecords = await Promise.all(
      isUser.Records.map(async (record) => {
        return {
          ...record.get(), // Spread model data into plain object
          // is_follow (placeholder for additional field)
        };
      })
    );

    // Return success response with found users
    return generalResponse(
      res,
      {
        Records: updatedRecords,
        Pagination: isUser.Pagination,
      },
      "User Found",
      true,
      false
    );
  } catch (error) {
    // Catch unexpected errors and return failure response
    console.error("Error in Findng User", error);
    return generalResponse(
      res,
      {},
      "Something went wrong while Finding User!",
      false,
      true
    );
  }
}


module.exports = {
  findUser
};  