const { Op } = require('sequelize');
const { Media, Message, User } = require("../../../models");

async function createMedia(mediaPayload) {
    try {
        const newMedia = await Media.create(mediaPayload);
        return newMedia;
    } catch (error) {
        console.error('Error creating media:', error);
        throw error;
    }
}



async function getMedia(payload, page = 1, pageSize = 10) {
    try {

        const offset = (page - 1) * pageSize;
        const limit = pageSize;

        const media = await Message.findAndCountAll({
            where: {
                ...payload,
            },
            include: [
                {
                    model: User,
                    // as: "sender",
                    attributes: ["user_id", "user_name", "full_name", "profile_pic"]
                }
            ],
            offset,
            limit,
            order: [['createdAt', 'DESC']] // optional: sort by newest
        });
        
        return {
            Records: media.rows,
            pagenation: {
                "total_records": media.count,
                "current_page": page,
                "records_per_page": pageSize,
                "total_pages": Math.ceil(media.count / pageSize)
            }
        };
    } catch (error) {
        console.error('Error fetching media:', error);
        throw error;
    }
}


module.exports = {
    createMedia,
    getMedia
};