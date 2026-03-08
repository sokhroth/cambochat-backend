const contacts_service = require("../../service/repository/Contacts.service");
const { generalResponse } = require("../../helper/response.helper");
const updateFieldsFilter = require("../../helper/updateField.helper");
const user_service = require("../../service/repository/user.service");

async function updateContacts(req, res) {
    try {
        
        let filteredData;
        try {
            filteredData = updateFieldsFilter(req.body, ["contact_details"], true);
        } catch (err) {
            return generalResponse(res, {}, "Data is Missing", false, true);
        }

        const user_id = req.authData.user_id;

        // Step 1: Get existing contacts of the user
        const existingUser = await user_service.getUser({ user_id });
        let existingContacts = existingUser?.contact_details || [];
        
        // Step 2: Create a map for quick lookup
        const numberMap = new Map();
        existingContacts.forEach(contact => {
            numberMap.set(contact.number, contact);
        });

        // Step 3: Merge or Add
        for (const item of filteredData?.contact_details || []) {
            const existingContact = numberMap.get(item.number);
            if (existingContact) {
                // If contact number exists, update the name
                existingContact.name = item.name;
            } else {
                // Else, find user and add new contact
                const user = await user_service.getUser({
                    mobile_num: (item.number).toString(),
                });
                if (user) {
                    existingContacts.push({
                        name: item.name,
                        number: item.number,
                        user_id: user?.dataValues?.user_id,
                    });
                }
            }
        }

        // Step 4: Save updated contacts
        const updatedContacts = await contacts_service.updateContacts(user_id, existingContacts);

        return generalResponse(
            res,
            updatedContacts,
            "Contacts updated successfully.",
            true,
            true,
            200
        );

    } catch (error) {
        console.error("Error in updating Contacts", error);
        return generalResponse(
            res,
            {},
            "Something went wrong while updating Contacts!",
            false,
            true,
            500
        );
    }
}

module.exports = {
    updateContacts,
};
