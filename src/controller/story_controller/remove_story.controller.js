const { generalResponse } = require("../../helper/response.helper");
const {
  getStory,
} = require("../../service/repository/Story.service");
const { getUser } = require("../../service/repository/user.service");
const updateFieldsFilter = require("../../helper/updateField.helper");

// Controller function to remove a story posted by the current user
async function removeStory(req, res) {
  try {
      // Get the current logged-in user ID from request auth
      const user_id = req.authData.user_id

      // Check if user exists in DB
      const isUser = await getUser({ user_id: user_id })
      if (!isUser) {
          // If user not found, return 404 response
          return generalResponse(
              res,
              {},
              "User Not found",
              false,
              true,
              404
          )
      }

      // Define required field for this operation
      allowedUpdateFieldsMandatory = ['story_id']
      try {
          // Validate and filter request body fields
          filteredData = updateFieldsFilter(req.body, allowedUpdateFieldsMandatory, true);
      }
      catch (err) {
          // Return error if field validation fails
          console.log(err);
          return generalResponse(
              res,
              { success: false },
              err.message,
              false,
              true
          );
      }

      // Fetch story details from DB using story_id
      const story = await getStory({
          story_id: filteredData.story_id
      });

      if (story) {
          // Ensure the current user is the owner of the story
          if (story.dataValues.user_id != user_id) {
              return generalResponse(
                  res,
                  {},
                  "You are not the owner of this story.",
                  false,
                  true
              )
          }

          // Delete the story from DB
          await story.destroy();
          return generalResponse(
              res,
              {},
              "Story Deleted Successfully!",
              true,
              true
          )
      }

      // If story not found or deletion failed
      return generalResponse(
          res,
          {},
          "Failed to Delete Story",
          false,
          true,
          500
      )

  }
  catch (error) {
      // Catch any unexpected errors
      console.error("Error in uploading story", error);
      return generalResponse(
          res,
          { success: false },
          "Something went wrong while uploading story!",
          false,
          true,
          500
      );
  }
}


module.exports = {
  removeStory,
};