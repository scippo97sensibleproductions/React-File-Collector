import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { check, type Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { notifications } from '@mantine/notifications';

interface UpdateInfo {
    version: string;
    currentVersion: string;
    body?: string;
    date?: string;
}

interface UpdateProgress {
    downloaded: number;
    total: number;
}

type UpdateStatus = 'idle' | 'checking' | 'downloading' | 'installing' | 'error';

interface UpdaterContextType {
    status: UpdateStatus;
    updateInfo: UpdateInfo | null;
    isModalOpen: boolean;
    error: string | null;
    progress: UpdateProgress;
    checkUpdate: (silent?: boolean) => Promise<void>;
    startInstall: () => Promise<void>;
    closeModal: () => void;
}

const UpdaterContext = createContext<UpdaterContextType | null>(null);

const IGNORED_VERSION_KEY = 'file-collector-ignored-update';

export const UpdaterProvider = ({ children }: { children: ReactNode }) => {
    const [status, setStatus] = useState<UpdateStatus>('idle');
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState<UpdateProgress>({ downloaded: 0, total: 0 });
    const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [rawUpdate, setRawUpdate] = useState<Update | null>(null);

    const checkUpdate = useCallback(async (silent: boolean = false) => {
        if (status === 'downloading' || status === 'installing') return;

        setStatus('checking');
        setError(null);

        try {
            const update = await check();

            if (update && update.available) {
                const info: UpdateInfo = {
                    version: update.version,
                    currentVersion: update.currentVersion,
                    body: update.body,
                    date: update.date,
                };

                setRawUpdate(update);
                setUpdateInfo(info);

                const ignoredVersion = localStorage.getItem(IGNORED_VERSION_KEY);

                if (!silent || update.version !== ignoredVersion) {
                    setIsModalOpen(true);
                }
            } else if (!silent) {
                notifications.show({
                    title: 'Up to date',
                    message: 'You are running the latest version.',
                    color: 'blue',
                });
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error('Failed to check for updates:', err);
            setError(msg);
            if (!silent) {
                notifications.show({
                    title: 'Update Check Failed',
                    message: 'Could not check for updates.',
                    color: 'red',
                });
            }
            setStatus('error');
        } finally {
            if (status !== 'error') {
                setStatus('idle');
            }
        }
    }, [status]);

    const startInstall = useCallback(async () => {
        if (!rawUpdate) return;

        setStatus('downloading');
        setError(null);
        setProgress({ downloaded: 0, total: 0 });

        try {
            let downloadedBytes = 0;
            let totalBytes = 0;

            await rawUpdate.downloadAndInstall((event) => {
                switch (event.event) {
                    case 'Started':
                        totalBytes = event.data.contentLength ?? 0;
                        setProgress({ downloaded: 0, total: totalBytes });
                        break;
                    case 'Progress':
                        downloadedBytes += event.data.chunkLength;
                        setProgress({ downloaded: downloadedBytes, total: totalBytes });
                        break;
                    case 'Finished':
                        setStatus('installing');
                        break;
                }
            });

            setStatus('installing');
            await relaunch();
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error('Failed to install update:', err);
            setError(msg);
            setStatus('error');
            notifications.show({
                title: 'Update Failed',
                message: 'Failed to download or install the update.',
                color: 'red',
            });
        } finally {
            if (status !== 'installing') {
                setStatus('idle');
            }
        }
    }, [rawUpdate, status]);

    const closeModal = useCallback(() => {
        setIsModalOpen(false);
        if (updateInfo?.version) {
            localStorage.setItem(IGNORED_VERSION_KEY, updateInfo.version);
        }
    }, [updateInfo]);

    return (
        <UpdaterContext.Provider
            value={{
                status,
                updateInfo,
                isModalOpen,
                error,
                progress,
                checkUpdate,
                startInstall,
                closeModal,
            }}
        >
            {children}
        </UpdaterContext.Provider>
    );
}

export function useUpdater() {
    const context = useContext(UpdaterContext);
    if (!context) {
        throw new Error('useUpdater must be used within an UpdaterProvider');
    }
    return context;
}