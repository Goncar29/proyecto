const prisma = require('../utils/prismaClient');

/**
 * Cast or update a vote on a review.
 *
 * Rules:
 * - A user can only have one vote per review (unique constraint on (reviewId, userId)).
 * - Sending the same value a second time removes the vote (toggle).
 * - Every mutation recalculates helpfulCount from actual votes in the DB.
 *
 * Returns: { reviewId, helpfulCount, userVote: 1 | -1 | null }
 */
exports.castVote = async (reviewId, userId, value) => {
    const id = parseInt(reviewId, 10);
    if (!Number.isInteger(id) || id <= 0) {
        const e = new Error('Review no encontrada.');
        e.status = 404; e.code = 'NOT_FOUND';
        throw e;
    }

    return prisma.$transaction(async (tx) => {
        const review = await tx.review.findUnique({ where: { id } });
        if (!review) {
            const e = new Error('Review no encontrada.');
            e.status = 404; e.code = 'NOT_FOUND';
            throw e;
        }

        const existing = await tx.reviewVote.findUnique({
            where: { reviewId_userId: { reviewId: id, userId } },
        });

        let userVote = null;

        if (existing && existing.value === value) {
            // Same value → toggle off (remove vote)
            await tx.reviewVote.delete({
                where: { reviewId_userId: { reviewId: id, userId } },
            });
        } else {
            // New vote or change of value → upsert
            await tx.reviewVote.upsert({
                where: { reviewId_userId: { reviewId: id, userId } },
                create: { reviewId: id, userId, value },
                update: { value },
            });
            userVote = value;
        }

        // Recalculate helpfulCount from all positive votes
        const helpfulCount = await tx.reviewVote.count({
            where: { reviewId: id, value: 1 },
        });

        // Persist updated helpfulCount on the review
        await tx.review.update({
            where: { id },
            data: { helpfulCount },
        });

        return { reviewId: id, helpfulCount, userVote };
    }, { isolationLevel: 'Serializable' });
};

/**
 * Get the current user's vote on a specific review.
 * Returns 1, -1, or null if no vote.
 */
exports.getUserVote = async (reviewId, userId) => {
    const id = parseInt(reviewId, 10);
    if (!Number.isInteger(id) || id <= 0) return null;

    const vote = await prisma.reviewVote.findUnique({
        where: { reviewId_userId: { reviewId: id, userId } },
    });

    return vote ? vote.value : null;
};
