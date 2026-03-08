const config_service = require("../../service/common/config.service");
const { generalResponse } = require("../../helper/response.helper");
const fs = require("fs");
const path = require("path");

async function getConfig(req, res) {
  try {
    // Call the service layer to retrieve the configuration from database or source
    let config = await config_service.getConfig();

    // If no configuration is found, send a 404 response
    if (!config) {
      return generalResponse(
        res,
        {},
        "Config not found",
        false,
        true,
        404
      );
    }

    // Convert to plain object (if using Sequelize or similar)
    config = config.toJSON ? config.toJSON() : { ...config };

    const filePath = path.join(process.cwd(), "validatedToken.txt");

    let masked = null;
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf8").trim();

      if (content.length >= 8) {
        const first4 = content.substring(0, 4);
        const last4 = content.substring(content.length - 4);
        masked = "*******************";
      }
    }

    // Attach masked content to config
    config.masked_purchase_code = masked;

    // If config is found, send it back with success response
    return generalResponse(
      res,
      config,
      "Config found",
      true,
      false,
      200
    );
  } catch (error) {
    console.error("Error in fetching Config", error);

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
  getConfig,
};
