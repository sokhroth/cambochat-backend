const express = require('express');

const {
  getConfig,
} = require("../controller/config_controller/get_config.controller");

const router = express.Router();

router.post("/get-project-configrations", getConfig);

module.exports = router;