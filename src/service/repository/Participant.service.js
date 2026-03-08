const { Op } = require('sequelize');
const { Participant } = require("../../../models");
const chat_service = require('./Chat.service');
const { toJSONWithAssociations } = require('../../helper/json.hleper');


async function createParticipant(participantPayload) {
  try {
    const newParticipant = await Participant.create(participantPayload);
    return newParticipant;
  } catch (error) {
    console.error('Error in Creating Participant', error);
    throw error;
  }
}

async function updateParticipant(updates, participantPayload) {
  try {



    const newParticipant = await Participant.update(updates, { where: participantPayload, returning: true });
    if (newParticipant[0]== 0) {
      return null;
    }
    return newParticipant[1][0];
  } catch (error) {
    console.error('Error in Creating Participant', error);
    throw error;
  }
}

async function getParticipant(participantPayload, includeOptions = [], pagination = { page: 1, pageSize: 10 }) {
  try {
    const { page, pageSize } = pagination;

    // Calculate offset and limit for pagination
    const offset = (page - 1) * pageSize;
    const limit = pageSize;

    // Build the query object
    const query = {
      where: {
        ...participantPayload,
        is_deleted: false
      },
      include: includeOptions, // Dynamically include models
      limit,
      offset,
      order: [["createdAt", "DESC"]], // Order by createdAt descending
    };

    // Use findAndCountAll to get both rows and count
    const { rows, count } = await Participant.findAndCountAll(query);


    // Prepare the structured response
    return {
      Records: rows,
      Pagination: {
        total_pages: Math.ceil(count / pageSize),
        total_records: count,
        current_page: page,
        records_per_page: pageSize,
      },
    };
  } catch (error) {
    console.error("Error in fetching Participant:", error);
    throw error;
  }
}

async function getParticipantWithoutPagenation(participantPayload, includeOptions = []) {
  try {
    // Calculate offset and limit for pagination
    // Build the query object
    const query = {
      where: {
        ...participantPayload,
        is_deleted: false
      },
      include: includeOptions, // Dynamically include models
      order: [["updatedAt", "DESC"]], // Sort by newest first
    };
    // Use findAndCountAll to get both rows and count
    const { rows, count } = await Participant.findAndCountAll(query);
    // Prepare the structured response
    const Jsoned_Rows = await toJSONWithAssociations(rows)
    return {
      Records: Jsoned_Rows,
    };
  } catch (error) {
    console.error("Error in fetching Participant:", error);
    throw error;
  }
}


async function alreadyParticipantIndividual(user1, user2) {
  try {
    // Find all participations for user1
    const user1_participations = await Participant.findAll({
      where: { user_id: user1, is_deleted: false },
    });

    // Extract chat IDs
    const user_1_chats = user1_participations.map(
      (participation) => participation.dataValues.chat_id
    );

    // Find common chats where user2 is also a participant
    const commonchats = await Participant.findAll({
      where: {
        user_id: user2,
        chat_id: { [Op.in]: user_1_chats },
        is_deleted: false
      },
    });

    for (const commonchat of commonchats) {
      const isGroup = await chat_service.isGroup(commonchat.dataValues.chat_id);
      if (isGroup) {
        continue
      }

      // ✅ **Update the `updated_at` field**
      await Participant.update(
        { update_counter: true }, // Set updated_at to current timestamp
        {
          where: {
            chat_id: commonchat.dataValues.chat_id,
            user_id: { [Op.in]: [user1, user2] }, // Update for both users
          },
        }
      );

      return commonchat.dataValues.chat_id;
    }

    return false; // No existing individual chat found
  } catch (error) {
    console.error("Error in checking chat:", error);
    throw error;
  }
}

async function isParticipant(user_id, chat_id) {
  try {
    const isParticipant = await Participant.findOne({
      where: {
        user_id: user_id,
        chat_id: chat_id,
      },
    });
    return isParticipant;
  } catch (error) {
    console.error("Error in checking chat:", error);
    throw error;
  }
}

async function getChatIdsByUser(userId) {
  try {
    const participations = await Participant.findAll({
      where: { user_id: userId },
      attributes: ['chat_id'],
      order: [['updatedAt', 'DESC']], // Optional: sort by recent
    });

    return participations.map(p => p.chat_id);
  } catch (error) {
    console.error("Error in getChatIdsByUser:", error);
    throw error;
  }
}


module.exports = {
  createParticipant,
  getParticipant,
  alreadyParticipantIndividual,
  getParticipantWithoutPagenation,
  updateParticipant,
  isParticipant,
  getChatIdsByUser
};


