/**
 * @param {string} field
 * @param {string} value
 * @returns {string}
 */
const { generalResponse } = require("./response.helper");

const fieldExistsErrorResponse = (res, field, value) => {
    let errorMessage;
    errorMessage = `${field} already exists`;

    return generalResponse(
        res,
        {},
        errorMessage,
        false,
        true,
        409
    );
}

module.exports = {
    fieldExistsErrorResponse
}