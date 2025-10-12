import { useState, useCallback } from 'react';
import { getVersion } from '@tauri-apps/api/app';
import { fetch } from '@tauri-apps/plugin-http';
import type { GitHubRelease } from '../models/GitHubRelease.ts';

const REPO_URL = import.meta.env.VITE_GITHUB_REPO_URL;
const GITHUB_API_URL = `https://api.github.com/repos/${REPO_URL}/releases/latest`;

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

const isVersionNewer = (latest: string, current: string): boolean => {
    const semverRegex = /[0-9]+\.[0-9]+\.[0-9]+/;
    const latestMatch = latest.match(semverRegex)?.[0];
    const currentMatch = current.match(semverRegex)?.[0];

    if (!latestMatch || !currentMatch) {
        return false;
    }

    const latestParts = latestMatch.split('.').map(Number);
    const currentParts = currentMatch.split('.').map(Number);

    for (let i = 0; i < 3; i++) {
        const latestPart = latestParts[i];
        const currentPart = currentParts[i];
        if (latestPart > currentPart) return true;
        if (latestPart < currentPart) return false;
    }

    return false;
};

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

    const check = useCallback(async () => {
        log?.('Starting update check...');
        setState((s) => ({ ...s, isLoading: true, error: null }));

        try {
            log?.('Fetching current application version...');
            const current = await getVersion();
            setState((s) => ({ ...s, currentVersion: current }));
            log?.(`Current version identified: ${current}`);

            log?.(`Fetching latest release data from: ${GITHUB_API_URL}`);
            const response = await fetch(GITHUB_API_URL, {
                method: 'GET',
                headers: { 'User-Agent': 'FileCollector-App-Updater' },
            });

            const responseData = (await response.json()) as unknown;

            if (!response.ok) {
                const errorMessage = (responseData as { message?: string })?.message ?? 'No message.';
                const errorMsg = `GitHub API request failed with status: ${response.status}. Message: ${errorMessage}`;
                log?.(`Error: ${errorMsg}`);
                throw new Error(errorMsg);
            }

            const latestRelease = responseData as GitHubRelease;
            log?.(`Successfully fetched release data. Latest tag: ${latestRelease.tag_name}`);

            if (!latestRelease?.tag_name) {
                const errorMsg = 'Latest release data is missing a tag_name.';
                log?.(`Error: ${errorMsg}`);
                throw new Error(errorMsg);
            }

            const latest = latestRelease.tag_name;
            const isNewer = isVersionNewer(latest, current);
            log?.(`Comparing versions: ${latest} (latest) vs ${current} (current). Is newer? ${isNewer}`);

            setState((s) => ({
                ...s,
                isLoading: false,
                isUpdateAvailable: isNewer,
                latestVersionInfo: { tagName: latest, htmlUrl: latestRelease.html_url },
                lastChecked: new Date(),
            }));
            log?.('Update check complete.');
        } catch (err) {
            let errorMessage: string;
            if (err instanceof Error) {
                errorMessage = err.message;
            } else if (typeof err === 'string') {
                errorMessage = err;
            } else {
                try {
                    errorMessage = `A non-error object was thrown: ${JSON.stringify(err)}`;
                } catch {
                    errorMessage = 'An unknown, non-serializable error occurred.';
                }
            }

            log?.(`Update check failed: ${errorMessage}`);
            setState((s) => ({
                ...s,
                isLoading: false,
                error: errorMessage,
                lastChecked: new Date(),
            }));
        }
    }, [log]);

    return { state, check };
};