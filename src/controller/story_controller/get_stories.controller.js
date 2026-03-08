const { generalResponse } = require("../../helper/response.helper");
const {  getUserStories } = require("../../service/repository/Story.service");
const { getUser } = require("../../service/repository/user.service");
const contacts_service = require("../../service/repository/Contacts.service");

async function getStories(req, res) {
    try {
        // Extract current logged-in user ID from auth data
        const current_user_id = req.authData.user_id;

        // Fetch contacts of the current user
        const isContacts = await contacts_service.getContacts(current_user_id);

        // If no contacts are found, return response
        if (!isContacts) {
            return generalResponse(
                res,
                {},
                "Contacts not found",
                false,
                true,
            );
        }

        // Variables to store categorized stories
        let user;
        let viewed_stories = [];
        let recent_stories = [];

        // Loop through each contact and fetch their stories (parallel using Promise.all)
        const users = await Promise.all(
            isContacts?.dataValues?.contact_details.map(async ({ user_id }) => {
                // Exclude sensitive fields when fetching user
                const excludedFields = ['otp', 'id_proof', 'selfie', 'device_token', 'password' , 'contact_details'];

                // Fetch user with their active (non-expired) stories
                let user = await getUser(
                    { user_id },
                    [
                        {
                            association: 'stories',   // Join with stories table
                            as: 'Story',
                            required: true,          // Only include if stories exist
                            where: {
                                is_expired: false    // Fetch only active stories
                            },
                            attributes: [
                                'story_id',
                                'user_id',
                                'media',
                                'caption',
                                'tagged',
                                'views',
                                'createdAt',
                                'updatedAt',
                                'story_type'
                            ],
                        },
                    ],
                    excludedFields
                );

                // Skip user if not found
                if (!user) return null;

                // Convert user instance to plain JSON object
                user = user.toJSON();

                // Extract stories for the user
                const stories = user?.stories || [];
                const storyCount = stories.length;

                // Count how many stories this user has already been viewed by current_user_id
                let viewedCount = 0;
                stories.map(story => {
                    if (story.views.includes(current_user_id.toString())) {
                        viewedCount++;
                    }
                });

                // Prepare data object with story count and viewed count
                let data;
                if (viewedCount === storyCount && storyCount > 0) {
                    // If all stories have been viewed, push to viewed_stories array
                    data = {
                        ...user,
                        stories: [
                            ...user.stories.map(s => { return s }),
                        ],
                        storyCount,
                        viewedCount
                    };
                    viewed_stories = [...viewed_stories, data]
                }
                else {
                    // If not all stories are viewed, push to recent_stories array
                    data = {
                        ...user,
                        stories: [
                            ...user.stories.map(s => { return s }),
                        ],
                        storyCount,
                        viewedCount
                    };
                    recent_stories = [...recent_stories, data]
                }
            })
        );

        // Fetch current user's own stories (non-expired)
        const myStories = await getUserStories({
            user_id: current_user_id,
            is_expired: false
        });

        // Return final response containing categorized stories
        return generalResponse(
            res,
            {
                // Add my_stories (if available, otherwise empty array)
                ...(Object.keys(myStories)?.length > 0 ? { my_stories: myStories } : { my_stories: [] }),
                recent_stories,
                viewed_stories
            },
            "Contacts found.",
            true,
            false,
            200
        );
    } catch (error) {
        // Log error and return failure response
        console.log(error);
        return generalResponse(
            res,
            {},
            "Something went wrong while Finding User!",
            false,
            true,
            500
        );
    }
}


module.exports = {
    getStories,
};