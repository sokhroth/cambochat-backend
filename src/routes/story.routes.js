const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const {uploadStory} = require('../controller/story_controller/upload_story.controller');
const {removeStory} = require('../controller/story_controller/remove_story.controller');
const {findStory} = require('../controller/story_controller/find_story.controller');
const {getStories} = require('../controller/story_controller/get_stories.controller');
const {viewStory} = require('../controller/story_controller/view_story.controller');

const router = express.Router();

// No Auth Social Routes

// Auth Social Routes
router.use(authMiddleware)

router.post('/upload-story', uploadStory);
router.delete('/remove-story', removeStory);
router.post('/get-story', findStory);
router.get('/get-stories', getStories);
router.put('/view-story', viewStory);
router.post('/view-story', viewStory);

module.exports = router;
