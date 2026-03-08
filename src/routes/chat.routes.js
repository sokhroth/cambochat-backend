const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');

const {sendMessage} = require('../controller/message_controller/send_message.controller');
const {createGroup }= require('../controller/chat_controller/create_group.controller');
const {updateChat} = require('../controller/chat_controller/update_chat.controller');
const {promoteAsGroupAdmin} = require('../controller/chat_controller/promote_group_admin.controller');
const {addMember} = require('../controller/chat_controller/add_member_to_group.controller');
const {removeMember} = require('../controller/chat_controller/remove_member_to_group.controller');
const {groupMembers} = require('../controller/chat_controller/group_members.controller');
const {forwardMessage} = require('../controller/message_controller/forward_message.controller');
const {starUnstarMessage} = require('../controller/message_controller/star_unstar_message.controller');
const {pinUnpinMessage} = require('../controller/message_controller/pin_unpin_message.controller');
const {votePoll} = require('../controller/message_controller/vote_poll.controller');
const {chatMedia} = require('../controller/chat_controller/chat_media.controller');
const {starredMessageList} = require('../controller/message_controller/starred_message_list.controller');
const {clearChat} = require('../controller/chat_controller/clear_chat.controller');
const {call_history} = require('../controller/chat_controller/call_history.controller');
const {searchChats} = require('../controller/chat_controller/search_chats.controller');
const {searchMessage} = require("../controller/chat_controller/search_message.controller");
const router = express.Router();


// Auth follow Routes
router.use(authMiddleware)

router.post("/send-message", sendMessage);
router.post("/create-group", createGroup);
router.post("/update-group", updateChat);
router.post("/create-group-admin", promoteAsGroupAdmin);
router.post("/add-member", addMember);
router.post("/remove-member", removeMember);
router.post("/group-members", groupMembers);
router.post("/forward-message", forwardMessage);
router.post("/star-unstar-message", starUnstarMessage);
router.post("/pin-unpin-message", pinUnpinMessage);
router.post("/vote-poll", votePoll);
router.post("/chat-media", chatMedia);
router.post("/starred-messages", starredMessageList);
router.post("/clear-chat", clearChat);
router.post("/call-history" , call_history)
router.post("/search-chat" ,searchChats)
router.post("/search-message", searchMessage);


module.exports = router;