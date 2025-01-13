import dotenv from 'dotenv';
dotenv.config();

// Task and Subtype Definitions
export const EContributionType = {
    NETFLIX: "NETFLIX",
    SPOTIFY: "SPOTIFY",
    AMAZON: "AMAZON",
    TWITTER: "TWITTER",
    YOUTUBE: "YOUTUBE",
    FARCASTER: "FARCASTER",
};

export const EContributionSubType = {
    YOUTUBE_HISTORY: 'YOUTUBE_HISTORY',
    YOUTUBE_PLAYLIST: 'YOUTUBE_PLAYLIST',
    YOUTUBE_SUBSCRIBERS: 'YOUTUBE_SUBSCRIBERS',
    AMAZON_PRIME_VIDEO: 'AMAZON_PRIME_VIDEO',
    AMAZON_ORDER_HISTORY: 'AMAZON_ORDER_HISTORY',
    SPOTIFY_PLAYLIST: 'SPOTIFY_PLAYLIST',
    SPOTIFY_HISTORY: 'SPOTIFY_HISTORY',
    NETFLIX_HISTORY: 'NETFLIX_HISTORY',
    NETFLIX_FAVORITE: 'NETFLIX_FAVORITE',
    TWITTER_USERINFO: 'TWITTER_USERINFO',
    FARCASTER_USERINFO: 'FARCASTER_USERINFO',
};

// Task data type mapping with configurable points from the environment
export const TaskDataTypeMapping = {
    [EContributionType.NETFLIX]: {
        [EContributionSubType.NETFLIX_HISTORY]: parseInt(process.env.NETFLIX_HISTORY_POINTS, 10) || 50,
        [EContributionSubType.NETFLIX_FAVORITE]: parseInt(process.env.NETFLIX_FAVORITE_POINTS, 10) || 50,
    },
    [EContributionType.SPOTIFY]: {
        [EContributionSubType.SPOTIFY_PLAYLIST]: parseInt(process.env.SPOTIFY_PLAYLIST_POINTS, 10) || 50,
        [EContributionSubType.SPOTIFY_HISTORY]: parseInt(process.env.SPOTIFY_HISTORY_POINTS, 10) || 50,
    },
    [EContributionType.AMAZON]: {
        [EContributionSubType.AMAZON_PRIME_VIDEO]: parseInt(process.env.AMAZON_PRIME_VIDEO_POINTS, 10) || 50,
        [EContributionSubType.AMAZON_ORDER_HISTORY]: parseInt(process.env.AMAZON_ORDER_HISTORY_POINTS, 10) || 50,
    },
    [EContributionType.TWITTER]: {
        [EContributionSubType.TWITTER_USERINFO]: parseInt(process.env.TWITTER_USERINFO_POINTS, 10) || 50,
    },
    [EContributionType.YOUTUBE]: {
        [EContributionSubType.YOUTUBE_HISTORY]: parseInt(process.env.YOUTUBE_HISTORY_POINTS, 10) || 50,
        [EContributionSubType.YOUTUBE_PLAYLIST]: parseInt(process.env.YOUTUBE_PLAYLIST_POINTS, 10) || 50,
        [EContributionSubType.YOUTUBE_SUBSCRIBERS]: parseInt(process.env.YOUTUBE_SUBSCRIBERS_POINTS, 10) || 50,
    },
    [EContributionType.FARCASTER]: {
        [EContributionSubType.FARCASTER_USERINFO]: parseInt(process.env.FARCASTER_USERINFO_POINTS, 10) || 50,
    },
};

// Configurable threshold and bonus points
const CONTRIBUTION_THRESHOLD = parseInt(process.env.CONTRIBUTION_THRESHOLD, 10) || 4;
const EXTRA_POINTS = parseInt(process.env.EXTRA_POINTS, 10) || 5;

