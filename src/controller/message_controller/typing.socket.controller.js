// Import helpers, services, and models
const filterData = require("../../helper/filter.helper");
const participant_service = require("../../service/repository/Participant.service");
const { getUser } = require("../../service/repository/user.service");
const { User } = require("../../../models");

/**
 * Handles "typing" socket events.
 * This function checks which users are in the same chat
 * and broadcasts the "typing" event to all participants except the sender.
 *
 * @param {object} socket - The socket object containing authenticated user data.
 * @param {object} data - The data received with the typing event (e.g., chat_id).
 * @param {function} emitEvent - Function to emit events to specific socket IDs.
 */
async function typing(socket, data, emitEvent) {
  // ✅ Validate if user exists
  const isUser = await getUser({ user_id: socket.authData.user_id });
  if (!isUser) {
    return next(new Error("User not found."));
  }

  // Attach current user's ID to event data
  data.user_id = isUser?.user_id;

  // ✅ Define which user fields should be returned
  const attributes = [
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

  // ✅ Sequelize include options for fetching participant users with details
  const includeOptions = [
    {
      model: User,
      as: "User",
      attributes: attributes,
    },
  ];

  // ✅ Get all chats where the current user is a participant
  const getChats_of_users =
    await participant_service.getParticipantWithoutPagenation({
      user_id: socket.authData.user_id,
    });

  // Proceed only if user is in at least one chat
  if (getChats_of_users.Records.length > 0) {
    // Extract chat IDs from participant records
    let chat_id = getChats_of_users.Records.map((chats) => {
      return chats.chat_id;
    });

    // Loop through each chat the user is part of
    chat_id.forEach(async (element) => {
      let users;

      // Only handle the current chat where typing event was triggered
      if (element == data.chat_id) {
        // ✅ Get participants of this chat (with user details)
        users = await participant_service.getParticipantWithoutPagenation(
          { chat_id: element },
          includeOptions
        );
      }

      // ✅ Broadcast "typing" event to all other users in the chat
      users?.Records.map((chats) => {
        if (chats.User.user_id != socket.authData.user_id) {
          emitEvent(chats.User.socket_ids, "typing", data);
        }
      });
    });
  }
}

module.exports = {
  typing,
};
