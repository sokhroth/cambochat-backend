const axios = require("axios");
/**
 * Translates text using the external FastAPI translation API.
 * @param {Object} requestData - The data to send to the translation API.
 * @returns {Promise<string>} - Returns the translated text or throws an error.
 */
async function translateText(requestData) {
    const apiUrl = "http://62.72.36.245:3692/translate/";

    try {
        const response = await axios.post(apiUrl, requestData);
        return response.data.translated_data;
    } catch (error) {
        console.error("Translation API error:", error.message);
        throw new Error("Translation failed");
    }
}

async function getWordTranslation(terget_language, word, key_id) {
    try {

        const requestData = {
            json_data: { [key_id]: word },
            target_language: terget_language,
        };
        const res = await translateText(requestData)
        return res
    } catch (error) {
        console.error('Error fetching Language Translation:', error);
        throw error;

    }
}
module.exports = {
    translateText,
    getWordTranslation
}