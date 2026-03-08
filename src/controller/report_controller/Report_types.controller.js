const { generalResponse } = require("../../helper/response.helper");
const updateFieldsFilter = require("../../helper/updateField.helper");
const {
  createReportTypes,
  getReport_types,
  updateReportTypes,
} = require("../../service/repository/Report_types.service");
const { getUser, isAdmin } = require("../../service/repository/user.service");

async function uploadReportTypes(req, res) {
    try {
        const user_id = req.authData.user_id;
        let allowedUpdateFieldsMandatory = ['report_text', 'report_for'];
        let filteredData;

        try {
            // Filter request body to only allow mandatory fields
            filteredData = updateFieldsFilter(req.body, allowedUpdateFieldsMandatory, true);
        }
        catch (err) {
            // If required fields are missing, return error
            return generalResponse(
                res,
                { success: false },
                "Data is Missing",
                false,
                true
            );
        }

        // Check if the user has admin privileges
        const is_admin = isAdmin(user_id);
        if (!is_admin) {
            return generalResponse(
                res,
                {},
                "User Not authorized",
                false,
                true,
                403
            );
        }

        // Create a new report type
        const newReporttypes = createReportTypes(filteredData);

        // If successfully created, return success response
        if (newReporttypes) {
            return generalResponse(
                res,
                {},
                "Report added successfully",
                true,
                true,
                201
            );
        }

        // Fallback if creation fails
        return generalResponse(
            res,
            {},
            "Failed to Upload post",
            true,   // ⚠️ BUG: originally written as "ture"
            true,
            500
        );

    } catch (error) {
        // Handle unexpected errors
        console.error("Error in adding Report types", error);
        return generalResponse(
            res,
            { success: false },
            "Something went wrong while uploading Report types!",
            false,
            true
        );
    }
}

async function showReportTypes(req, res) {
    try {
            const ReportTypes = await getReport_types();

            // If no report types found
            if (ReportTypes?.length <= 0) {
                return generalResponse(
                    res,
                    {},
                    "Socials not found",
                    true,
                    true,
                    
                );
            }

            // Return found report types
            return generalResponse(
                res,
                { ReportTypes },
                "Reports Found",
                true,
                false,
                200
            );

    } catch (error) {
        // Catch unexpected errors
        console.error("Error in finding report types", error);
        return generalResponse(
            res,
            { success: false },
            "Something went wrong while finding report types!",
            false,
            true,
            500
        );
    }
}

async function deleteReportType(req, res) {
    try {
        // Soft delete report type by marking "is_deleted = true"
        await updateReportTypes(
            { is_deleted: req.body.delete },
            { report_type_id: req.body.report_type_id }
        );

        return generalResponse(
            res,
            { success: true },
            "Report type deleted successfully!",
            true,
            true,
            200
        );
    } catch (error) {
        // Handle deletion failure
        return generalResponse(
            res,
            { success: false },
            "Something went wrong while deleting report type!",
            false,
            true,
            500
        );
    }
}

module.exports = {
    showReportTypes,
    uploadReportTypes,
    deleteReportType
};
