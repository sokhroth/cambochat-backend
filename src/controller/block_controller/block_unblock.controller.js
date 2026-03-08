const socket_service = require("../../service/common/socket.service");
const { getUser } = require("../../service/repository/user.service");

const { generalResponse } = require("../../helper/response.helper");
const {
  isBlocked,
  createBlock,
  deleteBlock,
} = require("../../service/repository/Block.service");
const {
  updateChat,
  getChat,
} = require("../../service/repository/Chat.service");
const message_service = require("../../service/repository/Message.service");
const {
  getParticipantWithoutPagenation,
} = require("../../service/repository/Participant.service");
const { alreadyParticipantIndividual } = require("../../service/repository/Participant.service");
const { DEMO_USER_ID } = require("../../helper/demo_data.helper");

async function block_unblock(req, res) {
  try {
    const blocker_id = req.authData.user_id; // the person performing the action
    let { chat_id, user_id } = req.body;

    if (!user_id || !blocker_id) {
      return generalResponse(res, {}, "Data is Missing.", false, true, 400);
    }

    const blockPayload = { user_id: blocker_id, blocked_id: user_id };
    const isDemoUserblocker = process.env.IS_CLIENT != "true" && DEMO_USER_ID.includes(blocker_id);
    const isDemoUser = process.env.IS_CLIENT != "true" && DEMO_USER_ID.includes(user_id);

    if (isDemoUser && isDemoUserblocker) {
      return generalResponse(
        res,
        {},
        "You can not block demo account from demo account",
        false,
        true
      )
    }
    // check if already blocked
    const AlreadyBlocked = await isBlocked(blockPayload);
    if(!chat_id){
      if(!user_id){
        return generalResponse(res, {}, "chat_id or user_id is required", false, true, 400);

      }
      const chatindividual =await  alreadyParticipantIndividual(user_id,blocker_id) 
      chat_id = chatindividual
    }
    // fetch chat if chat_id exists
    let chat;
    if (chat_id) {
      chat = await getChat({ chat_id });
    }

    let participants;

    if (chat) {
      participants = await getParticipantWithoutPagenation({ chat_id });
    }

    // 🚫 Block user
    if (!AlreadyBlocked) {
      if (chat) {
        const blockedByArray = Array.isArray(chat.blocked_by)
          ? chat.blocked_by
          : [];
        await updateChat(
          { blocked_by: [...blockedByArray, blocker_id] },
          { chat_id }
        );
      }

      const newblock = await createBlock(blockPayload);

      await message_service.createMessage({
        chat_id,
        message_content: "blocked",
        message_type: "block",
        sender_id: blocker_id,
      });

      if (newblock) {
        // emit block event to user
        // ✅ Notify all participants of private chat
        if (chat.chat_type == "private") {
          participants.Records.map(async (participant) => {
            const user_data = await getUser({ user_id: participant.user_id });

            // Send updated message data to participants
            socket_service.emitEvent(user_data.socket_ids, "block_updates", {
              user_id: blocker_id,
              chat_id: chat.chat_id,
              is_blocked: true,
            });
          });
        }
        return generalResponse(
          res,
          { is_blocked: true },
          "User blocked successfully",
          true,
          false,
          200
        );
      }

      return generalResponse(res, {}, "Not blocked", false, true, 500);
    }

    // ✅ Unblock user
    const unblock = await deleteBlock(blockPayload);

    if (chat) {
      const blockedByArray = Array.isArray(chat.blocked_by)
        ? chat.blocked_by
        : [];
      await updateChat(
        { blocked_by: blockedByArray.filter((id) => id != blocker_id) },
        { chat_id }
      );
    }

    await message_service.createMessage({
      chat_id,
      message_content: "unblocked",
      message_type: "block",
      sender_id: blocker_id,
    });

    if (unblock) {
      // ✅ Notify all participants of private chat
      if (chat.chat_type == "private") {
        participants.Records.map(async (participant) => {
          const user_data = await getUser({ user_id: participant.user_id });

          // Send updated message data to participants
          socket_service.emitEvent(user_data.socket_ids, "block_updates", {
            user_id: blocker_id,
            chat_id: chat.chat_id,
            is_blocked: false,
          });
        });
      }
      return generalResponse(
        res,
        { is_blocked: false },
        "User Unblocked Successfully",
        true,
        false,
        200
      );
    }

    return generalResponse(res, {}, "Not Unblocked", false, true, 500);
  } catch (error) {
    console.error("Error in blocking or unblocking user.", error);
    return generalResponse(
      res,
      { success: false },
      "Something went wrong while blocking or unblocking user.",
      false,
      true,
      500
    );
  }
}

module.exports = {
  block_unblock,
};
