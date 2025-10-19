import { useState } from 'react';
import { getVersion } from '@tauri-apps/api/app';
import { fetch } from '@tauri-apps/plugin-http';
import type { GitHubRelease } from '../models/GitHubRelease.ts';

const REPO_URL = import.meta.env.VITE_GITHUB_REPO_URL;
const GITHUB_API_URL = `https://api.github.com/repos/${REPO_URL}/releases/latest`;
const SEMVER_EXTRACT_REGEX = /^v?(\d+\.\d+\.\d+)/;

export interface UpdateInfo {
    tagName: string;
    htmlUrl: string;
}

export interface UpdateCheckState {
    isLoading: boolean;
    error: string | null;
    currentVersion: string;
    latestVersionInfo: UpdateInfo | null;
    isUpdateAvailable: boolean;
    lastChecked: Date | null;
}

function parseVersion(version: string): string | null {
    const match = RegExp(SEMVER_EXTRACT_REGEX).exec(version);
    return match ? match[1] : null;
}

function isVersionNewer(latest: string, current: string): boolean {
    const latestParts = latest.split('.').map(Number);
    const currentParts = current.split('.').map(Number);

    for (let i = 0; i < 3; i++) {
        if (latestParts[i] > currentParts[i]) return true;
        if (latestParts[i] < currentParts[i]) return false;
    }

    return false;
}

const initialState: UpdateCheckState = {
    isLoading: false,
    error: null,
    currentVersion: '',
    latestVersionInfo: null,
    isUpdateAvailable: false,
    lastChecked: null,
};

export const useUpdateCheck = (log?: (message: string) => void) => {
    const [state, setState] = useState<UpdateCheckState>(initialState);

    const check = async () => {
        log?.('Starting update check...');
        setState((s) => ({ ...s, isLoading: true, error: null }));

        try {
            const currentVersionTag = await getVersion();
            log?.(`Current version identified: ${currentVersionTag}`);

            const response = await fetch(GITHUB_API_URL, {
                method: 'GET',
                headers: { 'User-Agent': 'FileCollector-App-Updater' },
            });

            if (!response.ok) {
                const responseData = (await response.json()) as { message?: string };
                throw new Error(`GitHub API request failed: ${response.status} - ${responseData.message ?? 'No message'}`);
            }

            const latestRelease = await response.json() as GitHubRelease;
            log?.(`Successfully fetched release data. Latest tag: ${latestRelease.tag_name}`);

            const latestVersionTag = latestRelease.tag_name;
            if (!latestVersionTag) {
                throw new Error('Latest release data is missing a tag_name.');
            }

            const currentVersion = parseVersion(currentVersionTag);
            const latestVersion = parseVersion(latestVersionTag);

            if (!currentVersion || !latestVersion) {
                throw new Error(`Failed to parse version strings. Current: "${currentVersionTag}", Latest: "${latestVersionTag}"`);
            }

            const isNewer = isVersionNewer(latestVersion, currentVersion);
            log?.(`Comparing versions: ${latestVersion} (latest) vs ${currentVersion} (current). Is newer? ${isNewer}`);

            setState({
                ...initialState,
                currentVersion: currentVersionTag,
                isUpdateAvailable: isNewer,
                latestVersionInfo: { tagName: latestVersionTag, htmlUrl: latestRelease.html_url },
                lastChecked: new Date(),
            });

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            log?.(`Update check failed: ${errorMessage}`);
            setState((s) => ({
                ...s,
                isLoading: false,
                error: errorMessage,
                lastChecked: new Date(),
            }));
        }
    };

    return { state, check };
};