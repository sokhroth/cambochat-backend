const { Config, User, Chat } = require("../../../models");

async function createConfig(configPayload) {
    try {
        const newConfig = await Config.create(configPayload);
        return newConfig;
    } catch (error) {
        console.error('Error in creating config:', error);
        throw error;
    }
}

async function getConfig() {
    try {
        const config = await Config.findAll();
        return config[0];
    } catch (error) {
        console.error('Error in getting config:', error);
        throw error;
    }
}

async function updateConfig(configPayload, where) {
    try {
        const updatedConfig = await Config.update(configPayload, {
          where: where,
          returning: true,
        });
        return updatedConfig[1][0];
    } catch (error) {
        console.error('Error in updating config:', error);
        throw error;
    }
}


module.exports = {
    createConfig,
    getConfig,
    updateConfig
}
