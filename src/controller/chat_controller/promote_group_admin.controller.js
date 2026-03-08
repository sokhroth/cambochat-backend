const participant_service = require("../../service/repository/Participant.service");
const chat_service = require("../../service/repository/Chat.service");
const { Participant } = require("../../../models");
const updateFieldsFilter = require("../../helper/updateField.helper");
const { generalResponse } = require("../../helper/response.helper");
const { sendMessage } = require("../../controller/message_controller/send_message.controller");

// ✅ Function to promote/demote a user as a group admin
async function promoteAsGroupAdmin(req, res) {
  try {
    const user_id = req.authData.user_id; // Extract logged-in user ID

    let filteredData;
    try {
      // ✅ Validate and extract only required fields from request body
      filteredData = await updateFieldsFilter(
        req.body,
        ["admin_user_id", "chat_id"], // Required keys
        true
      );
    } catch (err) {
      // ❌ Invalid request body
      return generalResponse(res, {}, err.message, true, false, 402);
    }

    // ✅ Check if chat_id belongs to a group chat
    const isGroup = await chat_service.isGroup(filteredData.chat_id);
    if (!isGroup) {
      return generalResponse(res, {}, "Invalid group.", true, false, 402);
    }

    // ✅ Check if current user is a member of the group
    const user = await Participant.findOne({
      where: {
        user_id: user_id,
        chat_id: filteredData.chat_id,
      },
    });

    // ✅ Ensure that only admins can promote/demote others
    if (user?.is_admin) {
      // 🔎 Find the participant who is to be promoted/demoted
      const participant = await Participant.findOne({
        where: {
          user_id: filteredData.admin_user_id,
          chat_id: filteredData.chat_id,
        },
      });

      if (participant) {
        // ✅ Toggle the admin status (promote/demote)
        participant_service.updateParticipant(
          { is_admin: !participant.is_admin },
          { chat_id: filteredData.chat_id, user_id: filteredData.admin_user_id }
        );

        // 📩 Send system message in group when status changes
        if (participant.is_admin) {
          // If already admin → remove admin role
          const messageReq = {
            body: {
              chat_id: isGroup.chat_id,
              message_content: "Removed As Admin",
              message_type: "removed-as-admin",
              user_id: user.user_id, // action done by
              peer_user: filteredData.admin_user_id, // affected user
            },
            authData: req.authData,
            files: req.files,
          };
          const messageRes = {
            status: function (code) {
              return this;
            },
            send: function (data) {
              return data;
            },
          };
          await sendMessage(messageReq, messageRes);
        } else {
          // If not admin → promote to admin
          const messageReq = {
            body: {
              chat_id: isGroup.chat_id,
              message_content: "Promoted As Admin",
              message_type: "promoted-as-admin",
              user_id: user.user_id,
              peer_user: filteredData.admin_user_id,
            },
            authData: req.authData,
            files: req.files,
          };
          const messageRes = {
            status: function (code) {
              return this;
            },
            send: function (data) {
              return data;
            },
          };
          await sendMessage(messageReq, messageRes);
        }

        // ✅ Success response
        return generalResponse(
          res,
          {},
          "Group admin updated Successfully !!",
          true,
          true,
          200
        );
      } else {
        // ❌ User to promote not found in the group
        return generalResponse(res, {}, "User not found", true, false, 402);
      }
    } else {
      // ❌ Non-admin users cannot promote/demote admins
      return generalResponse(
        res,
        {},
        "You're not an admin, Only admins can create new admins.",
        true,
        false,
        402
      );
    }
  } catch (error) {
    console.log("error in promoteAsGroupAdmin:", error);
    // ❌ Handle unexpected errors
    return generalResponse(
      res,
      { success: false },
      "error in creating group admin.",
      false,
      true,
      402
    );
  }
}

module.exports = {
  promoteAsGroupAdmin,
};
