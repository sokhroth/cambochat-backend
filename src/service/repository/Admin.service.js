const { Op } = require('sequelize');

const { Admin, Chat, User, Block,Call } = require("../../../models");
const { generalResponse } = require('../../helper/response.helper');
// const db = 
// const {Chat, User} = require("../../../models");;


const getAdmins = async (filterPayload = {}, pagination = { page: 1, pageSize: 10 }, attributes = [], excludedUserIds) => {
    try {

        // Destructure and ensure proper types for pagination values
        const { page = 1, pageSize = 10 } = pagination;
        const offset = (Number(page) - 1) * Number(pageSize);
        const limit = Number(pageSize);

        // Initialize the where condition object
        const whereCondition = {};
        const include = [];


        // Dynamically add conditions to the where clause based on the provided filterPayload

        if (filterPayload.email) {
            whereCondition.email = filterPayload.email; // Exact match for email
        }

        if (filterPayload.admin_id) {
            whereCondition.admin_id = filterPayload.admin_id; // Exact match for user ID
        }




        let { rows, count } = await Admin.findAndCountAll({
            where: whereCondition,
            attributes: attributes.length ? attributes : undefined, // Ensure all columns are selected if `attributes` is empty
            limit,
            offset,
            include,
            order: [['createdAt', 'DESC']], // Order by most recently created
        });


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
        console.error('Error fetching Admins:', error);
        throw new Error('Could not retrieve Admins');
    }
};



async function getAdmin(adminPayload) {
    // Create an array to store the conditions for the "OR" query  
    const orConditions = [];

    // Dynamically add conditions based on the provided payload


    if (adminPayload.email) {
        orConditions.push({ email: adminPayload.email });
    }
    if (adminPayload.admin_id) {
        orConditions.push({ admin_id: adminPayload.admin_id });
    }

    if (orConditions.length === 0) {
        return null;
    }
    
    // Perform the query with the "OR" conditions
    const isAdmin = await Admin.findOne({
        where: {
            [Op.or]: orConditions
        }
    });

    return isAdmin;
}



async function updateAdmin(adminPayload, condition) {
    try {
        if (adminPayload?.filteredData) {
            adminPayload = adminPayload.filteredData
        }

        const updatedAdmin = await Admin.update(adminPayload, { where: condition });

        return updatedAdmin;
    } catch (error) {
        console.error('Error updating Admin:', error);
        throw error;
    }
}

const isAdmin = (req, res, next) => {

    if (req.user_type !== "admin") {
        return generalResponse(
            res,
            {},
            "Unauthorized",
            false,
            true,
            401
        );
    }
    next();
};

async function getBlockList(filter, page = 1, pageSize = 10) {
    try {
        if (filter == 'group') {
            offset = (page - 1) * pageSize;
            const blockedGroups = await Block.findAll({
                where:{
                    blocked_chat_id:{
                        [Op.not]:null
                    }
                },
              include: [
                {
                  model: User,
                  as: "blocker",
                  attributes: [
                    "user_name",
                    "first_name",
                    "last_name",
                    "profile_pic",
                    "user_id",
                  ],
                },
                {
                  model: Chat,
                  as: "blocked_chat",
                  attributes:['chat_id', 'group_icon']
                },
              ],
              offset,
              limit: pageSize,
            });

            return {
                Records: blockedGroups,
                Pagination: {
                    total_pages: Math.ceil(blockedGroups.length / pageSize),
                    total_records: blockedGroups.length,
                    current_page: page,
                    records_per_page: pageSize
                }
            };
        }
        else if (filter == 'user') {
            offset = (page - 1) * pageSize;
            const blockedUsers = await Block.findAll({
              where: {
                blocked_id: {
                  [Op.not]: null,
                },
              },
              include: [
                {
                  model: User,
                  as: "blocker",
                  attributes: [
                    "user_name",
                    "first_name",
                    "last_name",
                    "profile_pic",
                    "user_id",
                  ],
                },
                {
                  model: User,
                  as: "blocked",
                  attributes: [
                    "user_name",
                    "first_name",
                    "last_name",
                    "profile_pic",
                    "user_id",
                  ],
                },
              ],
              offset,
              limit: pageSize,
            });

            return {
                Records: blockedUsers,
                Pagination: {
                    total_pages: Math.ceil(blockedUsers.length / pageSize),
                    total_records: blockedUsers.length,
                    current_page: page,
                    records_per_page: pageSize
                }
            };
        }
        else {
            throw new Error('Invalid filter type');
        }
    } catch (error) {
        console.error('Error fetching block list:', error);
        throw new Error('Could not retrieve block list');
    }
}

async function newUserNotifications(page, limit) {
    try {

        const newUsers = await User.findAll({
            where: {
                viewed_by_admin: false,
            },
            order: [["createdAt", "DESC"]],
            attributes: [
                "user_id",
                "mobile_num",
                "user_name",
                "first_name",
                "last_name",
                "profile_pic",
                "createdAt"
            ],
            offset: (page - 1) * limit,
            limit,
        });
        if (newUsers.length > 0) {
          await User.update(
            { viewed_by_admin: true },
            {
              where: {
                user_id: newUsers.map((u) => u.user_id),
              },
            }
          );
        }
        const total = await User.count({
where:{
            viewed_by_admin: false,}
        });

        return {
            newUsers,
            Pagination: {
                total_pages: Math.ceil(total / limit),
                total_records: Number(total),
                current_page: Number(page),
                records_per_page: Number(limit),
            },
        };
    }
    catch (error) {
        throw error
    }
}

async function newNotifications() {
    try {
        const newUsers = await User.findAll({
            where: {
                viewed_by_admin: false,
            },
            order: [["createdAt", "DESC"]],
            attributes: [
                "user_id",
                "mobile_num",
                "user_name",
                "first_name",
                "last_name",
            ],
            limit: 1,
        });
        if (newUsers.length == 1) {
            return true;
        }
        return false
    } catch (error) {
        return error;
    }
}

async function getCalls(payload, include = [], page=1, limit=10) {
  try {
      const call = await Call.findAll({
        where: payload,
        include,
        offset: (page - 1) * limit,
        limit,
      });
      const total = await Call.count({where:payload})
    return {
      call,
      pagination: {
        total_pages: Math.ceil(total / limit),
        total_records: total,
        current_page: page,
        records_per_page: limit,
      },
    };
  } catch (error) {
    console.error("Error in getting call", error);
    throw error;
  }
}
module.exports = {
    getAdmin,
    getAdmins,
    updateAdmin,
    isAdmin,
    getBlockList,
    newUserNotifications,
    newNotifications,
    getCalls
};