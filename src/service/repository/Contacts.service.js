const { User } = require("../../../models");
const { DEMO_USER_ID } = require("../../helper/demo_data.helper");

async function updateContacts(user_id, contact_details) {
    try {
        // Filter out null or undefined entries
        const validContacts = Array.isArray(contact_details)
            ? contact_details.filter(contact => contact !== null && contact !== undefined)
            : [];

        const isDemoUser = process.env.IS_CLIENT != "true" && DEMO_USER_ID.includes(user_id);
        
        if (!isDemoUser) {
            User.update({ contact_details }, { where: { user_id } });
        }

        const user = await User.findOne({
            where: { user_id: user_id },
            attributes: { exclude: ['password', 'otp'] }
        });

        return user;
    } catch (error) {
        console.error('Error in Creating Contacts', error);
        throw error;
    }
}

async function getContacts(user_id) {
    try {
        const isContacts = await User.findOne({
            where: { user_id: user_id, deleted_at: null },
            attributes: ["contact_details"],
        });
        return isContacts;
    } catch (error) {
        console.error('Error in fetching Contacts:', error);
        throw error;
    }
}

// async function updateContacts(user_id, contact_details) {
//     try {
//         const updatedContacts = await User.update({ contact_details: contact_details }, { where: { user_id: user_id } });
//         return await Contacts.findOne({ where: { user_id: user_id } });
//     } catch (error) {
//         console.error('Error in update Contacts', error);
//         throw error;
//     }
// }

module.exports = {
    getContacts,
    updateContacts,
};
