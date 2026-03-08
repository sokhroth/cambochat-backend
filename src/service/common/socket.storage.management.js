const { Socket } = require("../../../models");
const { getUser, updateUser } = require("../repository/user.service");

async function deleteSocket(socket_id, user_id) {
    try {
        const user = await getUser({ user_id });
        const socket = await updateUser({ socket_ids: [...user.socket_ids.filter(id => id !== socket_id)] }, { user_id });
        return socket;
    }
    catch (err) {
        // throw err;
        console.error(err);
    }
}

module.exports = {
    deleteSocket,
}