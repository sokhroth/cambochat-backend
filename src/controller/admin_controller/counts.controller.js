const admin_cnts_service = require("../../service/repository/admin_counts.service");
const { generalResponse } = require("../../helper/response.helper");
const { Op } = require("sequelize");

/**
 * 👥 Get total number of users
 */
async function getUsersCounts(req, res) {
  try {
    // ✅ Fetch total user count from service
    const { totalUsers, usersFromStartToOneMonthAgo } = await admin_cnts_service.getUsersCounts();

    // ✅ Send response
    return generalResponse(res, { totalUsers: totalUsers, usersFromStartToOneMonthAgo: usersFromStartToOneMonthAgo });
  } catch (error) {
    console.error("Error in getUsersCounts:", error);
    return res.status(500).json({ error: "Failed to fetch user counts" });
  }
}

async function getUsersCountCountryWise(req, res) {
  try {
    // ✅ Fetch total user count from service
    const userCounts = await admin_cnts_service.getCntUsersCountryWise();

    // ✅ Send response
    return generalResponse(res, userCounts);
  } catch (error) {
    console.error("Error in getUsersCounts:", error);
    return res.status(500).json({ error: "Failed to fetch user counts" });
  }
}
async function getUsersCountCountryWiselast30mins(req, res) {
  try {
    // ✅ Fetch total user count from service
    const userCounts = await admin_cnts_service.getCntUsersCountryWiseLast30Mins();

    // ✅ Send response
    return generalResponse(res, userCounts);
  } catch (error) {
    console.error("Error in getUsersCounts:", error);
    return res.status(500).json({ error: "Failed to fetch user counts" });
  }
}

/**
 * 👥 Get user counts by login type (phone, email, social)
 */
async function getUsersCntByLoginType(req, res) {
  try {
    // ✅ Fetch counts for each login type
    const phoneUserCounts = await admin_cnts_service.getUsersCounts({
      login_type: "phone",
    });
    const emailUserCounts = await admin_cnts_service.getUsersCounts({
      login_type: "email",
    });
    const socialUserCounts = await admin_cnts_service.getUsersCounts({
      login_type: "social",
    });

    // ✅ Send response
    return generalResponse(res, {
      phone: phoneUserCounts,
      email: emailUserCounts,
      social: socialUserCounts,
    });
  } catch (error) {
    console.error("Error in getUsersCntByLoginType:", error);
    return res
      .status(500)
      .json({ error: "Failed to fetch user counts by login type" });
  }
}

/**
 * 📱 Get user counts by platform (web, android)
 */
async function getUsersListByPlatform(req, res) {
  try {
    // ✅ Count users who logged in via Web
    const webUserCounts = await admin_cnts_service.getUsersCounts({
      platforms: { [Op.contains]: ["web"] },
    });

    // ✅ Count users who logged in via Android
    const androidUserCounts = await admin_cnts_service.getUsersCounts({
      platforms: { [Op.contains]: ["android"] },
    });

     const iosUserCounts = await admin_cnts_service.getUsersCounts({
       platforms: { [Op.contains]: ["ios"] },
     });

    // ✅ Send response
    return generalResponse(res, {
      web: webUserCounts,
      android: androidUserCounts,
      ios: iosUserCounts
    },
      "data Found",
      true,
      true
    );
  } catch (error) {
    console.error("Error in getUsersListByPlatform:", error);
    return res
      .status(500)
      .json({ error: "Failed to fetch user counts by platform" });
  }
}

/**
 * 💬 Get total group chats count
 */
async function getGroupChatsCnt(req, res) {
  try {
    // ✅ Fetch group chat count
    const groupChatsCount = await admin_cnts_service.getGroupChatsCnt();

    // ✅ Send response
    return generalResponse(res, groupChatsCount);
  } catch (error) {
    console.error("Error in getGroupChatsCnt:", error);
    return res.status(500).json({ error: "Failed to fetch group chat counts" });
  }
}

/**
 * 📞 Get total call counts by type (video, audio)
 */
async function getCallsCnt(req, res) {
  try {
    // ✅ Fetch video call count
    const vidoecallsCount = await admin_cnts_service.getCallsCnt({
      call_type: "video",
    });

    // ✅ Fetch audio call count
    const audiocallsCount = await admin_cnts_service.getCallsCnt({
      call_type: "audio",
    });

    // ✅ Structure response
    const callsCount = {
      video: { totalCalls: vidoecallsCount.totalCalls, callsFromStartToOneMonthAgo: vidoecallsCount.callsFromStartToOneMonthAgo },
      audio: { totalCalls: audiocallsCount.totalCalls, callsFromStartToOneMonthAgo: audiocallsCount.callsFromStartToOneMonthAgo },
    };

    return generalResponse(res, callsCount);
  } catch (error) {
    console.error("Error in getCallsCnt:", error);
    return res.status(500).json({ error: "Failed to fetch call counts" });
  }
}

/**
 * 📊 Get yearly data of new users and groups
 */
async function getYearlyDataOfNewUsersAndGrps(req, res) {
  try {
    // 📅 Get year from request
    const year = req.body.year;

    // ✅ Fetch yearly data
    const data = await admin_cnts_service.yearlyDataOfNewUsersAndGrps(year);

    return generalResponse(res, data);
  } catch (error) {
    console.error("Error in getYearlyDataOfNewUsersAndGrps:", error);
    return res
      .status(500)
      .json({ error: "Failed to fetch yearly data of new users and groups" });
  }
}

/**
 * 📅 Get weekly new users count
 */
async function weeklyNewUsers(req, res) {
  try {
    // ⏳ (Optional: start_date & end_date can be passed in req.body)
    const newUsers = await admin_cnts_service.weeklyNewUsers();

    // ✅ Send response
    return generalResponse(res, { newUsers });
  } catch (error) {
    console.error("Error in weeklyNewUsers:", error);
    return res.status(500).json({ error: "Failed to fetch weekly new users" });
  }
}

/**
 * 📞 Get yearly calls data (video + audio trends)
 */
async function yearlyCallsData(req, res) {
  try {
    // 📅 Get year from request
    const year = req.body.year;

    // ✅ Fetch yearly call data
    const data = await admin_cnts_service.yearlyCallsData(year);

    return generalResponse(res, data);
  } catch (error) {
    console.error("Error in yearlyCallsData:", error);
    return res.status(500).json({ error: "Failed to fetch yearly calls data" });
  }
}

async function dailyActiveUserscount(req, res){
  try {
    const { month, year } = req.body;
    const data = await admin_cnts_service.dailyActiveUsersCount(month, year);
    return generalResponse(
      res,
      data,
      "Counts fetched successfully.",
      true,
      false,
      200
    );
  } catch (error) {
    console.error("Error in getYearlyDataOfNewUsersAndGrps:", error);
    return res
      .status(500)
      .json({ error: "Failed to fetch yearly data of new users and groups" });
  }
}

// 📦 Export controller functions
module.exports = {
  getUsersCounts,
  getGroupChatsCnt,
  getCallsCnt,
  getUsersCntByLoginType,
  getUsersListByPlatform,
  getYearlyDataOfNewUsersAndGrps,
  weeklyNewUsers,
  yearlyCallsData,
  getUsersCountCountryWise,
  getUsersCountCountryWiselast30mins,
  dailyActiveUserscount,
};