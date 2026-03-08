const { generalResponse } = require("../../helper/response.helper");
const {
    getStory,
} = require("../../service/repository/Story.service");
const { getUser } = require("../../service/repository/user.service");
const updateFieldsFilter = require("../../helper/updateField.helper");

async function findStory(req, res) {
    try {
        const user_id = req.authData.user_id   // Extract user_id from auth token

        const isUser = await getUser({ user_id: user_id })   // Check if the user exists in DB
        if (!isUser) {   // If no user found, return 404
            return generalResponse(
                res,
                {},
                "User Not found",
                false,
                true,
                404
            )
        }

        let filteredData;
        allowedUpdateFieldsMandatory = ['story_id']   // Mandatory field for request

        try {
            // Validate and filter incoming request body for required fields
            filteredData = updateFieldsFilter(req.body, allowedUpdateFieldsMandatory, true);
        }
        catch (err) {   // If validation fails, return error response
            console.log(err);
            return generalResponse(
                res,
                { success: false },
                err.message,
                false,
                true
            );
        }

        // Fetch story details by story_id where story is not expired
        const story = await getStory({
            story_id: filteredData.story_id,
            is_expired: false
        });

        let user;
        const views = [...story.dataValues.views];   // Copy the list of viewers (user_ids)

        // Fetch all user details for those who viewed the story
        let userViews = await Promise.all(
            views.map((id) => getUser({ user_id: parseInt(id) }))
        );
        userViews = userViews.map(userView => { return userView.toJSON() })   // Extract user data

        // If logged-in user is the story owner, return story with viewer details
        if (user_id === story.dataValues.user_id) {
            return generalResponse(
                res,
                { ...story.dataValues, views: userViews },
                "Story Found!",
                true,
                true
            )
        }

        // Fetch story owner's details
        const story_owner = await getUser({ user_id: story.dataValues.user_id });

        // If story owner has a private account
        if (story_owner?.dataValues?.is_private) {
            // TODO: Ideally check if user follows the story owner before allowing view
            story.views = [...story.views, parseInt(user_id)]   // Add current user to views
            await story.save();   // Save updated views
            return generalResponse(
                res,
                { ...story.dataValues, views: userViews },
                "Story Found!",
                true,
                true
            )
        }
        else {
            // Public story: allow viewing without restrictions
            await story.save();
            return generalResponse(
                res,
                { ...story.dataValues, views: userViews },
                "Story Found!",
                true,
                true
            )
        }
    }
    catch (error) {   // Catch and log any unexpected errors
        console.error("Error in fetching story", error);
        return generalResponse(
            res,
            { success: false },
            error.message,
            false,
            true,
            500
        );
    }
}

module.exports = {
    findStory,
};
