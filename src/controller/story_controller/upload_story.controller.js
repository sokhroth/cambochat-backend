const { generalResponse } = require("../../helper/response.helper");
const {
  createStory,
} = require("../../service/repository/Story.service");
const { getUser } = require("../../service/repository/user.service");
const updateFieldsFilter = require("../../helper/updateField.helper");

// Controller function to upload a new story for a user
async function uploadStory(req, res) {
  try {
    // Get current logged-in user ID from request
    const user_id = req.authData.user_id

    // Check if user exists in the DB
    const isUser = await getUser({ user_id: user_id })
    if (!isUser) {
      // Return error if user does not exist
      return generalResponse(
        res,
        {},
        "User Not found",
        false,
        true,
        404
      )
    }

    // Define mandatory fields for uploading a story
    allowedUpdateFieldsMandatory = ['story_type', 'caption', 'tagged']
    let filteredData;
    try {
      // Filter and validate request body fields
      filteredData = updateFieldsFilter(req.body, allowedUpdateFieldsMandatory, false);

      // Add user_id and uploaded file path to filtered data
      filteredData.user_id = user_id
      filteredData.media = req.files[0].path
      if(filteredData.story_type === 'video') {
        if(req.files.length < 2) {
          return generalResponse(
            res,
            {},
            "Thumbnail is required for video stories",
            false,
            true,
            400
          );
        }
        filteredData.thumbnail = req.files[1].path // Use second file as thumbnail for video
      }
    }
    catch (err) {
      // Handle validation/filtering errors
      console.log(err);
      return generalResponse(
        res,
        { success: false },
        err.message,
        false,
        true
      );
    }

    // Create story in DB with provided data
    const story = await createStory({
      ...filteredData,
      user_id: user_id,                // Ensure correct user_id
      media: req.files[0].path,        // File path for media (image/video)
    })

    // If story created successfully
    if (story) {
      // Process tagged users (if any)
      const tagged = req.body.tagged
      for (const userId in tagged) {
        const isUser = await getUser({ user_id: userId })
        if (isUser) {
          // Add userId to tagged list if user exists
          story.tagged = [...story.tagged, userId];
        }
      }

      // Save updated story with tags
      await story.save();

      // Return success response
      return generalResponse(
        res,
        story.toJSON(),
        "Story Uploaded Successfully!",
        true,
        201
      )
    }

    // If story creation failed
    return generalResponse(
      res,
      {},
      "Failed to Upload Story",
      false,
      true,
      500
    )

  }
  catch (error) {
    // Catch any unexpected runtime errors
    console.error("Error in uploading story", error);
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
  uploadStory,
};