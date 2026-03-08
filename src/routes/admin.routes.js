const express = require('express');

const admin_auth_controller = require('../controller/admin_controller/login_admin.controller');
const admin_details_controller = require('../controller/admin_controller/admin.details.controller');
const admin_controller = require('../controller/admin_controller/admin.controller');
const admin_cnts_controller = require('../controller/admin_controller/counts.controller');
const { authMiddleware } = require('../middleware/authMiddleware');
const { isAdmin } = require('../service/repository/Admin.service');
const language_controller = require('../controller/language_controller/language_controller')
const notification_controller = require('../controller/Pushnotification.controller');
const { demoGuard } = require('../middleware/demoGaurd');
const router = express.Router();

router.post('/login', admin_auth_controller.login_admin);
router.post('/get-language', language_controller.listLanguage);
router.post('/get-language-words', language_controller.listLanguageKeywords);

// Auth follow Routes
router.use(authMiddleware);
router.use(isAdmin);
router.get('/', admin_details_controller.get_admin_details);
router.put('/', admin_details_controller.update_admin);
router.put('/block-user', demoGuard, admin_controller.blockUser);
router.put('/block-group', demoGuard, admin_controller.blockGroup);

// Language Routes
router.post('/add-language', demoGuard, language_controller.add_new_language);
router.post('/update-language', demoGuard, language_controller.update_Language);
router.post('/translate-all-keywords', demoGuard, language_controller.translate_all_keywords);
router.post('/translate-single-keyword', demoGuard, language_controller.translate_single_keywords);
router.post('/manual-edit-keyword', demoGuard, language_controller.manual_edit_keyword);
router.post('/add-keyword', demoGuard, language_controller.add_new_keyword);

router.post("/users", admin_controller.usersList);
router.post('/calls-list', admin_controller.getCallList)
router.post("/group-chats", admin_controller.getGroupChats);

router.get("/users-cnt", admin_cnts_controller.getUsersCounts);
router.get("/users-cnt-country-wise", admin_cnts_controller.getUsersCountCountryWise);
router.get("/users-cnt-country-wise-last-30-mins", admin_cnts_controller.getUsersCountCountryWiselast30mins);
router.get("/groups-cnt", admin_cnts_controller.getGroupChatsCnt);
router.get("/calls-cnt", admin_cnts_controller.getCallsCnt);
router.get("/users-cnt-by-login-type", admin_cnts_controller.getUsersCntByLoginType);
router.get("/users-list-by-platform", admin_cnts_controller.getUsersListByPlatform);
router.post("/yearly-new-users-and-grps", admin_cnts_controller.getYearlyDataOfNewUsersAndGrps);
router.get("/new-users-of-week", admin_cnts_controller.weeklyNewUsers);
router.post("/yearly-calls-data", admin_cnts_controller.yearlyCallsData);
router.post(
  "/get-daily-active-users",
  admin_cnts_controller.dailyActiveUserscount
);
router.post('/new-user-notifications', admin_controller.newUserNotifications);
router.get('/is-notification-available', admin_controller.newNotifications)

router.post('/get-block-list', admin_controller.getBlockList);
// router.post('/deactivate', demoGuard, admin_controller.deactivate);


router.post('/notification', demoGuard, notification_controller.broadcastMessage);
router.post('/list-broadcast-notification', notification_controller.getbroadcastMessage);




module.exports = router;