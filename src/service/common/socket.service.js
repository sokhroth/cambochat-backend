const { getUser } = require("../repository/user.service");
const {
  getParticipantWithoutPagenation,
} = require("../repository/Participant.service");
const { User } = require("../../../models");
const filterData = require("../../helper/filter.helper");
const {
  typing
} = require("../../controller/message_controller/typing.socket.controller");
const {
  chat_list
} = require("../../controller/chat_controller/chat_list.socket.controller");
const {
  message_list
} = require("../../controller/message_controller/message_list.socket.controller");
const {
  real_time_message_seen
} = require("../../controller/message_controller/real_time_message_seen.socket.controller");
const {
  initial_onlineList
} = require("../../controller/chat_controller/initial_online_list.socket.controller");
const {
  delete_for_everyone
} = require("../../controller/message_controller/delete_for_everyone.socket.controller");
const {
  delete_for_me
} = require("../../controller/message_controller/delete_for_me.socket.controller");
const {
  archive_chat
} = require("../../controller/chat_controller/archive_chat.socket.controller");
const { deleteSocket } = require("./socket.storage.management");
const {
  acceptCall
} = require("../../controller/call_controller/accept_call.socket.controller");
const {
  declineCall
} = require("../../controller/call_controller/decline_call.socket.controller");
const {
  leaveCall
} = require("../../controller/call_controller/leave_call.socket.controller");
const {
  call_Changes
} = require("../../controller/call_controller/call_changes.socket.controller");
let io;

