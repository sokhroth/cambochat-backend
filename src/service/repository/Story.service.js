const { Story } = require("../../../models");

const createStory = async (storyPayload) => {
    try {
        const newStory = await Story.create(storyPayload);
        return newStory;
    } catch (error) {
        console.error('Error in Creating Story.', error);
        throw error;
    }
}
const deleteStory = async (storyPayload) => {
    try {
        const story = await Story.destroy({ where: storyPayload });
        return story;
    } catch (error) {
        console.error('Error in Deleting Story.', error);
        throw error;
    }
}
const getStory = async (storyPayload, associations = []) => {
    try {
        const story = await Story.findOne({ where: storyPayload, include: associations });
        return story;
    } catch (error) {
        console.error('Error in Creating Story.', error);
        throw error;
    }
}

const updateStory = async (data, where) => {
    try {
        const story = await Story.update(data, { where: where, returning: true });
        return story[1][0];
    } catch (error) {
        console.error('Error in Creating Story.', error);
        throw error;
    }
}

const getUserStories = async (storyPayload, associations = []) => {
    try {
        const story = await Story.findAll({ where: storyPayload, include: associations });
        return story;
    } catch (error) {
        console.error('Error in Creating Story.', error);
        throw error;
    }
}

module.exports = {
    createStory,
    getStory,
    deleteStory,
    updateStory,
    getUserStories
}