const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');

const report_User_controller = require('../controller/report_controller/Report_user.controller');
const report_types_controller = require('../controller/report_controller/Report_types.controller');
const { demoGuard } = require('../middleware/demoGaurd');
// const report_social_controller = require('../controller/report_controller/Report_social.controller');

const router = express.Router();

// No Auth follow Routes

// Auth follow Routes
router.use(authMiddleware)

router.post('/report-user', report_User_controller.uploadReportUser);
router.post('/report-types', report_types_controller.showReportTypes);


// admin
router.post('/report-details', report_User_controller.getReportDetails);
router.post('/add-reports', demoGuard, report_types_controller.uploadReportTypes);
router.post('/reported-entities', report_User_controller.getReportedUsers);
router.post('/delete-report-type', demoGuard, report_types_controller.deleteReportType);


module.exports = router;