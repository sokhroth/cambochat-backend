const { fn, Op, literal, col } = require('sequelize');
const { User, Chat, Call, Sequelize, DailyUsers } = require('../../../models');
const { format } = require("date-fns");

async function getUsersCounts(payload = {}, startDate = null) {
  try {
    // 1. Total users
    const totalUsers = await User.count({
      where: {
        ...payload
      }
    });

    // If no startDate given, fetch the first user's createdAt
    if (!startDate) {
      const firstUser = await User.findOne({
        where: { ...payload },
        order: [["createdAt", "ASC"]], // earliest user
        attributes: ["createdAt"],
      });
      if (firstUser) {
        startDate = firstUser.createdAt;
      } else {
        // No users at all
        return { totalUsers: 0, usersFromStartToOneMonthAgo: 0 };
      }
    }

    // 2. Users created from startDate until 1 month ago
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const usersFromStartToOneMonthAgo = await User.count({
      where: {
        ...payload,
        createdAt: {
          [Op.between]: [startDate, oneMonthAgo],
        },
      },
    });

    return { totalUsers, usersFromStartToOneMonthAgo };
  } catch (error) {
    console.error("Error fetching user counts:", error);
    throw new Error("Failed to fetch user counts");
  }
}


async function getCntUsersCountryWise() {
  try {
    const userCounts = await User.findAll({
      attributes: [
        'country',
        [fn("COUNT", "*"), "count"]
      ],
      where: {
        deleted_at: null,
        blocked_by_admin: false
      },
      group: ['country']
    });
    return userCounts;
  } catch (error) {
    console.error('Error fetching user counts by country:', error);
    throw new Error('Failed to fetch user counts by country');
  }
}

async function getCntUsersCountryWiseLast30Mins() {
  try {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    const userCounts = await User.findAll({
      attributes: [
        "country",
        [fn("COUNT", "*"), "count"],
      ],
      where: {
        deleted_at: null,
        blocked_by_admin: false,
        updatedAt: {
          [Op.gte]: thirtyMinutesAgo,
        },
      },
      group: ["country"],
      raw: true, // so you get plain objects instead of Sequelize instances
    });

    return userCounts;
  } catch (error) {
    console.error("Error fetching recent user counts by country:", error);
    throw new Error("Failed to fetch recent user counts by country");
  }
}
async function getGroupChatsCnt(payload = {}) {
  try {
    // 1. Total group chats
    const totalGroupChats = await Chat.count({
      where: {
        ...payload,
        chat_type: "group",
      },
    });

    // If no startDate given, fetch the first group chat's createdAt
    const firstGroupChat = await Chat.findOne({
      where: {
        ...payload,
        chat_type: "group",
      },
      order: [["createdAt", "ASC"]],
      attributes: ["createdAt"],
    });

    if (!firstGroupChat) {
      return { totalGroupChats: 0, groupChatsFromStartToOneMonthAgo: 0 };
    }

    const startDate = firstGroupChat.createdAt;

    // 2. Group chats from startDate until one month ago
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const groupChatsFromStartToOneMonthAgo = await Chat.count({
      where: {
        ...payload,
        chat_type: "group",
        createdAt: {
          [Op.between]: [startDate, oneMonthAgo],
        },
      },
    });

    return { totalGroupChats, groupChatsFromStartToOneMonthAgo };
  } catch (error) {
    console.error("Error fetching group chat counts:", error);
    throw new Error("Failed to fetch group chat counts");
  }
}

async function getCallsCnt(payload = {}) {
  try {
    // 1. Total calls
    const totalCalls = await Call.count({
      where: {
        ...payload,
      },
    });

    // 2. Find the very first call (for start date)
    const firstCall = await Call.findOne({
      where: { ...payload },
      order: [["createdAt", "ASC"]],
      attributes: ["createdAt"],
    });

    if (!firstCall) {
      return { totalCalls: 0, callsFromStartToOneMonthAgo: 0 };
    }

    const startDate = firstCall.createdAt;

    // 3. Define "one month ago"
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    // 4. Count calls from startDate → oneMonthAgo
    const callsFromStartToOneMonthAgo = await Call.count({
      where: {
        ...payload,
        createdAt: {
          [Op.between]: [startDate, oneMonthAgo],
        },
      },
    });

    return { totalCalls, callsFromStartToOneMonthAgo };
  } catch (error) {
    console.error("Error fetching call counts:", error);
    throw new Error("Failed to fetch call counts");
  }
}