// Contribution weights based on subtypes (defined by you in the system)
const ContributionSubTypeWeights = {
    [EContributionSubType.YOUTUBE_HISTORY]: 1.5,
    [EContributionSubType.YOUTUBE_PLAYLIST]: 1.2,
    [EContributionSubType.YOUTUBE_SUBSCRIBERS]: 1.3,
    [EContributionSubType.NETFLIX_HISTORY]: 1.4,
    [EContributionSubType.NETFLIX_FAVORITE]: 1.1,
    [EContributionSubType.SPOTIFY_PLAYLIST]: 1.2,
    [EContributionSubType.SPOTIFY_HISTORY]: 1.3,
    [EContributionSubType.AMAZON_PRIME_VIDEO]: 1.4,
    [EContributionSubType.AMAZON_ORDER_HISTORY]: 1.1,
    [EContributionSubType.TWITTER_USERINFO]: 1.0,
    [EContributionSubType.FARCASTER_USERINFO]: 1.1,
};
 
/**
 * Calculates the maximum possible score 
 * based on the task data type mapping and contribution subtype weights.
 * @returns {number} The maximum possible score.
 */
function calculateMaxPossibleScore() {
    let maxScore = 0;

    for (const contributionType in TaskDataTypeMapping) {
        if (TaskDataTypeMapping.hasOwnProperty(contributionType)) {
            const subTypes = TaskDataTypeMapping[contributionType];
            for (const subType in subTypes) {
                if (subTypes.hasOwnProperty(subType)) {
                    const points = subTypes[subType];
                    const weight = ContributionSubTypeWeights[subType] || 1;
                    maxScore += points * weight;
                }
            }
        }
    }

    return maxScore;
}

/**
 * Calculates the dynamic score for a specific contribution based on the sub-type weight.
 * @param {Object} params - Parameters containing type, taskSubType.
 * @returns {number} The dynamic score for the given type and subtype.
 */
function calculateDynamicScore({ type, taskSubType }) {
    if (!type || !taskSubType) {
        throw new Error("Invalid type or taskSubType provided.");
    }

    const typeMapping = TaskDataTypeMapping[type];
    if (!typeMapping) {
        throw new Error(`Unknown type: ${type}`);
    }

    const baseScore = typeMapping[taskSubType];
    if (baseScore === undefined) {
        throw new Error(`Unknown taskSubType: ${taskSubType} for type: ${type}`);
    }

    // Apply sub-type specific weight
    const weight = ContributionSubTypeWeights[taskSubType] || 1; // Default weight is 1
    const dynamicScore = baseScore * weight;

    return dynamicScore;
}

/**
 * Calculates the total dynamic score for the given contributions, adds bonus points if required, 
 * and normalizes the score.
 * @param {Object} dataList - The input payload containing contributions.
 * @returns {Object} An object containing the total and normalized dynamic score.
 */
export function contributionScore(dataList) {
    const { contribution } = dataList;

    if (!Array.isArray(contribution)) {
        throw new Error("Invalid payload: contribution should be an array.");
    }

    let totalDynamicScore = 0;

    for (const item of contribution) {
        const { type, taskSubType } = item;

        try {
            const dynamicScore = calculateDynamicScore({ type, taskSubType });
            totalDynamicScore += dynamicScore;
        } catch (error) {
            console.warn(`Skipping invalid entry: ${error.message}`);
        }
    }

    // Add bonus points if contributions exceed the threshold
    if (contribution.length > CONTRIBUTION_THRESHOLD) {
        console.log(`Adding bonus points: ${EXTRA_POINTS} (contribution length: ${contribution.length})`);
        totalDynamicScore += EXTRA_POINTS;
    }

    // Normalize the dynamic score to be between 0 and 1
    const maxPossibleScore = calculateMaxPossibleScore()
    const normalizedDynamicScore = Math.min(totalDynamicScore / maxPossibleScore, 1);

    return { totalDynamicScore, normalizedDynamicScore };
}