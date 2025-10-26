import {createContext, useContext, useState} from 'react';
import {check, type Update} from '@tauri-apps/plugin-updater';
import {relaunch} from '@tauri-apps/plugin-process';
import {showNotification} from '@mantine/notifications';
import {isTauri} from '@tauri-apps/api/core';

export type UpdateStatus =
    | 'idle'
    | 'checking'
    | 'found'
    | 'not-found'
    | 'downloading'
    | 'installing'
    | 'error';

interface DownloadProgress {
    downloaded: number;
    total: number | null;
}

interface UpdaterState {
    status: UpdateStatus;
    error: string | null;
    progress: DownloadProgress;
    updateInfo: Update | null;
    isModalOpen: boolean;
    checkUpdate: (isManual?: boolean) => Promise<void>;
    startInstall: () => Promise<void>;
    closeModal: () => void;
}

const UpdaterContext = createContext<UpdaterState | undefined>(undefined);

export const useUpdater = (): UpdaterState => {
    const context = useContext(UpdaterContext);
    if (!context) {
        throw new Error('useUpdater must be used within an UpdaterProvider');
    }
    return context;
};

export const UpdaterProvider = ({children}: { children: React.ReactNode }) => {
    const [status, setStatus] = useState<UpdateStatus>('idle');
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState<DownloadProgress>({downloaded: 0, total: null});
    const [updateInfo, setUpdateInfo] = useState<Update | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const checkUpdate = async (isManual = false) => {
        if (!isTauri()) {
            if (isManual) {
                showNotification({
                    title: 'Update Check Unavailable',
                    message: 'Updates can only be checked in the desktop app.',
                    color: 'yellow'
                });
            }
            return;
        }

        setStatus('checking');
        setError(null);
        try {
            const update = await check();
            if (update) {
                setUpdateInfo(update);
                setStatus('found');
                setIsModalOpen(true);
            } else {
                setStatus('not-found');
                if (isManual) {
                    showNotification({
                        title: 'No Updates Available',
                        message: 'You are already running the latest version.',
                        color: 'green',
                    });
                }
            }
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : String(e);
            setError(`Failed to check for updates: ${errorMessage}`);
            setStatus('error');
            if (isManual) {
                showNotification({
                    title: 'Update Check Failed',
                    message: errorMessage,
                    color: 'red',
                });
            }
        }
    };

    const startInstall = async () => {
        if (!updateInfo) return;

        setStatus('downloading');
        try {
            await updateInfo.downloadAndInstall((event) => {
                switch (event.event) {
                    case 'Started':
                        setProgress({downloaded: 0, total: event.data.contentLength ?? null});
                        break;
                    case 'Progress':
                        setProgress((p) => ({...p, downloaded: p.downloaded + event.data.chunkLength}));
                        break;
                    case 'Finished':
                        setStatus('installing');
                        break;
                }
            });
            await relaunch();
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : String(e);
            setError(`Failed to install update: ${errorMessage}`);
            setStatus('error');
            showNotification({
                title: 'Update Installation Failed',
                message: errorMessage,
                color: 'red',
            });
        }
    };

    const value: UpdaterState = {
        status,
        error,
        progress,
        updateInfo,
        isModalOpen,
        checkUpdate,
        startInstall,
        closeModal: () => setIsModalOpen(false),
    };

    return <UpdaterContext.Provider value={value}>{children}</UpdaterContext.Provider>;
};