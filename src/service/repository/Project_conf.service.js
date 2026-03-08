const { Op } = require('sequelize');

const { Project_conf, } = require("../../../models");


const getProject_Conf = async (filterPayload = {}, pagination = { page: 1, pageSize: 10 }, attributes = [], excludedUserIds) => {
    try {
        
        // Destructure and ensure proper types for pagination values
        const { page = 1, pageSize = 10 } = pagination;
        const offset = (Number(page) - 1) * Number(pageSize);
        const limit = Number(pageSize);

        // Initialize the where condition object
        const whereCondition = {};
        const include = [];

  

        // if (!filterPayload.user_check) {
        //     include.push({
        //         model: Social,
        //         limit: 3,
        //     });
        // }

        // Use findAndCountAll to retrieve users and count for pagination
        let { rows, count } = await Project_conf.findAndCountAll({
            where: whereCondition,
            attributes: attributes.length ? attributes : undefined, // Ensure all columns are selected if `attributes` is empty
            limit,
            offset,
            include,
            order: [['createdAt', 'DESC']], // Order by most recently created
        });

        // Debug: Check the converted plain objects

        // Prepare the structured response
        return {
            Records: rows,
            Pagination: {
                total_pages: Math.ceil(count / pageSize),
                total_records: Number(count),
                current_page: Number(page),
                records_per_page: Number(pageSize),
            },
        };
    } catch (error) {
        console.error('Error fetching Users:', error);
        throw new Error('Could not retrieve users');
    }
};



module.exports = {
    getProject_Conf,
};