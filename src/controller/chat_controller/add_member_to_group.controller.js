// Import required services, models, and helpers
const participant_service = require("../../service/repository/Participant.service");
const chat_service = require("../../service/repository/Chat.service");
const { Participant } = require("../../../models");
const updateFieldsFilter = require("../../helper/updateField.helper");
const { getUser } = require("../../service/repository/user.service");
const { generalResponse } = require("../../helper/response.helper");
const { sendMessage } = require("../../controller/message_controller/send_message.controller");
const { DEMO_CHAT_ID } = require("../../helper/demo_data.helper");

async function addMember(req, res) {
  try {
    const user_id = req.authData.user_id; // The current logged-in user
    let filteredData;

    // ✅ Step 1: Validate and filter incoming request body

    try {
      filteredData = await updateFieldsFilter(
        req.body,
        ["chat_id", "user_id"], // only allow chat_id and user_id
        true // required fields
      );
      filteredData = await updateFieldsFilter(req.body, ["chat_id", "user_id"], true);
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
    // ✅ Step 2: Check if the chat_id corresponds to a group chat

    const isGroup = await chat_service.isGroup(filteredData.chat_id);
    if (!isGroup) {
      return generalResponse(res, {}, "Invalid group.", true, false, 402);
    }

    const user = await Participant.findOne({
      where: { user_id, chat_id: filteredData.chat_id }
    });

    // Ensure filteredData.user_id is always an array
    const userIds = Array.isArray(filteredData.user_id) ? filteredData.user_id : [filteredData.user_id];

    // Only admins can add
    if (!user?.is_admin) {
      return generalResponse(res, {}, "You're not an admin, Only admins can add members.", true, false, 402);
    }

    let addedUsers = [];
    let alreadyInGroup = [];
    let notFoundUsers = [];

    for (const uid of userIds) {
      const member = await Participant.findOne({
        where: { user_id: uid, chat_id: filteredData.chat_id }
      });

      if (member && !member.is_deleted) {
        alreadyInGroup.push(uid);
        continue;
      }

      const isUser = await getUser({ user_id: uid });
      if (!isUser) {
        notFoundUsers.push(uid);
        continue;
      }

      if (member && member.is_deleted) {
        // Reactivate deleted participant
        await participant_service.updateParticipant(
          { is_deleted: false },
          { chat_id: filteredData.chat_id, user_id: uid }
        );
      } else {
        // Add new participant
        await participant_service.createParticipant({
          user_id: uid,
          chat_id: filteredData.chat_id
        });
      }

      // Send "added" message to group
      const messageReq = {
        body: {
          chat_id: isGroup.chat_id,
          message_content: "You were added to this group.",
          message_type: "member-added",
          user_id,
          peer_user: uid
        },
        authData: req.authData,
        files: req.files
      };
      const messageRes = { status: () => messageRes, send: () => { } };
      await sendMessage(messageReq, messageRes);

      addedUsers.push(uid);
    }

    return generalResponse(
      res,
      { addedUsers, alreadyInGroup, notFoundUsers },
      "Member(s) processed successfully.",
      true,
      true,
      200
    );
  } catch (error) {
    console.log("error in addMember:", error);
    
    return generalResponse(res, { success: false }, "Error in adding member.", false, true, 402);
  }
}

module.exports = {
  addMember,
};
