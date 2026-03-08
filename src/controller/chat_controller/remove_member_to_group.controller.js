const participant_service = require("../../service/repository/Participant.service");
const chat_service = require("../../service/repository/Chat.service");
const { Participant, sequelize } = require("../../../models");
const updateFieldsFilter = require("../../helper/updateField.helper");
const { generalResponse } = require("../../helper/response.helper");
const { Op, Sequelize } = require("sequelize");
const { sendMessage } = require("../message_controller/send_message.controller");
const { DEMO_CHAT_ID } = require("../../helper/demo_data.helper");

// 🚀 Function to remove a member from a group (or allow user to leave themselves)
async function removeMember(req, res) {
  try {
    const user_id = req.authData.user_id; // Logged-in user’s ID
    let filteredData;

    // ✅ Validate & extract only required fields from request body
    try {
      filteredData = await updateFieldsFilter(
        req.body,
        ["chat_id", "user_id", "delete_chat"], // Required params
        true
      );
    } catch (err) {
      return generalResponse(res, {}, err.message, true, false, 402);
    }
    const isDemoChat = process.env.IS_CLIENT != "true" && DEMO_CHAT_ID.includes(Number(filteredData.chat_id));
    if (isDemoChat) {
      return generalResponse(
        res,
        {},
        "This is demo chat you can not make changes in it",
        false,
        true
      )
    }
    // ✅ Ensure the chat is actually a group
    const isGroup = await chat_service.isGroup(filteredData.chat_id);
    if (!isGroup) {
      return generalResponse(res, {}, "Invalid group.", true, false, 402);
    }

    // ✅ Check if the requesting user exists in this group
    const user = await Participant.findOne({
      where: {
        user_id: user_id,
        chat_id: filteredData.chat_id,
      },
    });

    // ✅ If delete_chat is true → mark chat as deleted for this user
    if (filteredData.delete_chat) {
      chat_service.updateChat(
        {
          // Append user_id to "deleted_for" array in DB
          deleted_for: Sequelize.literal(
            `array_append("deleted_for", ${user_id})`
          ),
        },
        { chat_id: filteredData.chat_id }
      );
    }

    // ✅ Allow:
    //   1. Admins to remove others
    //   2. User to leave group themselves
    if (user?.is_admin || user?.user_id == filteredData.user_id) {
      const participant = await Participant.findOne({
        where: {
          user_id: filteredData.user_id,
          chat_id: filteredData.chat_id,
        },
      });

      if (participant) {
        // 🔑 If the participant being removed is an admin
        if (participant.is_admin) {
          // Get other admins except the one being removed
          const participants = await Participant.findAll({
            where: {
              is_admin: true,
              user_id: { [Op.ne]: user_id },
              chat_id: filteredData.chat_id,
            },
          });

          // ❌ If no other admins exist
          if (!participants.length) {
            // Promote the first non-admin (oldest member) to admin
            const non_admin_participant = await Participant.findOne({
              where: {
                chat_id: filteredData.chat_id,
                is_admin: false,
              },
              order: [["createdAt", "ASC"]],
              limit: 1,
            });

            if (non_admin_participant) {
              await participant_service.updateParticipant(
                { is_admin: true },
                {
                  user_id: non_admin_participant.user_id,
                  chat_id: filteredData.chat_id,
                }
              );
            } else {
              // ❌ No one left → delete the group
              await chat_service.updateChat(
                {
                  is_deleted: true,
                  deleted_at: new Date(),
                },
                { chat_id: filteredData.chat_id }
              );

              return generalResponse(
                res,
                {},
                "Group deleted successfully !!",
                true,
                true
              );
            }
          } else {
            // ✅ Other admins exist → just mark current admin as deleted
            await participant_service.updateParticipant(
              { is_deleted: true },
              {
                user_id: filteredData.user_id,
                chat_id: filteredData.chat_id,
              }
            );

            // Mark chat as deleted for this user too
            chat_service.updateChat(
              {
                deleted_for: sequelize.fn(
                  "array_append",
                  sequelize.col("deleted_for"),
                  filteredData.user_id
                ),
              },
              { chat_id: filteredData.chat_id }
            );

            return generalResponse(
              res,
              {},
              "Admin Removed from group !!",
              true,
              true
            );
          }
        }

        // ✅ Remove the participant (non-admins or already handled admins)
        participant_service.updateParticipant(
          { is_deleted: true },
          {
            user_id: filteredData.user_id,
            chat_id: filteredData.chat_id,
          }
        );

        // ✅ Create system message: either "left group" or "removed from group"
        let messageReq = {};
        if (user.user_id == filteredData.user_id) {
          // User left voluntarily
          messageReq = {
            body: {
              chat_id: isGroup.chat_id,
              message_content: "You left this group.",
              message_type: "member-left",
              user_id: user_id,
              peer_user: filteredData.user_id,
            },
            authData: req.authData,
          };

        } else {
          // Removed by admin
          messageReq = {
            body: {
              chat_id: isGroup.chat_id,
              message_content: "You were removed from this group.",
              message_type: "member-removed",
              user_id: user_id,
              peer_user: filteredData.user_id,
            },
            authData: req.authData,
            files: req.files,
          };
        }

        // Mock response object for sendMessage function
        const messageRes = {
          status: function (code) {
            return this;
          },
          send: function (data) {
            return data;
          },
        };

        // 📩 Send system message
        await sendMessage(messageReq, messageRes);

        return generalResponse(
          res,
          {},
          "Member removed successfully!!",
          true,
          true,
          200
        );
      } else {
        return generalResponse(res, {}, "User not found.", true, false, 402);
      }
    } else {
      // ❌ Non-admins cannot remove others
      return generalResponse(
        res,
        {},
        "You're not an admin, Only admins can remove members.",
        true,
        false,
        402
      );
    }
  } catch (error) {
    // 🚨 Catch-all error handler
    return generalResponse(
      res,
      { success: false },
      error.message,
      false,
      true,
      402
    );
  }
}

module.exports = {
  removeMember,
};
