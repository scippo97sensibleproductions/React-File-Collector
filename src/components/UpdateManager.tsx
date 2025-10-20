import { useState } from "react";
import { Button, Text, Progress, Group, Stack } from "@mantine/core";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { showNotification } from "@mantine/notifications";

type UpdateStatus =
    | "idle"
    | "checking"
    | "found"
    | "not-found"
    | "downloading"
    | "installing"
    | "error";

interface DownloadProgress {
    downloaded: number;
    contentLength: number | null;
}

export const UpdateManager = () => {
    const [status, setStatus] = useState<UpdateStatus>("idle");
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState<DownloadProgress>({
        downloaded: 0,
        contentLength: null,
    });

    const handleCheckForUpdate = async () => {
        setStatus("checking");
        setError(null);

        try {
            const update = await check();

            if (!update) {
                setStatus("not-found");
                showNotification({
                    title: "No Updates Available",
                    message: "You are already running the latest version.",
                    color: "green",
                });
                return;
            }

            setStatus("found");
            const confirmation = window.confirm(
                `Update to version ${update.version} is available. Do you want to download and install it now?`,
            );

            if (confirmation) {
                await handleDownloadAndInstall(update);
            } else {
                setStatus("idle");
            }
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : String(e);
            setError(`Failed to check for updates: ${errorMessage}`);
            setStatus("error");
            showNotification({
                title: "Update Check Failed",
                message: errorMessage,
                color: "red",
            });
        }
    };

    const handleDownloadAndInstall = async (update: Awaited<ReturnType<typeof check>>) => {
        if (!update) return;

        setStatus("downloading");
        try {
            await update.downloadAndInstall((event) => {
                switch (event.event) {
                    case "Started":
                        setProgress({
                            downloaded: 0,
                            contentLength: event.data.contentLength ?? null,
                        });
                        break;
                    case "Progress":
                        setProgress((prev) => ({
                            ...prev,
                            downloaded: prev.downloaded + event.data.chunkLength,
                        }));
                        break;
                    case "Finished":
                        setStatus("installing");
                        break;
                }
            });

            // On Windows, the installer quits the app automatically.
            // On other platforms, a manual relaunch is needed.
            if (navigator.userAgent.indexOf("Win") === -1) {
                await relaunch();
            }

        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : String(e);
            setError(`Failed to install update: ${errorMessage}`);
            setStatus("error");
            showNotification({
                title: "Update Installation Failed",
                message: errorMessage,
                color: "red",
            });
        }
    };

    const getDownloadPercentage = () => {
        if (!progress.contentLength || progress.contentLength === 0) {
            return 0;
        }
        return (progress.downloaded / progress.contentLength) * 100;
    };

    return (
        <Stack>
            <Group>
                <Button
                    disabled={status === "checking" || status === "downloading" || status === "installing"}
                    onClick={handleCheckForUpdate}
                >
                    Check for Updates
                </Button>
            </Group>

            {status === "checking" && <Text>Checking for updates...</Text>}
            {status === "downloading" && (
                <Stack gap="xs">
                    <Text>Downloading update...</Text>
                    <Progress animated value={getDownloadPercentage()} />
                    <Text size="xs">
                        {`${(progress.downloaded / 1024 / 1024).toFixed(2)} MB / ${
                            progress.contentLength
                                ? `${(progress.contentLength / 1024 / 1024).toFixed(2)} MB`
                                : "Unknown size"
                        }`}
                    </Text>
                </Stack>
            )}
            {status === "installing" && <Text>Installing update... The application will restart.</Text>}
            {status === "error" && <Text c="red">{error}</Text>}
        </Stack>
    );
};