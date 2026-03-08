const user_service = require("../service/repository/user.service")
const { User } = require("../../models");
const { Op } = require("sequelize");

async function initialFilter() {
    try {
        const users = await User.findAll({
            where: {
                socket_ids: {
                    [Op.ne]: []
                }
            }
        });
        for (const user of users) {
            user_service.updateUser({ socket_ids: [] }, { user_id: user.dataValues.user_id });

        }
    }
    catch (err) {
        console.log(err);
    }
}

module.exports = {
    initialFilter
}