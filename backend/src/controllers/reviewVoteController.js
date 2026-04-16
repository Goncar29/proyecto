const reviewVoteService = require('../services/reviewVoteService');

exports.castVote = async (req, res, next) => {
    try {
        const { reviewId } = req.params;
        const { value } = req.body;
        const userId = req.user.id;

        const result = await reviewVoteService.castVote(reviewId, userId, value);
        res.status(200).json(result);
    } catch (err) {
        next(err);
    }
};

exports.getMyVote = async (req, res, next) => {
    try {
        const { reviewId } = req.params;
        const userId = req.user.id;

        const userVote = await reviewVoteService.getUserVote(reviewId, userId);
        res.json({ userVote });
    } catch (err) {
        next(err);
    }
};
