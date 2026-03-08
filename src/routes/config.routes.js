const express = require('express');
const {getConfig} = require('../controller/config_controller/get_config.controller');
const {updateConfig, deactivate} = require('../controller/config_controller/update_config.controller');
const { demoGuard } = require('../middleware/demoGaurd');
const router = express.Router();

router.get('/', getConfig);
router.put('/', demoGuard, updateConfig);
router.post('/deactivate', demoGuard, deactivate);

module.exports = router;