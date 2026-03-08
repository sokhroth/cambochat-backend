// Import required services and helpers
const socket_service = require("../../service/common/socket.service");
const participant_service = require("../../service/repository/Participant.service");
const updateFieldsFilter = require("../../helper/updateField.helper");
const { getUser } = require("../../service/repository/user.service");
const { generalResponse } = require("../../helper/response.helper");

async function votePoll(req, res) {
  try {
    let filteredData;

    // ✅ Step 1: Validate and filter incoming request body
    try {
      // Only allow "poll_id" and "option" fields, both required
      filteredData = await updateFieldsFilter(
        req.body,
        ["poll_id", "option"],
        true
      );
    } catch (err) {
      // If validation fails, return error response
      return generalResponse(res, {}, err.message, true, false, 402);
    }

    // ✅ Step 2: Register the user's vote for the poll
    let poll = await poll_service.votePoll(
      filteredData.poll_id,
      filteredData.option,
      req.authData.user_id // user who voted
    );

    // If no poll found, return error response
    if (!poll) {
      return generalResponse(res, {}, "Invalid poll.", true, false, 402);
    }

    // ✅ Step 3: Fetch the updated poll after voting
    poll = await poll_service.getPoll(filteredData.poll_id);

    // ✅ Step 4: Get all participants of the poll's chat
    const participants =
      await participant_service.getParticipantWithoutPagenation({
        chat_id: poll.chat_id,
      });

    // ✅ Step 5: Get detailed user info (including socket IDs) for each participant
    const users = await Promise.all(
      participants.Records.map(
        async (user) => await getUser({ user_id: user.user_id })
      )
    );

    // ✅ Step 6: Collect socket IDs of all users in the chat
    poll.socket_ids = users.flatMap((user) => user.socket_ids);

    // ✅ Step 7: Notify all participants via socket that someone voted
    socket_service.emitEvent(poll.socket_ids, "poll_voted", poll);

    // ✅ Step 8: Send success response
    return generalResponse(res, {}, "Poll voted successfully!!", true, 200);
  } catch (error) {
    // ❌ Handle unexpected errors
    console.error("Error in voting for the poll:", error);
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
  votePoll,
};
