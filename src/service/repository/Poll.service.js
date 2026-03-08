const { Poll } = require("../../../models");

async function createPoll(payload) {
    try {
        const newPoll = await Poll.create({
            ...payload,
            poll_options: payload.poll_options.map((option) => ({ option: option, votes: [] })),
        });
        return newPoll;
    } catch (error) {
        console.error('Error in Creating Poll', error);
        throw error;
    }
}

async function votePoll(poll_id, option, user_id) {
    try {
        const poll = await Poll.findByPk(poll_id);

        if (!poll) {
            throw new Error('Poll not found');
        }

        if (poll.poll_options.filter((item) => item.option == option).length <= 0) {
            throw new Error('Invalid poll option');
        }
        // Remove user from all options first
        if (!poll.allow_multiple_votes) {
            poll.poll_options = poll.poll_options.map((item) => {
                return {
                    option: item.option,
                    votes: item.votes.filter((vote) => vote !== user_id)
                }
            })
        }

        poll.poll_options = poll.poll_options.map((item) => {
            if (item.option == option) {
                item.votes = item.votes.filter((vote) => vote !== user_id)
                item.votes.push(user_id)
            }
            return item;
        })
        Poll.update({ poll_options: poll.poll_options }, { where: { poll_id: poll_id } });
        await Poll.update({ poll_options: poll.poll_options }, { where: { poll_id: poll_id } });

        return poll;
    } catch (error) {
        console.error('Error in voting for the poll:', error);
        throw error;
    }
}

async function getPoll(poll_id) {
    try {
        const poll = await Poll.findByPk(poll_id);
        return poll;
    } catch (error) {
        console.error('Error in fetching the poll:', error);
        throw error;
    }
}

module.exports = {
    createPoll, votePoll, getPoll
};
