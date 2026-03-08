const cron = require('node-cron');
const { Story, User, DailyUsers, sequelize } = require('../../../models');
const { Op } = require('sequelize');
const { getUser, updateUser } = require('./user.service');

// Runs every hour at minute 0 (e.g., 1:00, 2:00, 3:00...)
const scheduleStoryCleanup = () => {
  // Cron format: '0 * * * *' means "At minute 0 of every hour"
  cron.schedule('0 * * * *', async () => {
    try {
      await Story.update(
        { is_expired: true },
        {
          where: {
            expiresAt: {
              [Op.lt]: new Date()
            }
          }
        }
      );
    } catch (error) {
      console.error('[Story Cleanup Cron] Error:', error);
    }
  });

};

const dailyActiveUsersCount = () => {
  // Run every day at 12:01 AM IST
  cron.schedule("1 0 * * *", async () => {
    try {
      // get IST "yesterday" start and end
      const startOfDayIST = new Date();
      startOfDayIST.setDate(startOfDayIST.getDate() - 1);
      startOfDayIST.setHours(0, 0, 0, 0);

      const endOfDayIST = new Date();
      endOfDayIST.setDate(endOfDayIST.getDate() - 1);
      endOfDayIST.setHours(23, 59, 59, 999);

      // Count users updated yesterday
      const count = await User.count({
        where: {
          updatedAt: {
            [Op.between]: [startOfDayIST, endOfDayIST],
          },
        },
      });

      // Insert record in DailyUsers
      await DailyUsers.create({
        users_count: count,
        date: startOfDayIST, // store "yesterday's date" (can format to yyyy-mm-dd if needed)
      });

      console.log(
        `✅ Saved daily active users: ${count} on ${startOfDayIST.toDateString()}`
      );
    } catch (error) {
      console.error("❌ Error calculating daily active users:", error);
    }
  });
};

const MODELS_TO_SKIP = [
  'Admin',
  'Avatar',
  'Config',
  'DailyUsers',
  'Language_translation',
  'Language',
  'Report_type',
  'User',
  'Story'
];

const PARTIAL_CLEANUP = {

  Chat: {
    field: 'createdAt',
    afterTime: new Date('2025-11-04 12:55:24.321+00'),
    excludeConditions: {},

  },
  Message_seen: {
    field: 'createdAt',
    afterTime: new Date('2025-11-04 12:55:24.321+00'),
    excludeConditions: {},

  },
  Message: {
    field: 'createdAt',
    afterTime: new Date('2025-11-04 12:55:24.321+00'),
    excludeConditions: {},

  },
  Participant: {
    field: 'createdAt',
    afterTime: new Date('2025-11-04 12:55:24.321+00'),
    excludeConditions: {},
  },

};


const deleteDatain24Hours = () => {
  if (process?.env?.IS_CLIENT != 'true') {
    const now = new Date();
    const nextRun = new Date(now);
    nextRun.setHours(2, 0, 0, 0);

    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }

    const hoursLeft = ((nextRun - now) / (1000 * 60 * 60)).toFixed(2);
    console.log(`[CRON] Hours left until next 2:00 AM run: ${hoursLeft} hours`);

    // console.log(`[CRON] Running database cleanup at ${new Date().toISOString()}`);
    cron.schedule('0 2 * * *', async () => {
      // cron.schedule('*/5 * * * *', async () => {
      console.log('[CRON] Starting scheduled database cleanup at 2:00 AM...');
      try {
        const allModels = sequelize.models;

        for (const modelName in allModels) {
          if (MODELS_TO_SKIP.includes(modelName)) {
            console.log(`[SKIP] Skipping model: ${modelName}`);
            continue;
          }

          const model = allModels[modelName];

          if (PARTIAL_CLEANUP[modelName]) {
            const { field, afterTime, excludeConditions } = PARTIAL_CLEANUP[modelName];

            const where = {
              [field]: {
                [Op.gt]: afterTime, // DELETE records created AFTER this time
              },
              ...excludeConditions, // Apply additional exclusions if any
            };

            const deleted = await model.destroy({ where });
            console.log(`[DELETE-PARTIAL] ${modelName}: Deleted ${deleted} recent entries`);

          } else {
            const deleted = await model.destroy({ where: {} });
            console.log(`[DELETE-ALL] ${modelName}: Deleted ${deleted} entries`);
          }
        }


        console.log(`[CRON] Database cleanup finished.`);
      } catch (err) {
        console.error(`[ERROR] Cleanup failed:`, err);
      }
    });

  }
}

module.exports = {
  scheduleStoryCleanup,
  dailyActiveUsersCount,
  deleteDatain24Hours

};