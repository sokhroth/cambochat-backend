const express = require('express');
const { signupUser } = require('../controller/user_controller/signup.controller');
const { OtpVerification } = require('../controller/user_controller/verify_otp.controller');
const { deleteUser } = require('../controller/user_controller/delete_user.controller');
const { logout } = require('../controller/user_controller/logout.controller');
const { findUser } = require('../controller/user_controller/find_user.controller');
const { counts } = require('../controller/user_controller/counts.controller');
const { isOnline } = require('../controller/user_controller/is_online.controller');
const { updateProfile } = require('../controller/user_controller/updateProfile.controller');
const { authMiddleware } = require('../middleware/authMiddleware');
const notification_controller = require('../controller/Pushnotification.controller');


const router = express.Router();

// No Auth User Routes
router.post('/signup', signupUser);
router.post('/verfyOtp', OtpVerification);

router.use(authMiddleware)
// Auth User Routes
router.delete('/', deleteUser);
router.post('/logout', logout);
router.post('/updateUser', updateProfile);
router.post('/find-user', findUser);
router.post('/get-counts', counts);
router.get('/is-online/:user_id', isOnline);
router.post('/list-broadcast-notification', notification_controller.getbroadcastMessage);
router.post('/mark-as-seen-broadcast-notification', notification_controller.updateBroadcastUserList);

module.exports = router;