const e = require("express");
const express = require("express");

const {showAvatars} = require("../controller/avatar_controller/show_avatars.controller");
const {uploadAvatar} = require("../controller/avatar_controller/upload_avatar.controller");
const {updateAvatars} = require("../controller/avatar_controller/update_avatar.controller");
const {deleteAvatars} = require("../controller/avatar_controller/delete_avatar.controller");
const { demoGuard } = require("../middleware/demoGaurd");

const router = express.Router();

// Auth follow Routes

router.get("/get-all-avatars", showAvatars);
router.post("/add-avatar", demoGuard, uploadAvatar);
router.post("/update-avatar", demoGuard, updateAvatars);
router.post("/delete-avatar", demoGuard, deleteAvatars);

module.exports = router;
