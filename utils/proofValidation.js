import fs from 'fs';
import path from 'path';
import axios from 'axios';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { contributionScore } from './taskMapping.js';

// Load environment variables from .env file
dotenv.config();

// const topWeights = {
//     'Authenticity': 0.2,
//     'Quality': 0.7,
//     'Uniqueness': 0.1
// };

export class Proof {
    constructor(config) {
        this.config = config;
        console.info(`Config: ${JSON.stringify(this.config)}`);
        // this.proofResponse = new ProofResponse(config.dlp_id);
        this.inputDir = this.config.inputDir;
        this.dlpId = this.config.dlpId;
        this.validatorBaseApiUrl = this.config.validatorBaseApiUrl;
        this.awsAccessKeyId = this.config.awsAccessKeyId;
        this.awsSecretAccessKey = this.config.awsSecretAccessKey;
    }

    async generate() {
        console.info("Starting proof generation");

        let proofResponseObject = {
            dlpId: this.dlpId || '24',
        };

        let inputData;
        for (const inputFilename of fs.readdirSync(this.inputDir)) {
            const inputFile = path.join(this.inputDir, inputFilename);
            if (path.extname(inputFile).toLowerCase() === '.json') {
                inputData = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
                console.info(`Generated input file contents: ${JSON.stringify(inputData)}`);

                const jwtToken = generateJwtToken();
                const { walletAddress, subType } = extractWalletAndSubTypes(inputData);
                const contributionScoreResult = contributionScore(inputData);

                proofResponseObject.authenticity = await authenticityScore(inputData);
                proofResponseObject.uniqueness = await uniquenessScore(inputData);
                proofResponseObject.contribution = contributionScoreResult.normalizedDynamicScore;
                proofResponseObject.ownership = await ownershipScore(this.validatorBaseApiUrl, jwtToken, {
                    walletAddress, subType
                });
                // proofResponseObject.quality  = await qualityScore(inputData); // not reqd. now

                proofResponseObject.score = calculateScore(proofResponseObject);

                // proofResponseObject.valid = proofResponseObject.quality > 0.05;

                proofResponseObject.attributes = {
                    normalizedContributionScore: contributionScoreResult.normalizedDynamicScore,
                    totalContributionScore: contributionScoreResult.totalDynamicScore,
                    // total_score: proofResponseObject.quality, // modify this by adding other scores
                    // score_threshold: proofResponseObject.quality,
                    // email_verified: true,
                };
            }
        }

        console.info(`Proof response: ${JSON.stringify(proofResponseObject)}`);
        return proofResponseObject;
    }

}

function generateJwtToken() {
    return jwt.sign({}, "raj", {
        expiresIn: process.env.JWT_EXPIRATION_TIME || '3m', // Default to 3 minutes if not set
    });
}

function extractWalletAndSubTypes(payload) {
    if (!payload || !payload.contribution) {
        throw new Error("Invalid payload structure");
    }

    const walletAddress = payload.walletAddress;
    const subType = payload.contribution.map(contribution => contribution.taskSubType);

    return { walletAddress, subType };
}

//*** Proof Score Calculations ***//

function calculateScore(proofResponseObject) {
    // List of attributes to consider for the score calculation
    const attributes = ['authenticity', 'uniqueness', 'contribution', 'quality', 'ownership'];

    // Calculate the sum of all available attributes (values between 0 and 1)
    const validAttributes = attributes.filter(attr => proofResponseObject[attr] !== undefined && proofResponseObject[attr] !== null);

    // If no valid attributes, return 0
    if (validAttributes.length === 0) return 0;

    const sum = validAttributes.reduce((total, attr) => total + (proofResponseObject[attr] || 0), 0);

    // Calculate the average of the valid attributes
    const score = sum / validAttributes.length;

    return parseFloat(score.toFixed(5)); // Ensures score is rounded to 5 decimal places
}

async function ownershipScore(apiUrl, jwtToken, body) {
    if (!jwtToken || typeof jwtToken !== 'string') {
        throw new Error('JWT token is required and must be a string');
    }
    if (!body || typeof body !== 'object' || !body.walletAddress || !Array.isArray(body.subType)) {
        throw new Error('Invalid body format. Ensure walletAddress is a string and subType is an array.');
    }

    try {
        // Simulate a 400 error based on a condition
        // if (body.walletAddress === '0x1059Ed65AD58ffc83642C9Be3f24C250905a28FB') {
        //     const error = new Error('Simulated 400 error');
        //     error.response = { status: 400, data: { error: 'Simulated 400 error' } };
        //     throw error;
        // }
        const response = await axios.post(apiUrl, body, {
            headers: {
                Authorization: `Bearer ${jwtToken}`, // Attach JWT token in the Authorization header
            },
        });

        return response.data.success ? 1.0 : 0.0;

    } catch (error) {
        console.log({ error });
        if (error.response?.status === 400) return 0.0;
        throw new Error(`API call failed: ${error.response?.data?.error || error.message}`);
    }
}

async function authenticityScore(dataList) {
    if (!dataList || !dataList.contribution) {
        throw new Error("Invalid payload structure");
    }

    const validWitnessDomains = ["wss://witness.reclaimprotocol.org/ws", "reclaimprotocol.org"];

    const contributions = dataList.contribution;
    let validCount = 0;

    // Check each contribution's witness
    contributions.forEach(contribution => {
        const witness = contribution.witnesses;
        if (
            witness === validWitnessDomains[0] || // Match specific WebSocket URL
            witness.includes("reclaimprotocol.org") // General domain match
        ) {
            validCount++;
        }
    });

    // Calculate the score as a ratio of valid witnesses to total contributions
    const score = validCount / contributions.length;

    return parseFloat(score.toFixed(5)) // Rounded to five decimal places
}

async function uniquenessScore(dataList) {
    // Since Uniqueness is checked from Database, before accepting the data,
    return 1; 
}


//***** Not required for now *****//

// function qualityScore(inputJson) {
//     // if (!inputJson || !inputJson.platformType || !inputJson.taskSubType || !inputJson.securedSharedData) {
//     //     throw new Error("Invalid input JSON");
//     // }

//     // let maxScore = 0, score = 0;
//     // const publicData = inputJson.securedSharedData;

//     // if (inputJson.platformType === PLATFORM_TYPES[1] && inputJson.taskSubType === PLATFORM_TASK_SUBTYPES.TWITTER[0]) {

//     //     // Assign values based on weights and public data
//     //     score += (publicData.followers || 0) * testWeights.followers;
//     //     score += (publicData.following || 0) * testWeights.following;
//     //     score += (publicData.posts || 0) * testWeights.posts;

//     //     // Normalize the score if needed (e.g., divide by total weights)
//     //     maxScore = Object.values(testWeights).reduce((sum, weight) => sum + weight, 0);
//     // }

//     // const normalizedScore = score / maxScore;

//     // return normalizedScore;
// }



