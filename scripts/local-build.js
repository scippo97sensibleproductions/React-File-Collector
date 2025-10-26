import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import prompts from 'prompts';

const KEY_FILE_NAME = 'file-collector-release.key';
const keyFilePath = resolve(process.cwd(), KEY_FILE_NAME);

async function runBuild() {
    console.log(`Checking for private key at: ${keyFilePath}`);

    if (!existsSync(keyFilePath)) {
        console.error(`\nERROR: Private key file not found.`);
        console.error(`Expected file: "${KEY_FILE_NAME}" in the project root.`);
        console.error(`Please generate a key pair using npx:\nnpx tauri signer generate -w ./${KEY_FILE_NAME}\n`);
        process.exit(1);
    }

    try {
        const privateKey = readFileSync(keyFilePath, 'utf-8');

        const response = await prompts({
            type: 'password',
            name: 'password',
            message: `Enter password for ${KEY_FILE_NAME}:`
        });

        // prompts returns undefined if the user cancels (e.g., Ctrl+C)
        if (typeof response.password === 'undefined') {
            console.log('\nBuild cancelled by user.');
            process.exit(130);
        }

        console.log('\nSetting environment variables and starting Tauri build...');

        const buildEnv = {
            ...process.env,
            TAURI_SIGNING_PRIVATE_KEY: privateKey,
            TAURI_SIGNING_PRIVATE_KEY_PASSWORD: response.password,
        };

        execSync('npx tauri build', {
            stdio: 'inherit',
            env: buildEnv
        });

        console.log('\nTauri build completed successfully.');

    } catch (error) {
        console.error('\nBuild failed:', error.message);
        process.exit(1);
    }
}

// Handle exit signals to prevent orphaned processes
process.on('SIGINT', () => process.exit());
process.on('SIGTERM', () => process.exit());

runBuild();