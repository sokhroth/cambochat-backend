const express = require('express');

const dashboard_controller = require('../controller/dashboard_controller/dashboard.controller');

const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const { isAdmin } = require('../service/repository/Admin.service');

// Auth follow Routes
router.use(authMiddleware)
router.use(isAdmin);

router.get('/new-users-count', dashboard_controller.getUsersCntByMonthsYears);
router.get('/get-users-count', dashboard_controller.getUsersCntByLoginType);
router.get('/new-groups-count', dashboard_controller.getGroupsCountByMonthsYears);
router.get('/call-count', dashboard_controller.getCallsCount);
// router.get('/video-call-count', dashboard_controller.getGroupsCountByMonthsYears);

module.exports = router;