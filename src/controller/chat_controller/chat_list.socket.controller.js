const chat_service = require("../../service/repository/Chat.service");
const filterData = require("../../helper/filter.helper");
const participant_service = require("../../service/repository/Participant.service");
const message_seen_service = require("../../service/repository/Message_seen.service");
const { getUser } = require("../../service/repository/user.service");
const { User, Message, Call, Story } = require("../../../models");
const { Op, Sequelize } = require("sequelize"); // Ensure you're importing Op

async function chat_list(socket, data, emitEvent, archived_chat = false) {
  try {
    // 1️⃣ Validate the logged-in user
    const isUser = await getUser({ user_id: socket.authData.user_id });
    if (!isUser) {
      return next(new Error("User not found."));
    }
    attributes = [
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
      "socket_ids"
    ];
    let user_data = { ...isUser.toJSON() };
    const keysToRemove = [
      "password",
      "otp",
      "id_proof",
      "selfie",
      "device_token",
    ];
    keysToRemove.forEach((key) => {
      user_data = filterData(user_data, key, "key");
    });

    const userId = Number(user_data.user_id); // Ensure user_id is numeric

    // 3️⃣ Define what message data to include in each chat
    const includeOptions = [
      {
        model: Message,
        where: {
          [Op.and]: [
            // Exclude deleted messages for current user
            Sequelize.literal(
              `NOT ("Message"."deleted_for" @> ARRAY[${userId}::numeric])`
            ),
            { message_type: { [Op.ne]: "block" } } // Exclude "block" type
          ]
        },


        include: [
          {
            model: User, // Sender of the message
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
          {
            model: Story,
            required: false, // LEFT JOIN, keeps main row even if no matching Story
            include: [{
              model: User,
              as: "user",
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
            }],
            where: {
              is_expired: false
            }
          },
          {
            model: User, // Assuming User is associated with Message
            as: "ActionedUser",
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
          {
            model: Call, // If message is related to a call
            as: "Calls",
            include: [
              {
                model: User,
                as: "caller",
                attributes: [
                  "profile_pic",
                  "user_id",
                  "full_name",
                  "user_name",
                  "email",
                  "country_code",
                  "country",
                  "gender",
                ],
              },
            ],
          },
        ],
        order: [["createdAt", "DESC"]], // Only latest message per chat
        limit: 1,

      },
    ];

    // 4️⃣ Get all chats the user is a participant in
    const getChats_of_users =
      await participant_service.getParticipantWithoutPagenation({
        user_id: socket.authData.user_id,
      });

    if (getChats_of_users.Records.length > 0) {
      // 5️⃣ Check archived or non-archived chats
      const not_filtered_chatIds = await Promise.all(
        getChats_of_users.Records.map(async (chats) => {
          if (!archived_chat) {
            // 🔹 Fetch non-archived chats
            const not_archived = await chat_service.getChats(
              {
                chat_id: chats.chat_id,
                [Op.and]: [
                  Sequelize.literal(
                    `NOT ("archived_for" @> ARRAY[${Number(
                      isUser.user_id
                    )}]::numeric[])`
                  ),
                  Sequelize.literal(
                    `NOT ("deleted_for" @> ARRAY[${Number(
                      isUser.user_id
                    )}]::numeric[])`
                  ),
                ],
                updatedAt: {
                  [Op.gte]: new Date(data.updatedAt || '1970-01-01T00:00:00Z'),
                },
              },
              includeOptions,
              { page: 1, pageSize: 1 }
            );
            if (not_archived.Records.length > 0) {
              return chats.chat_id;
            }
            return null; // Explicitly return null if no condition matched

          } else {
            // 🔹 Fetch archived chats
            const is_archived = await chat_service.getChats(
              {
                chat_id: chats.chat_id,
                [Op.and]: [
                  Sequelize.literal(
                    `("archived_for" @> ARRAY[${Number(isUser.user_id)}]::numeric[])`
                  ),
                ],
                updatedAt: {
                  [Op.gte]: new Date(data.updatedAt || '1970-01-01T00:00:00Z'),
                },
              },
              includeOptions,
              { page: 1, pageSize: 1 }
            );
            if (is_archived.Records.length > 0) return chats.chat_id;
          }
          return null;
        })
      );

      // Remove null values → only keep valid chatIds
      const chatIds = not_filtered_chatIds.filter(Boolean);


      const includeOptionsUser = [
        {
          model: User,
          as: "User",
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
            "updatedAt",
            "createdAt",
            "mobile_num",
          ],
        },
      ];

      // 🔹 Pagination setup
      let response = [];
      let total_records = chatIds.length;
      let currentPage = data?.page || 1;
      let pageSize = data?.pageSize || 10;
      let total_pages = Math.ceil(total_records / pageSize);
      let count = 0;

      const startIndex = (currentPage - 1) * pageSize;
      const endIndex = startIndex + pageSize;

      // 7️⃣ Loop through each chat ID (with pagination applied)
      for (let i = startIndex; i < chatIds.length && count < pageSize; i++) {
        if (i == endIndex) {
          break;
        }
        const chatId = chatIds[i]; // Get the chat ID for the current iteration

        const unseenCount = await message_seen_service.getMessageSeenCount(
          {
            andConditions: {
              chat_id: chatId,
              user_id: isUser.user_id
            },
            orConditions: {
              message_seen_status: ["delivered", "sent"],

            },
          }
        )

        // Get peer user (exclude current user)
        const users = await participant_service.getParticipantWithoutPagenation(
          {
            chat_id: chatId,
            user_id: { [Op.ne]: isUser.user_id },
          },
          includeOptionsUser
        );


        if (users.Records.length > 0) {
          const PeerUserData = users.Records[0].User;

          // Fetch latest chat details
          const chats = await chat_service.getChats(
            { chat_id: chatId },
            includeOptions,
            { page: 1, pageSize: 1 }
          );

          if (chats.Records.length > 0) {
            chats.Records = chats.Records.map(record => ({
              ...record,
              unseen_count: unseenCount.count
            }));

            response.push({ Records: chats.Records, PeerUserData });
          } else {
            response.push({ Records: [], PeerUserData });
          }
        }

        count++;
      }

      // 8️⃣ Emit response based on archived flag
      if (archived_chat) {
        emitEvent([socket.id], "archived_chat_list", {
          pagination: {
            total_pages,
            total_records,
            current_page: currentPage,
            records_per_page: pageSize,
          },
          Chats: response,
        });
      }
      else {
        emitEvent([socket.id], "chat_list", {
          pagination: {
            total_pages,
            total_records,
            current_page: currentPage,
            records_per_page: pageSize,
          },
          Chats: response,
        });
      }

    } else {
      // No chats found for this user
      emitEvent([socket.id], "chat_list", { Chats: [], pagination: null });

    }
  } catch (error) {
    return emitEvent([socket.id], "chat_list", { Chats: [], pagination: null, message: error.message });

  }
}

module.exports = {
  chat_list,
};
