const { generalResponse } = require("../../helper/response.helper");
const updateFieldsFilter = require("../../helper/updateField.helper");
const {
  getChats,
  getChat,
  updateChat,
} = require("../../service/repository/Chat.service");
const {
  updateUser,
  getUser,
} = require("../../service/repository/user.service");
const admin_cnt_service = require("../../service/repository/admin_counts.service");
const admin_service = require("../../service/repository/Admin.service");
const { Chat, User } = require("../../../models");
const path = require("path");
const fs = require("fs");
const getmac = require("getmac").default;
const os = require("os");
const axios = require("axios");

function getMacAddress() {

  try {
    const mac = getmac();
    return mac
  } catch (err) {
    console.error('Error fetching MAC address:', err);
    return null
  }

}

function getServerIP() {
  const networkInterfaces = os.networkInterfaces();

  for (const interfaceName in networkInterfaces) {
    for (const interface of networkInterfaces[interfaceName]) {
      // Check for IPv4 and non-internal addresses (to exclude localhost)
      if (interface.family === "IPv4" && !interface.internal) {
        return interface.address;
      }
    }
  }

  return "IP address not found";
}
/**
 * 🔒 Block or unblock a user by admin
 */
async function blockUser(req, res) {
  try {
    // ✅ Extract admin ID from auth data
    let admin_id = req.authData.admin_id;

    // ❌ Deny access if requester is not an admin
    if (!admin_id) {
      return generalResponse(res, {}, "Only admins can access.", true, true);
    }

    let filteredData;
    try {
      // ✅ Validate required "user_id" field
      filteredData = updateFieldsFilter(req.body, ["user_id"], true);
    } catch (err) {
      return generalResponse(res, {}, err.message, false, true);
    }

    // ✅ Check if user exists in DB
    const isUser = await getUser({ user_id: filteredData.user_id });
    if (!isUser) {
      return generalResponse(res, {}, "User not found", false, true, 404);
    }

    // 🔄 Toggle user's blocked status
    await updateUser(
      { blocked_by_admin: !isUser.blocked_by_admin },
      { user_id: filteredData.user_id }
    );

    // ✅ Respond with updated block status
    return generalResponse(
      res,
      {},
      `User blocked: ${!isUser.blocked_by_admin}`, // fixed typo (was "bloked_by_admin")
      true,
      false,
      200
    );
  } catch (error) {
    // ❌ Handle unexpected errors
    console.error("Error in blocking user", error);
    return generalResponse(res, {}, error.message, false, true, 500);
  }
}

/**
 * 🔒 Block or unblock a group chat by admin
 */
async function blockGroup(req, res) {
  try {
    // ✅ Extract admin ID
    let admin_id = req.authData.admin_id;

    // ❌ Deny access if not admin
    if (!admin_id) {
      return generalResponse(res, {}, "Only admins can access.", true, true);
    }

    let filteredData;
    try {
      // ✅ Validate required "chat_id" field
      filteredData = updateFieldsFilter(req.body, ["chat_id"], true);
    } catch (err) {
      return generalResponse(res, {}, err.message, false, true);
    }

    // ✅ Check if group chat exists
    const isGroup = await getChat({
      chat_id: filteredData.chat_id,
      chat_type: "group",
    });
    if (!isGroup) {
      return generalResponse(res, {}, "Chat not found", false, true, 404);
    }

    // 🔄 Toggle group's blocked status
    const chat = await updateChat(
      { is_group_blocked: !isGroup.is_group_blocked },
      { chat_id: filteredData.chat_id, chat_type: "group" }
    );

    // ✅ Respond with updated block status
    return generalResponse(
      res,
      chat,
      `Chat blocked: ${!isGroup.is_group_blocked}`,
      true,
      false,
      200
    );
  } catch (error) {
    console.error("Error in blocking chat", error);
    return generalResponse(res, {}, error.message, false, true, 500);
  }
}

/**
 * 👥 Fetch all users with pagination
 *    Optionally group users by country
 */
async function usersList(req, res) {
  try {
    let admin_id = req.authData.admin_id;

    // ❌ Deny access if not admin
    if (!admin_id) {
      return generalResponse(res, {}, "Only admins can access.", true, true);
    }

    let filteredData;
    try {
      // ✅ Validate optional "filter" field
      filteredData = updateFieldsFilter(req.body, ["filter"], false);
    } catch (err) {
      return generalResponse(res, {}, err.message, false, true);
    }

    // ✅ Fetch paginated users
    let users = await admin_cnt_service.usersList(
      req.body.page,
      req.body.pageSize,
      req.body.search
    );

    // 📌 If filter = "country", group users by country
    if (filteredData?.filter == "country") {
      const usersByCountry = {};
      users.users.forEach((user) => {
        const country = user.country || "Unknown";
        if (!usersByCountry[country]) {
          usersByCountry[country] = [];
        }
        usersByCountry[country].push(user);
      });
      users = usersByCountry;
    }

    // ❌ No users found
    if (!users) {
      return generalResponse(res, {}, "Users not found", false, true, 404);
    }

    // ✅ Send response
    return generalResponse(res, users, "Users found", true, false, 200);
  } catch (error) {
    console.error("Error in fetching all users", error);
    return generalResponse(res, {}, error.message, false, true, 500);
  }
}

