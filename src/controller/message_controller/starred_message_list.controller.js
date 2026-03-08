// Import required services, models, and helpers
const message_service = require("../../service/repository/Message.service");
const { Chat, Sequelize } = require("../../../models");
const { getUser } = require("../../service/repository/user.service");
const { generalResponse } = require("../../helper/response.helper");
const { User } = require("../../../models");
const { Op } = require("sequelize");
const { getParticipant } = require("../../service/repository/Participant.service");

async function starredMessageList(req, res) {
  try {
    const isUser = await getUser({ user_id: req.authData.user_id });
    const chat_id = req.body.chat_id;
    let starred_messages;

    const baseWhere = {
      [Op.and]: [
        Sequelize.literal(
          `NOT ("Message"."deleted_for" @> ARRAY['${isUser.user_id}']::decimal[])`
        ),
        Sequelize.literal(
          `"Message"."starred_for" @> ARRAY['${isUser.user_id}']::decimal[]`
        ),
      ],
    };

    if (chat_id) {
      // Case 1: starred messages for a specific chat
      starred_messages = await message_service.getMessages(baseWhere, [
        {
          model: User,
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
          model: Chat,
          attributes: [
            "chat_id",
            "chat_type",
            "group_name",
            "group_icon",
            "blocked_by",
          ],
          where: { chat_id },
        },
      ]);
    } else {
      // Case 2: starred messages across all chats
      starred_messages = await message_service.getMessages(baseWhere, [
        {
          model: User,
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
          model: Chat,
          attributes: ["chat_id", "chat_type", "group_name", "group_icon"],
        },
      ]);
    }

    // ✅ Process peer users correctly
    await Promise.all(
      starred_messages.Records.map(async (element) => {
        if (element.Chat.chat_type === "private") {
          const peer_user = await getParticipant(
            {
              chat_id: element.Chat.chat_id,
              user_id: { [Op.ne]: req.authData.user_id },
            },
            [
              {
                model: User,
                attributes: [
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
                  "socket_ids",
                ],
              },
            ]
          );
          element.peer_user = peer_user.Records[0].User;
        } else {
          element.peer_user = isUser;
        }
      })
    );

    return generalResponse(
      res,
      starred_messages ?? [],
      "Starred messages fetched successfully!!",
      true,
      200
    );
  } catch (error) {
    console.error("Error in starredMessageList:", error);
    return generalResponse(res, {}, error.message, false, true, 402);
  }
}


// Export the controller function
module.exports = {
  starredMessageList,
};
