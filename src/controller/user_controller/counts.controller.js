const { getUsers } = require("../../service/repository/user.service");
const { generalResponse } = require("../../helper/response.helper");
const updateFieldsFilter = require("../../helper/updateField.helper");
const { getblock } = require("../../service/repository/Block.service");
const user_service = require("../../service/repository/user.service");
const { getMessages } = require("../../service/repository/Message.service");
const { Op } = require("sequelize");
const { Sequelize, User, Chat, Broadcast_push_notification } = require("../../../models");

async function counts(req, res) {
  try {
    const user_id = req.authData.user_id; // Extract user_id from the authenticated request

    // Fetch user details from DB using user_id
    const isUser = await user_service.getUser({
      user_id: req.authData.user_id,
    });
    let starred_messages;

    // Fetch messages that are starred by the user and not deleted for the user
    starred_messages = await getMessages(
      {
        [Op.and]: [
          Sequelize.literal(
            `NOT ("Message"."deleted_for" @> ARRAY['${isUser.user_id}']::decimal[])` // Exclude deleted messages
          ),
          Sequelize.literal(
            `"Message"."starred_for" @> ARRAY['${isUser.user_id}']::decimal[]` // Include only starred messages
          ),
        ],
      },
      [
        {
          model: User, // Include sender/receiver user details
          attributes: [
            "user_name",
            "email",
            "profile_pic",
            "user_id",
            "full_name",
            "country_code",
            "country",
            "gender",
            "bio",
            "profile_verification_status",
            "login_verification_status",
            "socket_ids",
          ],
        },
        {
          model: Chat, // Include chat details
          attributes: ["chat_id", "chat_type", "group_name", "group_icon"],
        },
      ]
    );

    // Total starred messages count
    const total_stared_messages =
      starred_messages.Pagination.total_records > 0
        ? starred_messages.Pagination.total_records
        : 0;

    // Extract pagination details from request body (defaults to 1)
    const { page = 1, pageSize = 1 } = req.body;

    // Prepare payload for fetching blocked users
    let blockPayload = { user_id };
    let includeOptions = [
      {
        model: User,
        as: "blocked", // Alias for blocked user details
        blockPayload,
      },
    ];

    // Fetch blocked users list with pagination
    const block_list = await getblock(
      blockPayload,
      includeOptions,
      (pagination = { page, pageSize })
    );
    const total_blocked_users =
      block_list.Pagination.total_records > 0
        ? block_list.Pagination.total_records
        : 0;

    // Count unread notifications for the user
    const unreadCount = await Broadcast_push_notification.count({
      where: Sequelize.where(
        Sequelize.literal(`NOT (users @> ARRAY[${user_id}]::integer[])`), // Check if user_id is not in users array
        true
      ),
    });

    // Return all counts in response
    return generalResponse(
      res,
      {
        total_stared_messages: total_stared_messages,
        total_blocked_users: total_blocked_users,
        unread_notification_count: unreadCount,
      },
      "counts fetched successfully!!",
      true,
      200
    );
  } catch (error) {
    // Handle errors gracefully
    return generalResponse(res, {}, error.message, false, true, 402);
  }
}

module.exports = {
  counts,
};
