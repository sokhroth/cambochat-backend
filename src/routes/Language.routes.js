const express = require('express');
const { listLanguage, listLanguageKeywords } = require('../controller/language_controller/language_controller');

const router = express.Router();

// No Auth User Routes
router.post('/get-language', listLanguage);
router.post('/get-language-words', listLanguageKeywords);


module.exports = router;