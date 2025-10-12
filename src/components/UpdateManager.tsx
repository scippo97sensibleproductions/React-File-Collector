import { useState } from 'react';
import {
    Button,
    Stack,
    Text,
    Group,
    Loader,
    Alert,
    ThemeIcon,
    rem,
    Paper,
    Title,
    Timeline,
    Box,
} from '@mantine/core';
import {
    IconCloudDownload,
    IconAlertCircle,
    IconCircleCheck,
    IconInfoCircle,
    IconGitBranch,
    IconRocket,
} from '@tabler/icons-react';
import { open } from '@tauri-apps/plugin-shell';
import { useUpdateCheck } from '../hooks/useUpdateCheck.ts';

const DevLogger = ({ logs }: { logs: string[] }) => (
    <Paper withBorder p="md" mt="lg">
        <Title order={6}>Developer Log</Title>
        <Timeline active={logs.length} bulletSize={18} lineWidth={2} mt="sm">
            {logs.map((log, index) => (
                <Timeline.Item key={index} bullet={<IconInfoCircle size={10} />} title={log}>
                    <Text c="dimmed" size="xs">Step {index + 1}</Text>
                </Timeline.Item>
            ))}
        </Timeline>
    </Paper>
);

export const UpdateManager = () => {
    const [logs, setLogs] = useState<string[]>([]);
    const log = (message: string) => {
        if (import.meta.env.DEV) {
            setLogs(prev => [...prev, message]);
        }
    };

    const { state, check } = useUpdateCheck(log);

    const handleCheck = () => {
        setLogs([]);
        check();
    };

    const renderStatus = () => {
        if (state.isLoading) {
            return (
                <Group>
                    <Loader size="sm" />
                    <Text>Checking for updates...</Text>
                </Group>
            );
        }

        if (state.error) {
            return (
                <Alert icon={<IconAlertCircle size="1rem" />} title="Error" color="red">
                    {state.error}
                </Alert>
            );
        }

        if (state.lastChecked) {
            if (state.isUpdateAvailable) {
                return (
                    <Alert
                        icon={<IconRocket size="1rem" />}
                        title="Update Available!"
                        color="green"
                    >
                        Version {state.latestVersionInfo?.tagName} is available. You are on {state.currentVersion}.
                    </Alert>
                );
            }
            return (
                <Alert icon={<IconCircleCheck size="1rem" />} title="Up to Date" color="teal">
                    You are running the latest version: {state.currentVersion}.
                </Alert>
            );
        }

        return <Text c="dimmed">Click the button to check for the latest version.</Text>;
    };

    return (
        <Stack>
            <Group>
                <ThemeIcon size="xl" variant="gradient" gradient={{ from: 'blue', to: 'cyan' }}>
                    <IconCloudDownload style={{ width: rem(32), height: rem(32) }} />
                </ThemeIcon>
                <div>
                    <Title order={3}>Application Updates</Title>
                    <Text c="dimmed">Check for new versions of File Collector.</Text>
                </div>
            </Group>

            <Paper withBorder shadow="sm" p="md">
                <Stack>
                    <Group justify="space-between">
                        <Box>
                            <Text fw={500}>Current Version</Text>
                            <Text c="dimmed" ff="monospace" size="sm">{state.currentVersion || 'N/A'}</Text>
                        </Box>
                        <Box>
                            <Text fw={500} ta="right">Latest Version</Text>
                            <Text c="dimmed" ff="monospace" size="sm">{state.latestVersionInfo?.tagName || 'N/A'}</Text>
                        </Box>
                    </Group>

                    <Box mt="md">{renderStatus()}</Box>

                    <Group justify="flex-end" mt="md">
                        {state.isUpdateAvailable && state.latestVersionInfo?.htmlUrl && (
                            <Button
                                leftSection={<IconGitBranch size={18} />}
                                onClick={() => open(state.latestVersionInfo!.htmlUrl)}
                                variant="gradient"
                                gradient={{ from: 'grape', to: 'violet' }}
                            >
                                Go to Release Page
                            </Button>
                        )}
                        <Button onClick={handleCheck} disabled={state.isLoading}>
                            Check for Updates
                        </Button>
                    </Group>
                </Stack>
            </Paper>

            {import.meta.env.DEV && logs.length > 0 && <DevLogger logs={logs} />}
        </Stack>
    );
};