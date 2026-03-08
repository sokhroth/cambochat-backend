const dotenv = require("dotenv");
dotenv.config();
const { createApp } = require("whoxa_advanced_app_setup");


const { initSocket, disconnectSocketById, emitEvent } = require("./src/service/common/socket.service");
const db = require("./models");
const { User } = require("./models");
const user_service_functions = require("./src/service/repository/user.service")
const admin_service_functions = require("./src/service/repository/Admin.service")
const indexRoutes = require("./src/routes/index.routes");
const { generalResponse } = require("./src/helper/response.helper");
let port = process.env.Port;
const { createInitialEntries } = require("./src/helper/initial.entries");
const { initialFilter } = require("./src/helper/initial.filter");
const {
  scheduleStoryCleanup,
  dailyActiveUsersCount,
  deleteDatain24Hours,

} = require("./src/service/repository/Cron.service");
const { initial_onlineList } = require("./src/controller/chat_controller/initial_online_list.socket.controller");
const filterData = require("./src/helper/filter.helper");
const { getParticipantWithoutPagenation } = require("./src/service/repository/Participant.service");
async function startServer() {
  const { app, server, io } = await createApp({
    routes: { index_routes: indexRoutes },
    enableSocket: true,
    jwtSecret: process.env.screteKey,
    models: {
      User: User,
    },
    dependencies: {
      user_service_functions: user_service_functions,
      admin_service_functions: admin_service_functions,
      generalResponse: generalResponse,
      disconnectSocketById: disconnectSocketById,
      initial_onlineList: initial_onlineList,
      getParticipantWithoutPagenation: getParticipantWithoutPagenation,
      emitEvent:emitEvent,
      filterData: filterData
      // JWT_SECRETKEY: string;
    }
  })
  initSocket(io);
  db.sequelize
    .sync({
      alter: true,
      // force: true
    })
    .then(async () => {


      server.listen(port, () => {
        console.log(`Server listening on port ${port}!`);
        createInitialEntries();
        initialFilter();
        scheduleStoryCleanup();
        deleteDatain24Hours()
        dailyActiveUsersCount();
      });
    })
    .catch((error) => {
      console.error("Sequelize sync error:", error);
    });
  // server.listen(3000, () => console.log("Server running on 3000"));

}


startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
