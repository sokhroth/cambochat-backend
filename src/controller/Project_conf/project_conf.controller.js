const { generalResponse } = require("../../helper/response.helper");
const { getProject_Conf } = require("../../service/repository/Project_conf.service");

async function findConf(req, res) {
    try {
        // Fetch project configuration records
        const project_conf = await getProject_Conf({}, {});

        // If no records found, return empty response with "Data Not Available"
        if (project_conf?.Records?.length <= 0) {
            return generalResponse(
                res,
                {
                    Records: [],
                    Pagination: {},
                },
                "Data Not Available",
                true,
                true
            );
        } 
        // If records are found, return them
        else {
            return generalResponse(
                res,
                project_conf,
                "Conf Found",
                true,
                false,
            );
        }
    } catch (error) {
        // Log error and return generic error response
        console.error("Error in Findng Project Conf", error);
        return generalResponse(
            res,
            {},
            "Something went wrong while Finding Project Conf!",
            false,
            true
        );
    }
}

module.exports = {
    findConf
};  
