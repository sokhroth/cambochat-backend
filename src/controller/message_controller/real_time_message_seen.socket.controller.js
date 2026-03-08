const participant_service = require("../../service/repository/Participant.service");
const message_service = require("../../service/repository/Message.service");
const message_seen_service = require("../../service/repository/Message_seen.service");
const { getUser } = require("../../service/repository/user.service");

async function real_time_message_seen(socket, data, emitEvent) {
  // Fetch user details using user_id from socket authentication data
  const isUser = await getUser({ user_id: socket.authData.user_id });
  const isMessage = await message_service.getMessages(
    {
      message_id: data.message_id,
      chat_id: data.chat_id
    }
  );
  if (isMessage) {
    const update_message_seen = await message_seen_service.updateMessageSeen({
      message_id: data.message_id,
      user_id: isUser.toJSON().user_id
    }, {
      message_seen_status: data.status
    })
    const seen_user_count = await message_seen_service.getMessageSeenCount(
      {
        andConditions: {
          chat_id: data.chat_id,
          message_id: data.message_id,
          message_seen_status: 'seen'
        }

      }
    )
    let aa = await participant_service.getParticipantWithoutPagenation(
      { chat_id: data.chat_id },
    );
    if (seen_user_count.count == aa.Records.length && update_message_seen[0] > 0) {
      const update_message = await message_service.updateMessage({ message_id: Number(data.message_id) }, { message_seen_status: "seen" })

      if (update_message[0] > 0) {



        let sender = await getUser({ user_id: isMessage.Records[0].sender_id })

        emitEvent(sender.socket_ids, "real_time_message_seen", update_message[1][0].toJSON())
      }
    }
  }
  // If user does not exist, emit error
  if (!isUser) {
    return next(new Error("User not found."));
  }

}
module.exports = {
  real_time_message_seen,
};
