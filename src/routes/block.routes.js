const express = require('express');

const {
  block_unblock,
} = require("../controller/block_controller/block_unblock.controller");
const {block_list} = require('../controller/block_controller/block_list.controller');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

// Auth follow Routes
router.use(authMiddleware)

router.post('/block-unblock', block_unblock);
router.post('/block-list', block_list);

module.exports = router;