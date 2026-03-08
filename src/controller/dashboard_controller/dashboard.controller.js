const { User, Chat, Call } = require('../../../models');
const { generalResponse } = require('../../helper/response.helper');
const { Op, fn, col } = require('sequelize');
const updateFieldsFilter = require('../../helper/updateField.helper');

async function getUsersCntByMonthsYears(req, res) {
  // Query to count users grouped by month
  const usersByMonth = await User.findAll({
    attributes: [
      [fn("date_trunc", "month", col("createdAt")), "month"], // truncate createdAt to month
      [fn("COUNT", col("user_id")), "count"], // count number of users
    ],
    group: [fn("date_trunc", "month", col("createdAt"))], // group results by month
    order: [[fn("date_trunc", "month", col("createdAt")), "ASC"]], // sort by month ascending
    raw: true,
  });

  // Query to count users grouped by year
  const usersByYear = await User.findAll({
    attributes: [
      [fn("date_trunc", "year", col("createdAt")), "year"], // truncate createdAt to year
      [fn("COUNT", col("user_id")), "count"],
    ],
    group: [fn("date_trunc", "year", col("createdAt"))],
    order: [[fn("date_trunc", "year", col("createdAt")), "ASC"]],
    raw: true,
  });

  // Step 1: Build array of past 7 days with date and weekday name
  const today = new Date();
  const past7Days = [...Array(7)]
    .map((_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - i); // go back i days from today
      return {
        date: d.toISOString().split("T")[0], // format YYYY-MM-DD
        dayName: d.toLocaleDateString("en-US", { weekday: "long" }), // weekday name
      };
    })
    .reverse(); // keep order oldest → newest

  // Step 2: Calculate one week ago date for filtering
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  // Query to count users grouped by week within last 7 days
  const usersByWeek = await User.findAll({
    attributes: [
      [fn("date_trunc", "week", col("createdAt")), "week"],
      [fn("COUNT", col("user_id")), "count"],
    ],
    where: {
      createdAt: {
        [Op.gte]: oneWeekAgo, // only last 7 days
      },
    },
    group: [fn("date_trunc", "week", col("createdAt"))],
    order: [[fn("date_trunc", "week", col("createdAt")), "ASC"]],
    raw: true,
  });

  // Step 3: Map counts into daily structure for past 7 days
  const usersByDay = past7Days.map(({ date, dayName }) => {
    const match = usersByWeek.find(
      (entry) => entry.week.toISOString().split("T")[0] === date
    );
    return {
      day: dayName,
      count: match ? parseInt(match.count, 10) : 0,
    };
  });

  // Format monthly results with year + month numbers
  const formatted = usersByMonth.map((entry) => {
    const date = new Date(entry.month);
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      count: parseInt(entry.count, 10),
    };
  });

  // Return based on filter parameter if provided
  if (req.data?.filter_by) {
    switch (req.data["filter_by"]) {
      case "month":
        return generalResponse(
          res,
          { newUsersByMonth: formatted },
          "Users.",
          true,
          false
        );
      case "year":
        return generalResponse(
          res,
          { newUsersByYear: usersByYear },
          "Users.",
          true,
          false
        );
      case "week":
        return generalResponse(
          res,
          { newUsersByWeek: usersByWeek },
          "Users.",
          true,
          false
        );
      case "day":
        return generalResponse(
          res,
          { newUsersByDay: usersByDay },
          "Users.",
          true,
          false
        );
    }
  }

  // Default return: send all breakdowns
  return generalResponse(
    res,
    {
      newUsersByYear: usersByYear,
      newUsersByMonth: formatted,
      usersByWeek,
      newUsersByDay: usersByDay,
    },
    "Users.",
    true,
    false
  );
}

