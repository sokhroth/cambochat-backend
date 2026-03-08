const contacts_service = require("../../service/repository/Contacts.service");
const { generalResponse } = require("../../helper/response.helper");
const user_service = require("../../service/repository/user.service");

async function getContacts(req, res) {
    try {
        // Extract logged-in user's ID from authData
        const user_id = req.authData.user_id;

        // Fetch all contacts for the user
        const isContacts = await contacts_service.getContacts(user_id);

        // If no contacts exist, return 404
        if (!isContacts) {
            return generalResponse(
                res,
                {},
                "Contacts not found",
                false,
                true,
                404
            );
        }

        // Build final contacts list by fetching extra user details for each contact
        const final_details = (
            await Promise.all(
                isContacts.contact_details.map(async (element) => {
                    // Fetch user details for each contact
                    
                    const user = await user_service.getUser({ user_id: element.user_id });
                    if (user) {
                        const updated_user = user.toJSON();

                        if (!updated_user.bloked_by_admin) {
                            return {
                                ...element,
                                user_name: updated_user.user_name,
                                updatedAt: updated_user.updatedAt,
                                profile_pic: updated_user.profile_pic,
                            };
                        }
                    }


                    return null; // Exclude blocked users
                })
            )
        ).filter(Boolean);


        return generalResponse(
            res,
            final_details,
            "Contacts found",
            true,
            false,
            200
        );
    } catch (error) {
        // Log and return generic error response
        console.error("Error in fetching Contacts", error);
        return generalResponse(
            res,
            {},
            "Something went wrong while fetching Contacts!",
            false,
            true,
            500
        );
    }
}

module.exports = {
    getContacts
};
