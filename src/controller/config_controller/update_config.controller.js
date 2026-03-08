const config_service = require("../../service/common/config.service");
const { generalResponse } = require("../../helper/response.helper");
const updateFieldsFilter = require("../../helper/updateField.helper");
const updateEnvVariable = require("../../service/common/env.service");
const fs = require("fs");
const path = require("path");
const { getServerIP, getMacAddress } = require("../../service/common/serverDetails");
const { default: axios } = require("axios");
async function updateConfig(req, res) {
    try {
        let filteredData;
        try {
            // Filter incoming request body to allow only specific fields to be updated
            filteredData = updateFieldsFilter(req.body, [
                "phone_authentication",
                "email_authentication",
                "maximum_members_in_group",
                "user_name_flow",
                "contact_flow",
                "one_signal_app_id",
                "one_signal_api_key",
                "android_channel_id",
                "app_name",
                "app_email",
                "app_text",
                "app_primary_color",
                "app_secondary_color",
                "app_ios_link",
                "app_android_link",
                "app_tell_a_friend_text",
                "twilio_account_sid",
                "twilio_auth_token",
                "twilio_phone_number",
                "is_twilio_enabled",
                "is_msg91_enabled",
                "msg91_sender_id",
                "msg91_api_key",
                "msg91_template_id",
                "email_service",
                "smtp_host",
                "email",
                "password",
                "email_title",
                "copyright_text",
                "privacy_policy",
                "terms_and_conditions",
            ], false);
        }
        catch (err) {
            // If invalid fields or filtering error occurs, return error response
            return generalResponse(
                res,
                {},
                err.message,
                false,
                true
            );
        }

        const envUpdateKeys = [
            "twilio_account_sid",
            "twilio_auth_token",
            "twilio_phone_number",
            "is_twilio_enabled",
            "is_msg91_enabled",
            "msg91_sender_id",
            "android_channel_id",
            "msg91_api_key",
            "msg91_template_id",
            "one_signal_app_id",
            "one_signal_api_key",
        ]


        // Attach uploaded file paths (if provided) to the filtered data
        if (req.app_logo_light?.length > 0) {
            filteredData.app_logo_light = req.app_logo_light[0].path;
        }
        if (req.app_logo_dark?.length > 0) {
            filteredData.app_logo_dark = req.app_logo_dark[0].path;
        }
        if (req.splash_image?.length > 0) {
            filteredData.splash_image = req.splash_image[0].path;
        }
        if (req.web_logo_light?.length > 0) {
            filteredData.web_logo_light = req.web_logo_light[0].path;
        }
        if (req.web_logo_dark?.length > 0) {
            filteredData.web_logo_dark = req.web_logo_dark[0].path;
        }

        // Fetch current config from DB
        let config = await config_service.getConfig();

        // Update config in DB with filtered data using config_id as identifier
        config = await config_service.updateConfig(filteredData, { config_id: config.config_id });

        // If config does not exist, return 404
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

        generalResponse(
            res,
            config,
            "Config updated",
            true,
            false,
            200
        );
        // (Optional) Update .env file with new configuration values (not implemented here)
        for (const [key, value] of Object.entries(filteredData)) {
            if (envUpdateKeys.includes(key) && value !== undefined) {
                updateEnvVariable(key, value);
            }
        }

        return
        // Return success response with updated config
    }
    catch (error) {
        // Log unexpected error and return 500 response
        console.error("Error in updating Config", error);
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

async function deactivate(req, res) {

    try {
        const filePath = path.join(process.cwd(), "validatedToken.txt");

        if (!fs.existsSync(filePath)) {
            return generalResponse(res, {}, "validatedToken.txt not found", false, true, 404);
        }

        // Read token directly from validatedToken.txt
        const token = fs.readFileSync(filePath, "utf8").trim();

        // Prepare data for third-party API
        const requestData = {
            server_ip: getServerIP(),
            mac_address: getMacAddress(),
            token: token,
        };

        // Send request to third-party API
        const apiResponse = await axios.post(
            "http://62.72.36.245:1142/de-activate",
            requestData,
            {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer YOUR_API_TOKEN`, // Replace with actual token if needed
                },
            }
        );

        if (apiResponse?.data?.success) {
            // Delete the validatedToken file only if API call succeeded
            fs.unlinkSync(filePath);

            return generalResponse(res, {}, apiResponse.data.message, true, false, 200);
        }

        // API call failed
        return generalResponse(res, {}, apiResponse?.data?.message || "Deactivation failed", false, true, 200);
    } catch (err) {
        console.error(err);
        return generalResponse(res, {}, err.message || "Error in Deactivation", false, true, 500);
    }
}



module.exports = {
    updateConfig,
    deactivate
};