async function getUsersCntByLoginType(req, res) {
  try {
    let filteredData;
    try {
      // Extract only login_type and login_platform filters from request body
      filteredData = updateFieldsFilter(
        req.body,
        ["login_type", "login_platform"],
        false
      );
    } catch (error) {
      return generalResponse(res, {}, error.message, false, true, 400);
    }

    // Query users filtered by login_type and login_platform (if provided)
    const users = await User.findAndCountAll({
      where: {
        ...(filteredData.login_type
          ? { login_type: filteredData.login_type }
          : {}),
        ...(filteredData.login_platform
          ? {
              platforms: { [Op.contains]: [filteredData.login_platform] }, // array contains check
            }
          : {}),
      },
    });

    return generalResponse(
      res,
      users.count,
      "Data returned successfully.",
      true,
      false,
      200
    );
  } catch (error) {
    return generalResponse(res, {}, error.message, false, false, 400);
  }
}

async function getGroupsCountByMonthsYears(req, res) {
  try {
    const groupFilter = { chat_type: "Group" }; // filter only group chats

    // Query to count groups by month
    const groupsByMonth = await Chat.findAll({
      attributes: [
        [fn("date_trunc", "month", col("createdAt")), "month"],
        [fn("COUNT", col("chat_id")), "count"],
      ],
      where: groupFilter,
      group: [fn("date_trunc", "month", col("createdAt"))],
      order: [[fn("date_trunc", "month", col("createdAt")), "ASC"]],
      raw: true,
    });

    // Query to count groups by year
    const groupsByYear = await Chat.findAll({
      attributes: [
        [fn("date_trunc", "year", col("createdAt")), "year"],
        [fn("COUNT", col("chat_id")), "count"],
      ],
      where: groupFilter,
      group: [fn("date_trunc", "year", col("createdAt"))],
      order: [[fn("date_trunc", "year", col("createdAt")), "ASC"]],
      raw: true,
    });

    // Build past 7 days
    const today = new Date();
    const past7Days = [...Array(7)]
      .map((_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        return {
          date: d.toISOString().split("T")[0],
          dayName: d.toLocaleDateString("en-US", { weekday: "long" }),
        };
      })
      .reverse();

    // One week ago cutoff
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // Query groups by week
    const groupsByWeek = await Chat.findAll({
      attributes: [
        [fn("date_trunc", "week", col("createdAt")), "week"],
        [fn("COUNT", col("chat_id")), "count"],
      ],
      where: { ...groupFilter, createdAt: { [Op.gte]: oneWeekAgo } },
      group: [fn("date_trunc", "week", col("createdAt"))],
      order: [[fn("date_trunc", "week", col("createdAt")), "ASC"]],
      raw: true,
    });

    // Format monthly results into year+month
    const formattedGroupsByMonth = groupsByMonth.map((entry) => {
      const date = new Date(entry.month);
      return {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        count: parseInt(entry.count, 10),
      };
    });

    // Map groups to days
    const groupsByDay = past7Days.map(({ date, dayName }) => {
      const match = groupsByWeek.find(
        (entry) => entry.week.toISOString().split("T")[0] === date
      );
      return {
        day: dayName,
        count: match ? parseInt(match.count, 10) : 0,
      };
    });

    // Return based on filter
    if (req.data?.filter_by) {
      switch (req.data["filter_by"]) {
        case "year":
          return generalResponse(
            res,
            { newGroupsByYear: groupsByYear },
            "Users.",
            true,
            false
          );
        case "month":
          return generalResponse(
            res,
            { newGroupsByMonth: formattedGroupsByMonth },
            "Users.",
            true,
            false
          );
        case "week":
          return generalResponse(
            res,
            { newGroupsByWeek: groupsByWeek },
            "Users.",
            true,
            false
          );
        case "day":
          return generalResponse(
            res,
            { newGroupsByDay: groupsByDay },
            "Users.",
            true,
            false
          );
      }
    }

    // Default return: send all breakdowns
    return generalResponse(
      res,
      {
        newGroupsByYear: groupsByYear,
        newGroupsByMonth: formattedGroupsByMonth,
        newGroupsByWeek: groupsByWeek,
        newGroupsByDay: groupsByDay,
      },
      "Users.",
      true,
      false
    );
  } catch (error) {
    return generalResponse(res, {}, error.message, false, false, 400);
  }
}

