const participant_service = require("../../service/repository/Participant.service");
const chat_service = require("../../service/repository/Chat.service");
const { getUser } = require("../../service/repository/user.service");
const { generalResponse } = require("../../helper/response.helper");
const config_service = require("../../service/common/config.service");

const searchChats = async (req, res) => {
  try {
    // Get logged-in user's ID
    const userId = String(req.authData.user_id);
    const { searchText } = req.body;

    // Convert search text to lowercase for case-insensitive matching
    const lowerSearch = searchText.toLowerCase();

    // Fetch all chat IDs in which this user is a participant
    const chatIds = await participant_service.getChatIdsByUser(userId);

    // If user has no chats, return early
    if (!chatIds.length) {
      return generalResponse(res, [], "No recent chats found", true);
    }

    // Fetch user details, including contact list
    const user = await getUser({ user_id: userId });
    const contacts = Array.isArray(user.contact_details)
      ? user.contact_details
      : [];

    // Map of user_id → contact name (only for contacts that have a name set)
    const contactNameMap = new Map(
      contacts
        .filter((c) => c.user_id != null && c.name)
        .map((c) => [String(c.user_id), c.name])
    );

    // Fetch chat details for all chat IDs
    const chats = await chat_service.getChatsByIds(
      chatIds,
      true, // include participants
      req.authData.user_id
    );

    const results = [];

    // Loop through each chat to check if it matches search text
    for (const chat of chats) {
      // Case 1: Group chat → check if group name matches search text
      if (chat.chat_type === "group") {
        if (chat.group_name?.toLowerCase().includes(lowerSearch)) {
          results.push(chat);
        }
      }
      // Case 2: Direct (1:1) chat → check participant name/contact
      else {
        // Find the "other" participant (not the logged-in user)
        let other = chat.participants.find((p) => String(p.user_id) !== userId);
        if (!other) continue;

        // Get config flags to decide whether to use contact name or username
        const config = await config_service.getConfig();

        // If app uses contact flow → search inside user's contact list
        if (config.user_name_flow === false && config.contact_flow === true) {
          const contactName = contactNameMap.get(String(other.user_id));

          if (contactName && contactName.toLowerCase().includes(lowerSearch)) {
            // Replace participant's username with contact name for display
            for (let participant of chat.participants) {
              if (
                String(participant.user_id) === String(other.user_id) &&
                participant.User
              ) {
                participant.User.user_name = contactName;
                break;
              }
            }

            results.push(chat);
          }
        }
        // Else use system's username field for search
        else {
          const contactName = await getUser({ user_id: other.user_id });

          if (
            contactName &&
            contactName.user_name.toLowerCase().includes(lowerSearch)
          ) {
            results.push(chat);
          }
        }
      }
    }

    // Return search results with message
    return generalResponse(
      res,
      results,
      `${results.length} result(s) found`,
      true
    );
  } catch (err) {
    console.error("Error in searchChats:", err);

    // Handle unexpected errors
    return generalResponse(
      res,
      null,
      "Internal server error",
      false,
      true,
      500
    );
  }
};

module.exports = {
  searchChats,
};
