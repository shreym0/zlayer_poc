import fs from 'fs';
import path from 'path';
import unzipper from 'unzipper';
import dotenv from 'dotenv';
import { Proof } from './utils/proofValidation.js';

// Load environment variables from .env file
dotenv.config();

// Default to 'production' if NODE_ENV is not set
const environment = process.env.NODE_ENV || 'production';

// Set the input and output directories based on the environment
const INPUT_DIR = environment === 'development' ? './demo/input' : '/input';
const OUTPUT_DIR = environment === 'development' ? './demo/output' : '/output';
const SEALED_DIR = environment === 'development' ? './demo/sealed' :  '/sealed';

function loadConfig() {
    const config = {
        dlpId: process.env.DLP_ID,  // dlp_id is 24 for our datadao
        inputDir: INPUT_DIR,
        // salt: '5EkntCWI',
        validatorBaseApiUrl: process.env.VALIDATOR_BASE_API_URL,
        awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
        awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    };
    console.info(`Using config: ${JSON.stringify(config, null, 2)}`);
    return config;
}

async function extractInput() {
    const inputFiles = fs.readdirSync(INPUT_DIR);

    for (const inputFilename of inputFiles) {
        const inputFile = path.join(INPUT_DIR, inputFilename);

        if (inputFile.endsWith('.zip')) {
            await new Promise((resolve, reject) => {
                fs.createReadStream(inputFile)
                    .pipe(unzipper.Extract({ path: INPUT_DIR }))
                    .on('close', () => {
                        console.info(`Extracted ${inputFile}`);
                        resolve();
                    })
                    .on('error', reject);
            });
        }
    }
}

async function run() {
    const config = loadConfig();
    console.log('Running proof generation...', fs.existsSync(INPUT_DIR));
    const inputFilesExist = fs.existsSync(INPUT_DIR) && fs.readdirSync(INPUT_DIR).length > 0;

    if (!inputFilesExist) {
        throw new Error(`No input files found in ${INPUT_DIR}`);
    }

    await extractInput();

    // Assume Proof is asynchronous
    const proof = new Proof(config);
    const proofResponse = await proof.generate();

    const outputPath = path.join(OUTPUT_DIR, 'results.json');
    fs.writeFileSync(outputPath, JSON.stringify(proofResponse, null, 2));
    console.info(`Proof generation complete: ${JSON.stringify(proofResponse, null, 2)}`);
}

// Call the run function immediately
(async () => {
    try {
        await run();
        console.log('Run function executed successfully.');
    } catch (error) {
        console.error('Error executing run function:', error);
    } 
})();