const { Report,User, Chat, Report_type, Sequelize } = require("../../../models");
const getReports = async () => {
    try {
        const reports = await Report.findAll();
        return reports;
    } catch (error) {
        console.log(error);
        throw new Error("Could not retrieve reports");
    }
};

async function getReport(reprtPayload) {
    // Perform the query with the "OR" conditions
    const is_report = await Report.findOne({
        where: {
            reprtPayload
        }
    });
    return is_report;
}

async function createReportUser(reportPayload) {
    try {
        
        const newReportUser = await Report.create(reportPayload);
        return newReportUser;
    } catch (error) {
        console.error('Error creating report user:', error);
        throw error;
    }
}
async function updateReportUser(reportPayload, condition) {
    try {
        const newReportUser = await Report.update(reportPayload, { where: condition });
        return newReportUser;
    } catch (error) {
        console.error('Error updating report User:', error);
        throw error;
    }
}

async function getReportedUsersService(page = 1, size = 10, type='user') {
  try {
    const limit = size;
    const offset = (page - 1) * size;

    const reportedUsers = await Report.findAll({
      attributes: [
        "report_to_user",
        "report_to_group",
        [
          Sequelize.fn("COUNT", Sequelize.col("Report.report_id")),
          "report_count",
        ],
      ],
      where: {
        ...(type === "user" && {report_to_group: null}), 
        ...(type === "group" && {report_to_user: null,})
      },
      include: [
        {
          model: User,
          as: "reported_user",
          attributes: ["user_id", "user_name", "profile_pic", 'blocked_by_admin'],
        },
        {
          model: Chat,
          as: "reported_group",
          attributes: ["chat_id", "group_name", "group_icon", 'is_group_blocked'],
        }
      ],
      group: [
        "reported_user.user_id",
        "reported_group.chat_id",
        "Report.report_to_user",
        "Report.report_to_group",
      ],
      limit,
      offset,
    });


    let total = await Report.count({
      group: ["Report.report_to_user", "Report.report_to_group"],
      where: {
        ...(type === "user" && { report_to_group: null }),
        ...(type === "group" && { report_to_user: null }),
      },
    
    });
     total = total.length 
    return {
      pagination: {
        total_pages: Math.ceil(total / size),
        page: page,
        pageSize: size,
        total: total,
      },
      data: reportedUsers,
    };
  } catch (error) {
    console.error("Error retrieving reported users:", error);
    throw error;
  }
}

async function getReportDetailsService(id, type) {
  try {
    const reportDetails = await Report.findAll({
      where: {
        ...(type === "user" && { report_to_user: id }),
        ...(type === "group" && { report_to_group: id }),
      },
      include: [
        {
          model: User,
          as: "reporter",
          attributes: ["user_id", "user_name", "profile_pic"],
        },
        {
          model: User,
          as: "reported_user",
          attributes: ["user_id", "user_name", "profile_pic"],
        },
        {
          model: Chat,
          as: "reported_group",
          attributes: ["chat_id", "group_name", "group_icon"],
        },
        {
          model: Report_type,
          as: "Report_type",
          attributes: ["report_type_id", "report_text"],
        },
      ],
    });

    return reportDetails;
  } catch (error) {
    console.log(error);
    throw new Error("Could not retrieve report types");
  }
}

module.exports = {
  getReports,
  getReportedUsersService,
  createReportUser,
  updateReportUser,
  getReport,
  getReportDetailsService,
};