async function yearlyDataOfNewUsersAndGrps(year = 2025) {
  try {
    // Validate and parse year
    if (!year || isNaN(Number(year))) {
      throw new Error(`Invalid year provided: ${year}`);
    }

    const startOfYear = new Date(`${year}-01-01T00:00:00Z`);
    const endOfYear = new Date(`${Number(year) + 1}-01-01T00:00:00Z`);

    const newUsersCount = await User.findAll({
      attributes: [
        [fn("EXTRACT", literal('MONTH FROM "createdAt"')), "month"],
        [fn("COUNT", "*"), "count"],
      ],
      where: {
        createdAt: {
          [Op.between]: [startOfYear, endOfYear],
        },
      },
      group: [literal('EXTRACT(MONTH FROM "createdAt")')],
      order: [literal('EXTRACT(MONTH FROM "createdAt") ASC')],
    });

    const newGroupsCount = await Chat.findAll({
      attributes: [
        [fn("EXTRACT", literal('MONTH FROM "createdAt"')), "month"],
        [fn("COUNT", "*"), "count"],
      ],
      where: {
        chat_type: "group",
        createdAt: {
          [Op.between]: [startOfYear, endOfYear],
        },
      },
      group: [literal('EXTRACT(MONTH FROM "createdAt")')],
      order: [literal('EXTRACT(MONTH FROM "createdAt") ASC')],
    });

    return { newUsersCount, newGroupsCount };
  } catch (error) {
    console.error("Error fetching yearly data:", error.message);
    throw new Error("Failed to fetch yearly data");
  }
}

async function yearlyCallsData(year = 2025) {
  try {
    // Validate and parse year
    if (!year || isNaN(Number(year))) {
      throw new Error(`Invalid year provided: ${year}`);
    }
    const startOfYear = new Date(`${year}-01-01T00:00:00Z`);
    const endOfYear = new Date(`${Number(year) + 1}-01-01T00:00:00Z`);
    const videoCallsCount = await Call.findAll({
      attributes: [
        [fn("EXTRACT", literal('MONTH FROM "createdAt"')), "month"],
        [fn("COUNT", "*"), "count"],
      ],
      where: {
        call_type: "video",
        createdAt: {
          [Op.between]: [startOfYear, endOfYear],
        },
      },
      group: [literal('EXTRACT(MONTH FROM "createdAt")')],
      order: [literal('EXTRACT(MONTH FROM "createdAt") ASC')],
    });
    const audioCallsCount = await Call.findAll({
      attributes: [
        [fn("EXTRACT", literal('MONTH FROM "createdAt"')), "month"],
        [fn("COUNT", "*"), "count"],
      ],
      where: {
        call_type: "audio",
        createdAt: {
          [Op.between]: [startOfYear, endOfYear],
        },
      },
      group: [literal('EXTRACT(MONTH FROM "createdAt")')],
      order: [literal('EXTRACT(MONTH FROM "createdAt") ASC')],
    });

    return { videoCallsCount, audioCallsCount };
  } catch (error) {
    console.error("Error fetching yearly calls data:", error);
    throw new Error("Failed to fetch yearly calls data");
  }
}

async function usersList(page = 1, pageSize = 10, search = '') {
  try {
    const users = await User.findAll({
      order: [["updatedAt", "DESC"]],
      ...(search !== '' && {
        where: {
          user_name: {
            [Op.like]: `%${search}%`
          }
        }
      }),
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });
    const totalUsers = await User.count();
    return {
      users,
      pagination: {
        page: page,
        pageSize: pageSize,
        total: totalUsers,
        total_pages: Math.ceil(totalUsers / pageSize),
      },
    };
  } catch (error) {
    console.error("Error in fetching users:", error);
    throw error;
  }
}

