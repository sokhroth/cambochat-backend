const participant_service = require("../../service/repository/Participant.service");
const chat_service = require("../../service/repository/Chat.service");
const updateFieldsFilter = require("../../helper/updateField.helper");
const { generalResponse } = require("../../helper/response.helper");
const config_service = require("../../service/common/config.service");
const { sendMessage } = require("../message_controller/send_message.controller");

async function createGroup(req, res) {
  try {
    const user_id = req.authData.user_id; // Extract logged-in user_id (creator of group)
    let filteredData;

    // ✅ Validate required fields (participants & group_name)
    try {
      const mandatoryFields = ["participants", "group_name"];
      filteredData = await updateFieldsFilter(req.body, mandatoryFields, true);

      // Optionally include group_description if provided
      if (req.body.group_description) {
        filteredData.group_description = req.body.group_description;
      }
    } catch (err) {
      // If required fields are missing → return error
      return generalResponse(res, {}, err.message, true, false, 402);
    }

    // ✅ Check group size limit based on config
    const config = config_service.getConfig({ config_id: 1 });
    if (config.maximum_members_in_group < filteredData.participants?.length) {
      return generalResponse(
        res,
        {},
        `Maximum of ${config.maximum_members_in_group} members are allowed in a group.`,
        false,
        true,
        400
      );
    }

    // ✅ Create new chat entry in DB with type "group"
    const group = await chat_service.createChat({
      chat_type: "group",
      group_icon: req.group_icon?.[0]?.path || "", // Use uploaded group icon path if provided
      group_name: filteredData.group_name,
      group_description: filteredData.group_description,
    });

    if (group && filteredData.participants?.length > 0) {
      // Add group creator as a participant (also mark as admin & creator)
      await participant_service.createParticipant({
        user_id: user_id,
        is_creator: true,
        chat_id: group.chat_id,
        is_admin: true,
      });

      // Add other participants to the group
      if (Array.isArray(filteredData.participants)) {
        for (const participant of filteredData.participants) {
          await participant_service.createParticipant({
            user_id: participant,
            chat_id: group.chat_id,
          });
        }
      } else {
        await participant_service.createParticipant({
          user_id: filteredData.participants,
          chat_id: group.chat_id,
        });
      }


      // ✅ Send a system message: "This group was created."
      const messageReq = {
        body: {
          chat_id: group.chat_id,
          message_content: "This group was created.",
          message_type: "group-created",
          // user_id: user_id,
        },
        authData: req.authData,
      };

      // Mock response object for sendMessage (since it's normally Express `res`)
      const messageRes = {
        status: function (code) {
          return this;
        },
        send: function (data) {
          return data;
        },
      };

      await sendMessage(messageReq, messageRes); // Send group creation message
    } else {
      // If group creation failed → return error response
      return generalResponse(
        res,
        {},
        "error in creating group.",
        true,
        false,
        402
      );
    }

    // ✅ Success → return group details
    return generalResponse(
      res,
      group,
      "Group created Successfully !!",
      true,
      true,
      200
    );
  } catch (error) {
    // ❌ Catch any runtime errors
    log.error("Error in creating group:", error);
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
  createGroup,
};
