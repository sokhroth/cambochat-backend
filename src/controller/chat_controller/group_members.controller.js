const participant_service = require("../../service/repository/Participant.service");
const chat_service = require("../../service/repository/Chat.service");
const { Participant } = require("../../../models");
const updateFieldsFilter = require("../../helper/updateField.helper");
const { generalResponse } = require("../../helper/response.helper");
const { User } = require("../../../models");

async function groupMembers(req, res) {
  try {
    const user_id = req.authData.user_id; // ✅ Extract logged-in user ID from auth token
    let filteredData;

    // ✅ Validate required input → must include `chat_id`
    try {
      filteredData = await updateFieldsFilter(req.body, ["chat_id"], true);
    } catch (err) {
      return generalResponse(res, {}, err.message, true, false, 402);
    }

    // =============================================== I have commented this code because i want specific chat members in private chat too.
    // ✅ Check if given chat_id corresponds to a group
    // const isGroup = await chat_service.isGroup(filteredData.chat_id);
    // if (!isGroup) {
    //   return generalResponse(res, {}, "Invalid group.", true, false, 402);
    // }
    // =============================================== I have commented this code because i want specific chat members in private chat too.


    // ✅ Verify that requesting user is a participant in the group
    const user = await Participant.findOne({
      where: {
        user_id: user_id,
        chat_id: filteredData.chat_id,
        is_deleted: false,
      },
    });
    if (!user) {
      return generalResponse(
        res,
        {},
        "You're not a member of this group.",
        true,
        false,
        402
      );
    }

    // ✅ Define which User fields should be returned for each member
    const includes = [
      {
        model: User,
        attributes: [
          "profile_pic",
          "user_id",
          "full_name",
          "user_name",
          "email",
          "country_code",
          "mobile_num",
          "country",
        ],
      },
    ];

    // ✅ Fetch all participants (excluding deleted ones) with User details
    const members = await participant_service.getParticipantWithoutPagenation(
      {
        chat_id: filteredData.chat_id,
        is_deleted: false,
      },
      includes
    );

    // ✅ Return list of members
    return generalResponse(res, members, "Group members.", true, true, 200);
  } catch (error) {
    console.log(error);
    // ❌ Catch unexpected errors
    return generalResponse(
      res,
      { success: false },
      "error in getting group members.",
      false,
      true,
      402
    );
  }
}

module.exports = {
  groupMembers,
};
