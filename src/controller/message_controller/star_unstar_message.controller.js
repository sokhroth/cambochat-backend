const socket_service = require("../../service/common/socket.service");
const message_service = require("../../service/repository/Message.service");
const updateFieldsFilter = require("../../helper/updateField.helper");
const { getUser } = require("../../service/repository/user.service");
const { generalResponse } = require("../../helper/response.helper");

async function starUnstarMessage(req, res) {
  try {
    let filteredData;

    try {
      // Filter and validate required 'message_id' field from request body
      filteredData = await updateFieldsFilter(req.body, ["message_id"], true);
    } catch (err) {
      // Handle validation errors
      return generalResponse(res, {}, err.message, true, false, 402);
    }

    // Fetch the message to be starred/unstarred
    let message = await message_service.getMessage({
      message_id: filteredData.message_id,
    });

    // If message does not exist, send error response
    if (!message) {
      return generalResponse(res, {}, "Invalid message.", true, false, 402);
    }

    // Toggle star/unstar for the user
    message = await message_service.starUnstarMessage(
      message.dataValues.starred_for.includes(req.authData.user_id.toString())
        // If already starred, remove user from starred_for array
        ? message.dataValues.starred_for.filter(
            (id) => id != req.authData.user_id.toString()
          )
        // If not starred, add user to starred_for array
        : [...message.dataValues.starred_for, req.authData.user_id],
      filteredData.message_id
    );

    // If star/unstar operation failed, send error response
    if (!message) {
      return generalResponse(
        res,
        {},
        "Message not starred, Try again.",
        true,
        false,
        402
      );
    }

    // Fetch user details for socket notification
    const user = await getUser({ user_id: req.authData.user_id });
    // Check if message is starred for the user
    const starred = message[1][0].starred_for.includes(
      req.authData.user_id.toString()
    );
    // Emit event to user's sockets to notify star/unstar action
    socket_service.emitEvent(
      user.dataValues.socket_ids,
      "star_unstar_message",
      { Records: [{ ...message[1][0].dataValues, starred }] }
    );
    // Send response indicating success
    return generalResponse(
      res,
      {},
      `Message starred:${starred} successfully!!`,
      true,
      true,
      200
    );
  } catch (error) {
    // Handle unexpected errors
    console.log(error);
    return generalResponse(
      res,
      { success: false },
      error.message,
      false,
      true,
      500
    );
  }
}
module.exports = {
  starUnstarMessage,
};