/**
 * 💬 Fetch all group chats with pagination
 */
async function getGroupChats(req, res) {
  try {
    let admin_id = req.authData.admin_id;
    // ❌ Deny access if not admin
    if (!admin_id) {
      return generalResponse(res, {}, "Only admins can access.", true, true);
    }

    // ✅ Fetch paginated group chats
    let chats = await admin_cnt_service.getGroupChats(
      {
        page: Number(req.body.page || 1),
        pageSize: Number(req.body.pageSize || 10),
        sortBy: req.body.sortBy,
        sortOrder: req.body.sortOrder,
        search: req.body.search
      }
    );

    if (!chats) {
      return generalResponse(res, {}, "Chats not found", false, true, 404);
    }

    // ✅ Send response
    return generalResponse(res, chats, "Chats found", true, false, 200);
  } catch (error) {
    console.error("Error in fetching all chats", error);
    return generalResponse(res, {}, error.message, false, true, 500);
  }
}

/**
 * 🚫 Fetch list of blocked users/groups with optional filter
 */
async function getBlockList(req, res) {
  try {
    let admin_id = req.authData.admin_id;

    // ❌ Deny access if not admin
    if (!admin_id) {
      return generalResponse(res, {}, "Only admins can access.", true, true);
    }

    let filteredData;
    try {
      // ✅ Validate optional "filter" (values: user, group)
      filteredData = updateFieldsFilter(req.body, ["filter"], false);
    } catch (err) {
      return generalResponse(res, {}, err.message, false, true);
    }

    // ✅ Fetch block list from service
    const blockList = await admin_service.getBlockList(
      req.body.filter,
      req.body.page,
      req.body.pageSize
    );

    if (!blockList) {
      return generalResponse(res, {}, "Block list not found", false, true, 404);
    }

    // ✅ Send response
    return generalResponse(
      res,
      blockList,
      "Block list found",
      true,
      false,
      200
    );
  } catch (error) {
    console.error("Error in fetching block list", error);
    return generalResponse(res, {}, error.message, false, true, 500);
  }
}

async function newUserNotifications(req, res) {
  try {
    const { page = 1, limit = 10 } = req.body;
    const newUsers = await admin_service.newUserNotifications(page, limit);
    return generalResponse(
      res,
      newUsers,
      'Notifications fetched.',
      true,
      false,
      200
    )
  } catch (error) {
    console.error("Error in fetching notifications", error);
    return generalResponse(res, {}, error.message, false, true, 500);
  }
}

async function newNotifications(req, res) {
  try {
    const new_notifications_available = await admin_service.newNotifications();
    return generalResponse(
      res,
      { is_available: new_notifications_available },
      'Data fetched successfully.',
      true,
      false
    )
  } catch (error) {
    console.error("Error in fetching notifications", error);
    return generalResponse(res, {}, error.message, false, true, 500);
  }
}

async function getCallList(req, res) {
  try {
    const { call_type, page, limit } = req.body
    const calls = await admin_service.getCalls(
      {
        call_type,
      },
      [
        {
          model: Chat,
          as: 'Chat',
          attributes: [
            'chat_id',
            'chat_type',
            'group_name',
            'group_icon',
          ]
        },
        {
          model: User,
          as: 'caller',
          attributes: [
            'user_id',
            'user_name',
            'first_name',
            'last_name',
            'profile_pic',
          ]
        }
      ],
      page,
      limit)
    return generalResponse(
      res,
      calls,
      'Call list fetched successfully.',
      true,
      false,
      200
    )
  }
  catch (error) {
    console.error("Error in fetching notifications", error);
    return generalResponse(res, {}, error.message, false, true, 500);
  }
}
// async function deactivate(req, res) {
//   try {


//     token = await readToken()
//     // Prepare data to send to the third-party API
//     const requestData = {
//       server_ip: getServerIP(), // Example data
//       mac_address: getMacAddress(),
//       token: token,
//     };

//     // Make the third-party API request
//     const apiResponse = await axios.post(
//       "http://62.72.36.245:1142/de-activate",
//       requestData,
//       {
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer YOUR_API_TOKEN`, // Replace with actual token if required
//         },
//       }
//     );

//     if (apiResponse?.data?.success) {

//       return res.status(200).json({
//         message: apiResponse.data.message,
//         status: true,
//       });
//     }
//     // Handle the API response
//     return res.status(200).json({
//       message: apiResponse.data.message,
//       status: false,
//     });

//   }
//   catch (err) {
//     console.error(err);
//     res.status(501).json({ error: "Error in Deactivation" });
//   }
// }

// 📦 Export all functions
module.exports = {
  blockUser,
  blockGroup,
  usersList,
  getGroupChats,
  getBlockList,
  newUserNotifications,
  newNotifications,
  getCallList,
  // deactivate
};
