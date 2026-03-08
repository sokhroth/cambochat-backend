const { generalResponse } = require("../../helper/response.helper");
const user_service = require("../../service/repository/user.service");

async function isOnline(req, res) {
    try {
        // Extract user_id from request parameters
        const user_id = req.params.user_id

        // Validate if user_id is provided
        if (!user_id) {
            return generalResponse(
                res,
                {},
                "user_id is required.", // Error message if missing
                false,
                true,
                400
            );
        }

        // Call service to check if the user is online
        const user_data = await user_service.isOnline(user_id);

        // Return success response with user online status
        return generalResponse(
            res,
            user_data,
            "User Status Found.",
            true,
            false,
        );

    } catch (error) {
        // Log error in console
        console.error("Error: ", error);

        // Return error response with error message
        return generalResponse(
            res,
            {},
            error.message,
            false,
            true,
            400
        );
    }
}


module.exports = {
    isOnline
};