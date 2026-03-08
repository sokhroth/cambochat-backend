const { Router } = require("express")

const userRoutes = require("./user.routes");
const blockRoutes = require("./block.routes")
const reportRoutes = require("./report.routes")
const chatRoutes = require("./chat.routes")
const project_conf_routes = require("./project_conf.routes")
const storyRoutes = require("./story.routes")
const contactRoutes = require("./contacts.routes")
const adminRoutes = require("./admin.routes")
const configRoutes = require("./config.routes")
const dashboardRoutes = require("./dashboard.routes")
const avatarRoutes= require("./avatar.route")
const { sendPushNotification } = require("../service/common/oneSignal.service");
const language_routes = require("./Language.routes"); 
const callRoutes = require("./call.routes");




const router = Router();

router.use('/users', userRoutes);
router.use('/block', blockRoutes);
router.use('/report', reportRoutes);
router.use('/chat', chatRoutes);
// router.use("/project-conf", project_conf_routes)
router.use("/story", storyRoutes)
router.use("/contacts", contactRoutes)
router.use("/admin", adminRoutes)
router.use("/config", configRoutes)
router.use("/dashboard", dashboardRoutes)
router.use('/avatar',avatarRoutes)
router.use("/language", language_routes);
router.use("/call", callRoutes);




module.exports = router;