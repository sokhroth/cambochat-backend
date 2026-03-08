const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const {createContacts} = require('../controller/contacts_controller/create_contacts.controller');
const {getContacts} = require('../controller/contacts_controller/get_contacts.controller');
const {updateContacts} = require('../controller/contacts_controller/update_contacts.controller');

const router = express.Router();

// Auth follow Routes
router.use(authMiddleware)

router.post('/create-contacts', createContacts);
router.get('/get-contacts', getContacts);
router.put('/update-contacts', updateContacts);

module.exports = router;