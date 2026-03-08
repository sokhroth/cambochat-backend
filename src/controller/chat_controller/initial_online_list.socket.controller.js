const filterData = require("../../helper/filter.helper");
const participant_service = require("../../service/repository/Participant.service");
const { getUser } = require("../../service/repository/user.service");
const { User } = require("../../../models");

async function initial_onlineList(socket, emitEvent) {
  // ✅ Check if user exists in DB (using user_id from socket auth data)
  const isUser = await getUser({ user_id: socket.authData.user_id });
  let onlineUsers = [];

  if (!isUser) {
    // ❌ Stop if user not found
    return next(new Error("User not found."));
  }

  // ✅ Convert Sequelize instance to plain object
  let user_data = { ...isUser.toJSON() };

  // ✅ Remove sensitive data from user object
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

  // ✅ Define what fields we need when fetching Users
  const includeOptions = [
    {
      model: User,
      as: "User",
      attributes: [
        "mobile_num",
        "profile_pic",
        "dob",
        "user_id",
        "full_name",
        "user_name",
        "email",
        "country_code",
        "socket_ids", // used to check online status
        "login_type",
        "gender",
        "country",
        "state",
        "city",
        "bio",
        "profile_verification_status",
        "login_verification_status",
        "is_private",
        "is_admin",
        "createdAt",
        "updatedAt",
      ],
    },
  ];

  // ✅ Fetch all chats that the logged-in user is a participant of
  let getChats_of_users =
    await participant_service.getParticipantWithoutPagenation({
      user_id: socket.authData.user_id,
    });

  if (getChats_of_users.Records.length > 0) {
    // ✅ Process each chat
    const promises = getChats_of_users.Records.map(async (chats) => {
      const chat_id = chats.chat_id;

      // ✅ Get all participants of this chat along with User details
      let users = await participant_service.getParticipantWithoutPagenation(
        { chat_id },
        includeOptions
      );

      // ✅ Filter only online users (have socket_ids) and exclude self
      const onlineUsersForChat = users.Records.filter((chats) => {
        const user = chats.User;
        return (
          user.socket_ids && // User must have active socket connections
          user.socket_ids.length > 0 &&
          user.user_id !== socket.authData.user_id // Exclude current user
        );
      }).map((chats) => {
        // Mark user as online explicitly
        chats.User.isOnline = true;
        return chats.User;
      });

      // ✅ Push collected online users into the main list
      onlineUsers.push(...onlineUsersForChat);
    });

    // ✅ Wait for all async tasks to complete before proceeding
    await Promise.all(promises);

    // ✅ Emit event with collected online users
    if (onlineUsers.length > 0) {
      emitEvent([socket.id], "initial_online_user", { onlineUsers });
    } else {
      emitEvent([socket.id], "initial_online_user", { onlineUsers: [] }); // no online users found
    }
  } else {
    // ✅ User is not part of any chats → return empty list
    emitEvent([socket.id], "initial_online_user", { onlineUsers: [] });
  }
}

module.exports = {
  initial_onlineList,
};