async function getCallsCount(req, res) {
  try {
    // Query calls grouped by month + call type
    const callsByMonth = await Call.findAll({
      attributes: [
        [fn("date_trunc", "month", col("createdAt")), "month"],
        "call_type",
        [fn("COUNT", col("call_id")), "count"],
      ],
      group: [fn("date_trunc", "month", col("createdAt")), "call_type"],
      order: [[fn("date_trunc", "month", col("createdAt")), "ASC"]],
      raw: true,
    });

    // Query calls grouped by year + call type
    const callsByYear = await Call.findAll({
      attributes: [
        [fn("date_trunc", "year", col("createdAt")), "year"],
        "call_type",
        [fn("COUNT", col("call_id")), "count"],
      ],
      group: [fn("date_trunc", "year", col("createdAt")), "call_type"],
      order: [[fn("date_trunc", "year", col("createdAt")), "ASC"]],
      raw: true,
    });

    // Build past 7 days list
    const today = new Date();
    const past7Days = [...Array(7)]
      .map((_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        return {
          date: d.toISOString().split("T")[0],
          dayName: d.toLocaleDateString("en-US", { weekday: "long" }),
        };
      })
      .reverse();

    // One week ago cutoff
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // Query calls grouped by week + call type (within last week)
    const callsByWeek = await Call.findAll({
      attributes: [
        [fn("date_trunc", "week", col("createdAt")), "week"],
        "call_type",
        [fn("COUNT", col("call_id")), "count"],
      ],
      where: { createdAt: { [Op.gte]: oneWeekAgo } },
      group: [fn("date_trunc", "week", col("createdAt")), "call_type"],
      order: [[fn("date_trunc", "week", col("createdAt")), "ASC"]],
      raw: true,
    });

    // Format monthly calls with year + month + type
    const formattedCallsByMonth = callsByMonth.map((entry) => {
      const date = new Date(entry.month);
      return {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        call_type: entry.call_type,
        count: parseInt(entry.count, 10),
      };
    });

    // Build calls by day (audio + video separately)
    const callsByDay = [];
    for (const { date, dayName } of past7Days) {
      // Filter week entries matching this date
      const entryForDate = callsByWeek.filter(
        (entry) => new Date(entry.week).toISOString().split("T")[0] === date
      );

      const audioEntry = entryForDate.find((e) => e.call_type === "audio");
      const videoEntry = entryForDate.find((e) => e.call_type === "video");

      callsByDay.push({
        day: dayName,
        audio: audioEntry ? parseInt(audioEntry.count, 10) : 0,
        video: videoEntry ? parseInt(videoEntry.count, 10) : 0,
      });
    }

    // Return filtered results if requested
    if (req.data?.filter_by) {
      switch (req.data["filter_by"]) {
        case "year":
          return generalResponse(
            res,
            { callsByYear: callsByYear },
            "Calls grouped by year and call type.",
            true,
            false
          );
        case "month":
          return generalResponse(
            res,
            { callsByMonth: formattedCallsByMonth },
            "Calls grouped by month and call type.",
            true,
            false
          );
        // case 'week':
        //     return generalResponse(res, { callsByWeek: callsByWeek }, 'Calls grouped by week and call type.', true, false);
        case "day":
          return generalResponse(
            res,
            { callsByDay: callsByDay },
            "Calls grouped by last 7 days and call type.",
            true,
            false
          );
      }
    }

    // Default return: all breakdowns
    return generalResponse(
      res,
      {
        newCallsByYear: callsByYear,
        newCallsByMonth: formattedCallsByMonth,
        /* newCallsByWeek: callsByWeek, */ newCallsByDay: callsByDay,
      },
      "Call counts retrieved successfully.",
      true,
      false
    );
  } catch (error) {
    return generalResponse(res, {}, error.message, false, false, 400);
  }
}


module.exports = {
    getUsersCntByMonthsYears,
    getUsersCntByLoginType,
    getGroupsCountByMonthsYears,
    getCallsCount
}