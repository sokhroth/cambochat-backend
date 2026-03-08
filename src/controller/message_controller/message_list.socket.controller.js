const participant_service = require("../../service/repository/Participant.service");
const message_service = require("../../service/repository/Message.service");
const message_seen_service = require("../../service/repository/Message_seen.service");
const { getUser } = require("../../service/repository/user.service");
const { User, Message, Call, Story } = require("../../../models");
const { Op, Sequelize } = require("sequelize"); // Ensure you're importing Op

// req: { chat_id: string, user_id: string, pinned: boolean, page, pageSize, message_type[media, document, link] }
async function message_list(socket, data, emitEvent) {
  try {
    // Fetch user details using user_id from socket authentication data
    const isUser = await getUser({ user_id: socket.authData.user_id });

    // If chat_id is not provided, try to get chat data using user_id
    if (!data.chat_id) {
      if (!data.user_id)
        return emitEvent([socket.id], "message_list", "Chat id or user id is required.");
      else {
        // Check if a chat exists between the users
        const isChat = await participant_service.alreadyParticipantIndividual(
          data.user_id,
          isUser.user_id
        );
        if (!isChat) {
          return emitEvent([socket.id], "message_list", { Records: [], pagenation: null });

        }
        data.chat_id = isChat
      }
    }

    // Check if user exists
    if (!isUser) {
      return next(new Error("User not found."));
    }

    // Attributes to include for user details
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
      "socket_ids",
    ];

    // Options for including user details in queries
    const includeOptions = [
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
        ],
      },
    ];

    // Options for including related models in chat queries
    const includeOptionsforChat = [
      {
        model: Message,
        as: "ParentMessage",
        include: [
          
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
            ],
          },
        ],
      },
      {
        model: Message,
        as: "Replies",
        // required: false, // LEFT JOIN, keeps main row even if no matching ParentMessage
        // where: {
        //   message_type: { [Op.ne]: "block" }, // not equal to "blocked"
        // },
      },

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
        // where: {
        //   is_expired: false
        // }
      },
      {
        model: User,
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
        model: Call,
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
    ];

    // Get all chat participants for the user
    const participants =
      await participant_service.getParticipantWithoutPagenation({
        user_id: socket.authData.user_id,
      });

    let emmitdata = []; // Initialize an empty array for response data
    const foreignKeysConfig = [];

    // If user is a participant in any chat
    if (participants.Records.length > 0) {
      let chat_ids = participants.Records.map(
        (chats) => chats.chat_id
      );

      // Check if requested chat_id is valid for the user
      if (chat_ids.includes(data.chat_id)) {
        // Get all participants for the chat
        let aa = await participant_service.getParticipantWithoutPagenation(
          { chat_id: data.chat_id },
          includeOptions
        );
        let chats

        if (data?.message_type == 'media') {
          chats = await message_service.getMessages(
            {
              chat_id: data.chat_id,
              message_type: {
                [Op.in]: ['image', 'video', 'gif'], // Accepts an array of types
              },
              [Op.and]: [
                Sequelize.literal(`NOT ("Message"."deleted_for" @> ARRAY['${isUser.user_id}']::decimal[])`)
              ]
            },
            includeOptionsforChat,
            {
              page: data.page || 1,
              pageSize: data.pageSize || 10,
            },
            foreignKeysConfig
          );
        }
        else if (data?.message_type) {
          chats = await message_service.getMessages(
            {
              chat_id: data.chat_id,
              message_type: data.message_type,
              [Op.and]: [
                Sequelize.literal(`NOT ("Message"."deleted_for" @> ARRAY['${isUser.user_id}']::decimal[])`)
              ]
            },
            includeOptionsforChat,
            {
              page: data.page || 1,
              pageSize: data.pageSize || 10,
            },
            foreignKeysConfig
          );
        }
        else {
          chats = await message_service.getMessages(
            {
              chat_id: data.chat_id,
              message_type: { [Op.ne]: "block" },
              [Op.and]: [
                Sequelize.literal(`NOT ("Message"."deleted_for" @> ARRAY['${isUser.user_id}']::decimal[])`)
              ],

            },
            includeOptionsforChat,
            {
              page: data.page || 1,
              pageSize: data.pageSize || 10,
            },
            foreignKeysConfig
          );
        }
        // Add 'starred' boolean to each message based on starred_for array
        if (chats && chats.Records) {
          chats.Records = chats.Records.map(msg => ({
            ...msg,
            starred: Array.isArray(msg.starred_for) && msg.starred_for.includes((isUser.user_id).toString())
          }));
        }


        if (data.pinned) {
          let pinned_messages = await message_service.getMessages(
            {
              chat_id: data.chat_id,
              [Op.and]: [
                Sequelize.literal(`NOT ("Message"."deleted_for" @> ARRAY['${isUser.user_id}']::decimal[])`)
              ],
              pinned: true
            },
            includeOptionsforChat
          );
          emmitdata.push(pinned_messages);
        }
        else {
          emmitdata.push({
            Records: [], Pagination: {
              total_pages: 0,
              total_records: 0,
              current_page: 0,
              records_per_page: 0
            }
          });

        }

        // If there are messages, update seen status and emit results
        if (chats.Records?.length > 0) {

          for await (const element of chats.Records) {
            try {
              // Update message seen status for the user
              await message_seen_service.updateMessageSeen(
                {
                  message_id: element.message_id,
                  user_id: isUser.toJSON().user_id
                },
                { message_seen_status: "seen" }
              );

              const seen_user_count = await message_seen_service.getMessageSeenCount(
                {
                  andConditions: {
                    chat_id: element.chat_id,
                    message_id: element.message_id,
                    message_seen_status: 'seen'
                  }

                }
              )
              if (aa.Records.length == seen_user_count.count && element.message_seen_status != "seen") {
                const message_status_content = await message_service.updateMessage({ message_id: element.message_id }, { message_seen_status: "seen" })
                const sender = await getUser({ user_id: element.sender_id })
                // emitEvent(sender.socket_ids, "message_seen_status", message_status_content[1][0]);
                emitEvent(sender.socket_ids, "real_time_message_seen", message_status_content[1][0]);

              }

            } catch (error) {
              console.error('Error updating message seen:', error);
            }
          }
          // Add chat messages to response data
          emmitdata.push(chats);
          // Emit event with pinned and message list based on message_type
          if (data.message_type) {

            emitEvent([socket.id], "message_list_with_specific_type", { pinned_messages: emmitdata[0], message_list: emmitdata[1] });
          }
          else {

            emitEvent([socket.id], "message_list", { pinned_messages: emmitdata[0], message_list: emmitdata[1] });
          }
        }
        else {
          if (data.message_type) {

            emitEvent([socket.id], "message_list_with_specific_type", {
              pinned_messages: {
                Records: [],
                pagination: {
                  total_pages: 0,
                  total_records: 0,
                  current_page: 0,
                  records_per_page: 0
                }
              },
              message_list: {
                Records: [],
                pagination: {
                  total_pages: 0,
                  total_records: 0,
                  current_page: 0,
                  records_per_page: 0
                }
              },
            });
          }
          else {

            emitEvent([socket.id], "message_list", {
              pinned_messages: {
                Records: [],
                pagination: {
                  total_pages: 0,
                  total_records: 0,
                  current_page: 0,
                  records_per_page: 0
                }
              },
              message_list: {
                Records: [],
                pagination: {
                  total_pages: 0,
                  total_records: 0,
                  current_page: 0,
                  records_per_page: 0
                }
              },
            });
          }
        }
      } else {
        // If user is not a participant in the chat, emit invalid chat event
        if (data.message_type) {

          emitEvent([socket.id], "message_list_with_specific_type", "Invalid Chat");
        }
        else {

          emitEvent([socket.id], "message_list", "Invalid Chat");
        }
      }
    }

  }
  catch (error) {
    console.log(error)
  }
}

module.exports = {
  message_list
};