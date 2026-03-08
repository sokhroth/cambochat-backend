const { generalResponse } = require("../../helper/response.helper");
const { getStory, updateStory } = require("../../service/repository/Story.service");
const updateFieldsFilter = require("../../helper/updateField.helper");

async function viewStory(req, res) {
    try {
        user_id = req.authData.user_id;   // Extract logged-in user ID

        let filteredData;
        try {
            // Validate and filter request body (only allow 'story_id')
            filteredData = updateFieldsFilter(req.body, ['story_id'], true);
        } catch (err) {
            // Handle validation error
            return generalResponse(
                res,
                {},
                err.message,
                false,
                true,
                500
            );
        }

        // Fetch the story by ID (only if not expired)
        let story = await getStory({
            story_id: filteredData.story_id,
            is_expired: false
        });

        // If story not found
        if (!story) {
            return generalResponse(
                res,
                {},
                "Story not found!",
                false,
                true,
                500
            );
        }

        // If story belongs to the current user, don't update views
        if (story.user_id == user_id) {
            return generalResponse(
                res,
                story,
                "It's your story.",
                true,
                true,
                200
            );
        }

        // Add current user to story views (removes duplicate if already present)
        story = await updateStory(
            { views: [...(story.views ? story.views.filter(id => id != user_id) : []), user_id] },
            { story_id: filteredData.story_id }
        );

        // Success response
        return generalResponse(
            res,
            story,
            "Story viewed!",
            true,
            true,
            200
        );
    } catch (error) {
        // Catch any unexpected errors
        return generalResponse(
            res,
            {},
            error.message,
            false,
            true,
            500
        );
    }
}

module.exports = {
    viewStory
};

