import {Button, Group, Progress, Stack, Text} from "@mantine/core";
import {useUpdater} from "../hooks/useUpdater.tsx";

export const UpdateManager = () => {
    const {status, error, progress, checkUpdate} = useUpdater();

    const getDownloadPercentage = () => {
        if (!progress.total || progress.total === 0) {
            return 0;
        }
        return (progress.downloaded / progress.total) * 100;
    };

    const isBusy = status === "checking" || status === "downloading" || status === "installing";
    const downloadedMB = (progress.downloaded / 1024 / 1024).toFixed(2);
    const totalMB = progress.total ? (progress.total / 1024 / 1024).toFixed(2) : null;

    return (
        <Stack>
            <Group>
                <Button disabled={isBusy} onClick={() => checkUpdate(true)}>
                    Check for Updates
                </Button>
            </Group>

            {status === "checking" && <Text>Checking for updates...</Text>}
            {status === "downloading" && (
                <Stack gap="xs">
                    <Text>Downloading update...</Text>
                    <Progress animated value={getDownloadPercentage()}/>
                    <Text size="xs">
                        {`${downloadedMB} MB / ${totalMB ? `${totalMB} MB` : "Unknown size"}`}
                    </Text>
                </Stack>
            )}
            {status === "installing" && <Text>Installing update... The application will restart.</Text>}
            {status === "error" && <Text c="red">{error}</Text>}
        </Stack>
    );
};