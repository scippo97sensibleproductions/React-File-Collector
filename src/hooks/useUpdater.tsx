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

type UpdateStatus = 'idle' | 'checking' | 'downloading' | 'installing' | 'error';

interface UpdaterContextType {
    status: UpdateStatus;
    updateInfo: UpdateInfo | null;
    isModalOpen: boolean;
    checkUpdate: (silent?: boolean) => Promise<void>;
    startInstall: () => Promise<void>;
    closeModal: () => void;
}

const UpdaterContext = createContext<UpdaterContextType | null>(null);

const IGNORED_VERSION_KEY = 'file-collector-ignored-update';

export const UpdaterProvider = ({ children }: { children: ReactNode }) => {
    const [status, setStatus] = useState<UpdateStatus>('idle');
    const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [rawUpdate, setRawUpdate] = useState<Update | null>(null);

    const checkUpdate = useCallback(async (silent: boolean = false) => {
        if (status === 'downloading' || status === 'installing') return;

        setStatus('checking');
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

                // Show modal if:
                // 1. It's a manual check (!silent), OR
                // 2. The version hasn't been ignored by the user
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
        } catch (error) {
            console.error('Failed to check for updates:', error);
            if (!silent) {
                notifications.show({
                    title: 'Update Check Failed',
                    message: 'Could not check for updates.',
                    color: 'red',
                });
            }
            setStatus('error');
        } finally {
            setStatus('idle');
        }
    }, [status]);

    const startInstall = useCallback(async () => {
        if (!rawUpdate) return;

        try {
            setStatus('downloading');
            // Provide a dummy callback if one is required by the specific version of the plugin,
            // or rely on the promise resolution.
            await rawUpdate.downloadAndInstall((event) => {
                if (event.event === 'Started') {
                    setStatus('downloading');
                } else if (event.event === 'Finished') {
                    setStatus('installing');
                }
            });

            setStatus('installing');
            await relaunch();
        } catch (error) {
            console.error('Failed to install update:', error);
            setStatus('error');
            notifications.show({
                title: 'Update Failed',
                message: 'Failed to download or install the update.',
                color: 'red',
            });
        } finally {
            setStatus('idle');
        }
    }, [rawUpdate]);

    const closeModal = useCallback(() => {
        setIsModalOpen(false);
        if (updateInfo?.version) {
            // Persist the dismissal: User explicitly closed the modal, so we ignore this version in the future.
            localStorage.setItem(IGNORED_VERSION_KEY, updateInfo.version);
        }
    }, [updateInfo]);

    return (
        <UpdaterContext.Provider
            value={{
                status,
                updateInfo,
                isModalOpen,
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