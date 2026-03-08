const { generalResponse } = require("../../helper/response.helper");
const updateFieldsFilter = require("../../helper/updateField.helper");
const { getChat } = require("../../service/repository/Chat.service");
const {
  createReportUser,
  getReportedUsersService,
  getReportDetailsService,
} = require("../../service/repository/Report.service");
const {
  getReport_type,
} = require("../../service/repository/Report_types.service");
const { getUser } = require("../../service/repository/user.service");

async function uploadReportUser(req, res) {
  try {
    // Extract reporter ID (either user or admin)
    const report_by = req.authData.user_id || req.authData.admin_id;
    // ID of the user being reported
    const report_to_user = req.body.user_id;
    // ID of the group being reported
    const report_to_group = req.body.chat_id;

    let allowedUpdateFieldsMandatory = [];
    let filteredData;

    // Validate presence of reporter and target (either user or group)
    if (!report_by && (!report_to_user || !report_to_group)) {
      return generalResponse(
        res,
        {},
        "Kindly select a user or group to report",
        false,
        true,
        402
      );
    }

    // Choose required fields depending on report type
    if (req.body?.report_type == "others") {
      allowedUpdateFieldsMandatory = ["report_type", "report_text"];
    } else {
      allowedUpdateFieldsMandatory = ["report_type_id"];
    }

    // Validate and filter incoming fields
    try {
      filteredData = updateFieldsFilter(
        req.body,
        allowedUpdateFieldsMandatory,
        true
      );
    } catch (err) {
      console.log(err);
      return generalResponse(
        res,
        { success: false },
        "Data is Missing",
        false,
        true,
        402
      );
    }
    
    // If report_type_id is provided, check whether it's valid
    if (filteredData?.report_type_id) {
      const isReporttype = await getReport_type({
        report_type_id: parseInt(filteredData.report_type_id),
      });
      if (!isReporttype) {
        return generalResponse(
          res,
          {},
          "Report type Not found",
          false,
          true,
          404
        );
      }
    }

    // Add reporter and target info to the filteredData
    filteredData.report_by = report_by;
    filteredData.report_to_user = report_to_user;
    filteredData.report_to_group = report_to_group;

    // Validate reporter existence
    const isReporter = await getUser({ user_id: report_by });
    let isUser, isChat;

    // Validate whether reported target exists (either user or group chat)
    if (filteredData.report_to_group) {
      isChat = await getChat({ chat_id: report_to_group, chat_type: "group" });
    } else {
      isUser = await getUser({ user_id: report_to_user });
    }

    if (!isReporter || (!isUser && !isChat)) {
      return generalResponse(
        res,
        {},
        "User and chat Not found",
        false,
        true,
        404
      );
    }

    // Create new report record
    const newReport = await createReportUser(filteredData);

    if (newReport) {
      return generalResponse(
        res,
        newReport,
        "Report added successfully",
        true,
        false
      );
    }

    // If creation fails
    return generalResponse(
      res,
      {},
      "Failed to Upload post",
      ture, // ⚠️ Typo here: should be true
      true,
      401
    );
  } catch (error) {
    console.error("Error in adding Report User", error);
    return generalResponse(
      res,
      { success: false },
      "Something went wrong while Reporting user!",
      false,
      true
    );
  }
}

async function getReportedUsers(req, res) {
  try {
    // Fetch reported users with pagination
    const reportedUsers = await getReportedUsersService(
      req.body.page,
      req.body.size,
      req.body.type
    );

    // If no reported users found
    if (!reportedUsers || reportedUsers.length === 0) {
      return generalResponse(
        res,
        {},
        "No reported users found",
        false,
        true,
        404
      );
    }

    // Success response with reported users
    return generalResponse(
      res,
      reportedUsers,
      "Reported users retrieved successfully",
      true,
      false
    );
  } catch (error) {
    console.error("Error in retrieving reported users", error);
    return generalResponse(
      res,
      { success: false },
      "Something went wrong while retrieving reported users",
      false,
      true
    );
  }
}

async function getReportDetails(req, res) {
  try {
    const reportDetails = await getReportDetailsService(req.body.id, req.body.type);
    return generalResponse(res, reportDetails, "Report details", true, false);
  } catch (error) {
    console.error("Error in retrieving report details", error);
    return generalResponse(
      res,
      { success: false },
      "Something went wrong while retrieving report details",
      false,
      true
    );
  }
}

module.exports = {
  uploadReportUser,
  getReportedUsers,
  getReportDetails
};
