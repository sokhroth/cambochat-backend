const jwt = require("jsonwebtoken");
const user_service = require("../service/repository/user.service");
const { generalResponse } = require("../helper/response.helper");
const {
  getParticipantWithoutPagenation,
} = require("../service/repository/Participant.service");
const { User } = require("../../models");
const { emitEvent, disconnectSocketById } = require("../service/common/socket.service");
const filterData = require("../helper/filter.helper");
const {
  initial_onlineList,
} = require('../controller/chat_controller/initial_online_list.socket.controller');
const admin_service = require("../service/repository/Admin.service");

async function authMiddleware(req, res, next) {
  const platform = req.headers["x-platform"];
  if (!req.headers.authorization) {
    return res
      .status(403)
      .json({ success: false, error: "No credentials sent!" });
  } else {
    if (req.headers.authorization.split(" ")[0] !== "Bearer") {
      return res.status(401).json({ success: false, error: "Invalid token!" });
    }

    try {
      // check if the token is valid or not
      req.authData = jwt.verify(
        req.headers.authorization.split(" ")[1], // auth token
        process.env.screteKey
      );

      if (req?.authData?.user_id) {
        let isUser = await user_service.getUser({
          user_id: req.authData.user_id,
          deleted_at: null,
        });
        if (isUser?.bloked_by_admin) {
          return generalResponse(
            res,
            {},
            "User is blocked by admin",
            false,
            true
          );
        }
        await user_service.updateUser(
          {
            last_login: new Date(),
            platforms: isUser.platforms.includes(platform)
              ? isUser.platforms
              : [...isUser.platforms, platform],
          },
          { user_id: req.authData.user_id }
        );
        if (!isUser) {
          return generalResponse(res, {}, "No User found", false, true, 401);
        }
      }

      if (req?.authData?.admin_id) {
        let is_admin = await admin_service.getAdmin({
          admin_id: req.authData.admin_id,
        });

        if (!is_admin) {
          return generalResponse(res, {}, "No Admin found", false, true, 401);
        }
        req.adminData = is_admin.toJSON();
        req.user_type = "admin";
      }
    } catch (error) {
      console.error(error);
      return res
        .status(401)
        .json({ message: "Invalid token!", success: false });
    }
  }
  next();
}

const soketAuthMiddleware = async (socket, next) => {
  // Retrieve the token from the headers
  const authToken =
    socket.handshake.headers["token"] || socket.handshake.auth.token; // Here auth.token is for web because web can not pass in custom headers

  if (!authToken) {
    return next(new Error("Missing token during connection."));
  }

  try {
    const jwtSecretKey = process.env.screteKey; // Ensure the environment variable is correctly set
    // Verify the token and decode the user data
    const authData = jwt.verify(authToken, jwtSecretKey);

    // Initialize authData on the socket
    socket.authData = { user_id: authData.user_id };

    // Fetch the user from the database
    const isUser = await user_service.getUser({
      user_id: socket.authData.user_id,
      deleted_at: null,

    });
    if (!isUser) {
      disconnectSocketById(socket.id);

      return next(new Error("User not found."));
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
    let user_data = { ...isUser.toJSON() };
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
    user_data.isOnline = true;
    // await createSocket(socket.id, socket.authData.user_id)
    await user_service.updateUser(
      { socket_ids: [...isUser.socket_ids, socket.id] },
      { user_id: socket.authData.user_id }
    );
    const includeOptions = [
      {
        model: User,
        as: "User",
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
    ];
    const getChats_of_users = await getParticipantWithoutPagenation({
      user_id: socket.authData.user_id,
    });
    const emitted = []
    if (getChats_of_users.Records.length > 0) {
      getChats_of_users.Records.map((chats) => {
        return chats.chat_id;
      }).forEach(async (element) => {
        let users = await getParticipantWithoutPagenation(
          { chat_id: element },
          includeOptions
        );
        users.Records.map(async (chats) => {
          if (chats.user_id != socket.authData.user_id && !emitted.includes(chats.user_id)) {
            emitEvent(chats.User.socket_ids, "online_user", user_data);
            emitted.push(chats.user_id);
          }
        });
      });
    }

    initial_onlineList(socket, emitEvent);
    // Allow the connection to proceed.
    next();
  } catch (error) {
    console.error("Token verification or user handling error:", error);
    return next(new Error("Invalid token."));
  }
};


const authorize =
  (allowedRoles) =>
    (req, res, next) => {
      try {
        const userRole = req.user?.user_type 

        if (!userRole || !allowedRoles.includes(userRole)) {
          return generalResponse(res, {},'You are not authorized to perform this action' , false , true , 403);
        }

        next();
      } catch (err) {
        logger.error('Authorization error', err);
        return generalResponse(res, {}, 'You are not authorized to perform this action', false, true, 403);
      }
    };


module.exports = { authMiddleware, soketAuthMiddleware, authorize };
