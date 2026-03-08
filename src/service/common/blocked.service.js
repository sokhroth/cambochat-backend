const { Block } = require("../../../models");

async function isBlocked(user_id, blocked_id) {
    try {
        const isBlocked = await Block.findOne({ where: { user_id, blocked_id } });
        return isBlocked;
    } catch (error) {
        console.error('Error in blocking:', error);
        throw error;
    }
}

module.exports = {
    isBlocked
}