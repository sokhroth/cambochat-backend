const socket_service = require("../../service/common/socket.service");
const participant_service = require("../../service/repository/Participant.service");
const message_service = require("../../service/repository/Message.service");
const { Participant } = require("../../../models");
const updateFieldsFilter = require("../../helper/updateField.helper");
const { getUser } = require("../../service/repository/user.service");
const { generalResponse } = require("../../helper/response.helper");
const { User, Message, Call, Story } = require("../../../models");

// req: { message_id, pin_lifetime: days }
async function pinUnpinMessage(req, res) {
  try {
    // Get user ID from authenticated request data
    const user_id = req.authData.user_id;
    let filteredData;
    try {
      // Filter and validate required fields from request body
      filteredData = await updateFieldsFilter(
        req.body,
        ["message_id", "pin_lifetime"],
        true
      );
    } catch (err) {
      // Handle validation errors
      return generalResponse(res, {}, err.message, true, false, 402);
    }

    // Fetch the message to be pinned/unpinned
    let message = await message_service.getMessage({
      message_id: filteredData.message_id,
    });

    // Check if user is a participant in the chat
    const user = await Participant.findOne({
      where: {
        user_id: user_id,
        chat_id: message.chat_id,
      },
    });
    if (!user) {
      // If user is not a member, send error response
      return generalResponse(
        res,
        {},
        "You're not a member of this group.",
        true,
        false,
        402
      );
    }

    // If message does not exist, send error response
    if (!message) {
      return generalResponse(res, {}, "Invalid message.", true, false, 402);
    }

    // Fetch all participants in the chat
    const participants =
      await participant_service.getParticipantWithoutPagenation({
        chat_id: message.dataValues.chat_id,
      });

    // Get user details for all participants
    const users = await Promise.all(
      participants.Records.map(
        async (user) => await getUser({ user_id: user.user_id })
      )
    );
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
        where: {
          is_expired: false
        }
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

    let pinMessage;
    // If message is not pinned, pin it with provided lifetime
    if (!message.pinned) {
      pinMessage = await message_service.pinUnpinMessage(
        {
          pinned: !message.pinned,
          pin_lifetime: filteredData.pin_lifetime,
          pinned_till: filteredData.pinned_till,
        },
        filteredData.message_id,
        includeOptionsforChat
      );
    } else {
      // If message is already pinned, unpin it and reset lifetime/till date
      pinMessage = await message_service.pinUnpinMessage(
        { pinned: !message.pinned, pin_lifetime: null, pinned_till: null },
        filteredData.message_id,
        includeOptionsforChat
      );
    }
    // If pin/unpin operation failed, send error response
    if (!pinMessage) {
      return generalResponse(
        res,
        {},
        "Message not pinned, Try again.",
        true,
        false,
        402
      );
    }

    // Collect all socket IDs from users in the chat
    const socket_ids = users.flatMap((user) => user.socket_ids);

    // Emit event to all participants to notify pin/unpin action
    socket_service.emitEvent(
      [...socket_ids, user.socket_ids],
      "pinned_unpinned_message",
      { Records: [pinMessage] }
    );

    // Send response indicating success
    return generalResponse(
      res,
      {},
      `Message pinned: ${pinMessage.pinned} successfully !!`,
      true,
      true,
      200
    );
  } catch (error) {
    // Handle unexpected errors
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
  pinUnpinMessage,
};