// Initialize the socket server
const initSocket = (serverwithsockets) => {
  io = serverwithsockets;

  // Set up event listeners for socket connections
  io.on("connection", (socket) => {

    // Example: Listen for a custom event
    listenToEvent(socket, "chat_list", (data) => {
      chat_list(socket, data, emitEvent);
    });
    listenToEvent(socket, "archived_chat_list", (data) => {
      chat_list(socket, data, emitEvent, true);
    });
    listenToEvent(socket, "message_list", (data) => {
      message_list(socket, data, emitEvent);
    });
    listenToEvent(socket, "delete_for_me", (data) => {
      delete_for_me(socket, data, emitEvent);
    });
    listenToEvent(socket, "delete_for_everyone", (data) => {
      delete_for_everyone(socket, data, emitEvent);
    });
    listenToEvent(socket, "typing", (data) => {
      typing(socket, data, emitEvent);
    });
    listenToEvent(socket, "initial_online_user", (data) => {
      initial_onlineList(socket, emitEvent);
    });
    listenToEvent(socket, "real_time_message_seen", (data) => {
      real_time_message_seen(socket, data, emitEvent);
    });
    // listenToEventwithAck(socket, "get_chat_id", get_chat_id);

    // listenToEvent(socket, "call", (data) => {
    //   call_cotroller.makeCall(socket, data, emitEvent, joinRoom);
    // });
    listenToEvent(socket, "accept_call", (data) => {
      acceptCall(socket, data, emitEvent, emitToRoom, joinRoom);
    });
    listenToEvent(socket, "decline_call", (data) => {
      declineCall(socket, data, emitEvent, emitToRoom);
    });
    listenToEvent(socket, "leave_call", (data) => {
      leaveCall(socket, data, emitEvent, emitToRoom, leaveRoom);
    });
    listenToEvent(socket, "call_changes", (data) => {
      call_Changes(socket, data, emitEvent, emitToRoom);
    });

    // listenToEvent(socket, "missed_call", (data) => {
    //   call_cotroller.missedCall(socket, data, emitEvent, emitToRoom);
    // });
    listenToEvent(socket, "archive_chat", (data) => {
      archive_chat(socket, data, emitEvent);
    });

    // Handle disconnection
    socket.on("disconnect", async () => {
      // await updateUser({ socket_id: "" }, { user_id: socket.authData.user_id });
      if (socket.authData && socket.authData.user_id) {
        await deleteSocket(socket.id, socket.authData.user_id);
        const isUser = await getUser({ user_id: socket.authData.user_id });
        if (!isUser) {
          return new Error("User not found.");
        }
        attributes = [
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
        const userWithSelectedFields = filterData(isUser.toJSON(), attributes);

        if (isUser.socket_ids.length >= 1) {
          return
        }
        userWithSelectedFields.isOnline = false;
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
              "socket_ids",
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
        const getChats_of_users = await getParticipantWithoutPagenation(
          { user_id: isUser.user_id },
          includeOptions
        );
        const emitted = [];
        if (getChats_of_users.Records.length > 0) {
          getChats_of_users.Records.map((chats) => {
            return chats.chat_id;
          }).forEach(async (element) => {
            let users = await getParticipantWithoutPagenation(
              { chat_id: element },
              includeOptions
            );
            users.Records.map((chats) => {
              // if (chats.dataValues.User.dataValues.user_id != updatedUser)
              if (emitted.includes(chats.user_id)) return;
              emitEvent(
                chats.User.socket_ids,
                "offline_user",
                userWithSelectedFields
              );
              emitted.push(chats.user_id);
            });
          });
        }
      } else {
      }
    });
  });
};

// Emit event to a specific socket
const emitEvent = (socket_ids, event, data) => {
  // Retrieve the socket instance using the socket_id
  socket_ids.map((socket_id) => {
    const socket = io.sockets.sockets.get(socket_id);

    if (socket) {
      // console.log("Emmited to", socket_id, "Event", event, "data", data);

      socket.emit(event, data);
    } else {
      console.warn(`Socket with ID ${socket_id} is not connected`);
    }
  });
};

// Listen to an event from a specific socket
const listenToEvent = (socket, event, callback) => {
  socket.on(event, (data) => {
    if (callback) callback(data);
  });
};
const listenToEventwithAck = (socket, event, handler) => {
  socket.on(event, (data, clientCallback) => {
    if (handler) {
      handler(socket, data)
        .then((result) => {
          if (clientCallback) clientCallback(result);
        })
        .catch((error) => {
          console.error(`Error in event "${event}":`, error);
          if (clientCallback)
            clientCallback({ success: false, error: error.message });
        });
    }
  });
};

const disconnectSocketById = (socketId, reason = "manual_disconnect") => {
  if (io) {
    const socket = io.sockets.sockets.get(socketId);

    if (socket) {
      socket.emit("force_disconnect", { reason }); // optional: notify client
      socket.disconnect(true);
    } else {
      console.warn(`Socket with ID ${socketId} not found.`);
    }
  } else {
    console.warn("Socket.io not initialized");
  }
};


// Dispose of the socket server
const disposeSocket = () => {
  if (io) {
    io.close(() => {
      console.log("Socket server disposed ✅");
    });
  } else {
    console.warn("Socket server is not initialized");
  }
};

// Broadcast event to all connected clients
const broadcastEvent = (event, data) => {
  if (io) {
    io.emit(event, data);
  } else {
    console.warn("Socket server is not initialized");
  }
};

const joinRoom = (socket, roomId) => {
  if (io) {
    socket.join(roomId);
  } else {
    console.warn("Socket.io not initialized");
  }
};

const leaveRoom = (socket, roomId) => {
  if (io) {
    socket.leave(roomId);
  } else {
    console.warn("Socket.io not initialized");
  }
};
const disposeRoom = (roomId) => {
  if (io) {
    const room = io.sockets.adapter.rooms.get(roomId);

    if (room) {
      // Make all sockets leave the room without disconnecting
      for (const socketId of room) {
        const socket = io.sockets.sockets.get(socketId);
        if (socket) {
          socket.leave(roomId);
        }
      }

      // Room is now empty but no disconnection happened
    } else {
      console.warn(`Room ${roomId} not found.`);
    }
  } else {
    console.warn("Socket.io not initialized");
  }
};

/**
 * Emit an event to a specific room
 * @param {string} roomId - Room ID to send the event to
 * @param {string} event - Event name to emit
 * @param {any} data - Data to send with the event
 */

const emitToRoom = (roomId, event, data) => {
  if (io) {
    io.to(roomId).emit(event, data);
  } else {
    console.warn("Socket.io not initialized");
  }
};

const getRoomMembers = async (roomId) => {
  if (io) {
    const sockets = await io.in(roomId).allSockets();
    return Array.from(sockets);
  } else {
    console.warn("Socket.io not initialized");
    return [];
  }
};
module.exports = {
  initSocket,
  emitEvent,
  listenToEvent,
  disposeSocket,
  broadcastEvent,
  joinRoom,
  leaveRoom,
  disposeRoom,
  emitToRoom,
  getRoomMembers,
  disconnectSocketById,
  io,
};