// async function getGroupChats(page = 1, pageSize = 10) {
//   try {
//     const chats = await Chat.findAll({
//       where: { chat_type: "private" },
//       order: [["updatedAt", "DESC"]],
//       include: [
//         {
//           association: "participants",
//           attributes: ["participant_id"],
//           include: [
//             {
//               model: User,
//               as: "User",
//               attributes: [
//                 "user_id",
//                 "full_name",
//                 "user_name",
//                 "country",
//                 "profile_pic",
//               ],
//             },
//           ],
//         },
//       ],
//       limit: pageSize,
//       offset: (page - 1) * pageSize,
//     });
//     return {
//       chats,
//       pagination: {
//         page: page,
//         pageSize: pageSize,
//         total: chats.length,
//         total_pages: Math.ceil(chats.length / pageSize),
//       },
//     };
//   } catch (error) {
//     console.error("Error in fetching chats:", error);
//     throw error;
//   }
// }
async function getGroupChats({
  page = 1,
  pageSize = 10,
  sortBy = "createdAt", // default sorting
  sortOrder = "DESC",   // ASC or DESC
  search = ""           // optional search keyword
}) {
  try {
    // Validate sortOrder
    const orderDirection = ["ASC", "DESC"].includes(sortOrder.toUpperCase())
      ? sortOrder.toUpperCase()
      : "DESC";

    // Build dynamic order
    let order = [];

    if (sortBy === "user_count") {
      // Sort by participant count
      order.push([
        Sequelize.literal(`(
          SELECT COUNT(*)
          FROM "Participants" AS cp
          WHERE cp.chat_id = "Chat".chat_id
        )`),
        orderDirection,
      ]);
    } else if (["createdAt", "group_name", "updatedAt"].includes(sortBy)) {
      order.push([sortBy, orderDirection]);
    } else {
      order.push(["updatedAt", "DESC"]); // fallback
    }

    // Build where clause
    let whereClause = { chat_type: "group" };
    if (search && search.trim()) {
      whereClause.group_name = {
        [Sequelize.Op.iLike]: `%${search.trim()}%`, // case-insensitive search
      };
    }

    // Fetch chats
    const { count, rows: chats } = await Chat.findAndCountAll({
      where: whereClause,
      order,
      include: [
        {
          association: "participants",
          attributes: ["participant_id"],
          include: [
            {
              model: User,
              as: "User",
              attributes: [
                "user_id",
                "full_name",
                "user_name",
                "country",
                "profile_pic",
              ],
            },
          ],
        },
      ],
      limit: pageSize,
      offset: (page - 1) * pageSize,

      // 👇 Fix over-counting due to JOINs
      distinct: true,
      col: "chat_id",
    });

    return {
      chats,
      pagination: {
        page,
        pageSize,
        total: count,
        total_pages: Math.ceil(count / pageSize),
      },
    };
  } catch (error) {
    console.error("Error in fetching chats:", error);
    throw error;
  }
}



async function weeklyNewUsers() {
  try {
    // Start and end of the current week (Sunday → Saturday)
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    // Query grouped by DATE(createdAt)
    const results = await User.findAll({
      attributes: [
        [fn("DATE", col("createdAt")), "date"],
        [fn("COUNT", "*"), "count"],
      ],
      where: {
        createdAt: {
          [Op.between]: [startOfWeek, endOfWeek],
        },
      },
      group: [fn("DATE", col("createdAt"))],
      order: [[fn("DATE", col("createdAt")), "ASC"]],
      raw: true,
    });

    // Map query results into an object { date: count }
    const countsByDate = results.reduce((acc, row) => {
      acc[new Date(row.date).toDateString()] = parseInt(row.count, 10);
      return acc;
    }, {});

    // Day labels
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    // Build final array with 0 fallback
    const weeklyData = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);

      weeklyData.push({
        day: days[i],
        count: countsByDate[date.toDateString()] || 0,
      });
    }

    return weeklyData;
  } catch (error) {
    console.error("Error fetching weekly new users:", error);
    throw new Error("Failed to fetch weekly new users");
  }
}

function formatDateLocal(date) {
  return format(date, "yyyy-MM-dd"); // stays in local time
}

async function dailyActiveUsersCount(month, year) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  
  const dbData = await DailyUsers.findAll({
    attributes: ["date", "users_count"],
    where: {
      date: {
        [Op.between]: [formatDateLocal(startDate), formatDateLocal(endDate)],
      },
    },
    raw: true,
  });

  const countsByDate = dbData.reduce((acc, row) => {
    acc[row.date] = row.users_count;
    return acc;
  }, {});

  const daysInMonth = new Date(year, month, 0).getDate();
  const monthName = new Date(year, month - 1, 1).toLocaleString("en-US", {
    month: "short",
  });

  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const d = new Date(year, month - 1, i + 1);
    const isoDate = formatDateLocal(d); // ✅ local date
    return {
      date: `${i + 1}\n${monthName}`,
      count: countsByDate[isoDate] || 0,
    };
  });

  return days;
}



module.exports = {
  getUsersCounts,
  getGroupChatsCnt,
  getCallsCnt,
  usersList,
  getGroupChats,
  yearlyDataOfNewUsersAndGrps,
  weeklyNewUsers,
  yearlyCallsData,
  getCntUsersCountryWise,
  dailyActiveUsersCount,
  getCntUsersCountryWiseLast30Mins
};