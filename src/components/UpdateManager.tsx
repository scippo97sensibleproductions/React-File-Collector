import {useState} from 'react';
import {Alert, Box, Button, Group, Loader, Paper, rem, Stack, Text, ThemeIcon, Timeline, Title,} from '@mantine/core';
import {
    IconAlertCircle,
    IconCircleCheck,
    IconCloudDownload,
    IconGitBranch,
    IconInfoCircle,
    IconRocket,
} from '@tabler/icons-react';
import {open} from '@tauri-apps/plugin-shell';
import {useUpdateCheck} from '../hooks/useUpdateCheck.ts';

interface LogItem {
    id: string;
    message: string;
}

const DevLogger = ({logs}: { logs: LogItem[] }) => (
    <Paper withBorder mt="lg" p="md">
        <Title order={6}>Developer Log</Title>
        <Timeline active={logs.length} bulletSize={18} lineWidth={2} mt="sm">
            {logs.map((logItem, index) => (
                <Timeline.Item key={logItem.id} bullet={<IconInfoCircle size={10}/>} title={logItem.message}>
                    <Text c="dimmed" size="xs">Step {index + 1}</Text>
                </Timeline.Item>
            ))}
        </Timeline>
    </Paper>
);

export const UpdateManager = () => {
    const [logs, setLogs] = useState<LogItem[]>([]);
    const log = (message: string) => {
        if (import.meta.env.DEV) {
            setLogs(prev => [...prev, {id: crypto.randomUUID(), message}]);
        }
    };

    const {state, check} = useUpdateCheck(log);

    const handleCheck = () => {
        setLogs([]);
        check();
    };

    const renderStatus = () => {
        if (state.isLoading) {
            return (
                <Group>
                    <Loader size="sm"/>
                    <Text>Checking for updates...</Text>
                </Group>
            );
        }

        if (state.error) {
            return (
                <Alert color="red" icon={<IconAlertCircle size="1rem"/>} title="Error">
                    {state.error}
                </Alert>
            );
        }

        if (state.lastChecked) {
            if (state.isUpdateAvailable) {
                return (
                    <Alert
                        color="green"
                        icon={<IconRocket size="1rem"/>}
                        title="Update Available!"
                    >
                        Version {state.latestVersionInfo?.tagName} is available. You are on {state.currentVersion}.
                    </Alert>
                );
            }
            return (
                <Alert color="teal" icon={<IconCircleCheck size="1rem"/>} title="Up to Date">
                    You are running the latest version: {state.currentVersion}.
                </Alert>
            );
        }

        return <Text c="dimmed">Click the button to check for the latest version.</Text>;
    };

    return (
        <Stack>
            <Group>
                <ThemeIcon gradient={{from: 'blue', to: 'cyan'}} size="xl" variant="gradient">
                    <IconCloudDownload style={{width: rem(32), height: rem(32)}}/>
                </ThemeIcon>
                <div>
                    <Title order={3}>Application Updates</Title>
                    <Text c="dimmed">Check for new versions of File Collector.</Text>
                </div>
            </Group>

            <Paper withBorder p="md" shadow="sm">
                <Stack>
                    <Group justify="space-between">
                        <Box>
                            <Text fw={500}>Current Version</Text>
                            <Text c="dimmed" ff="monospace" size="sm">{state.currentVersion ?? 'N/A'}</Text>
                        </Box>
                        <Box>
                            <Text fw={500} ta="right">Latest Version</Text>
                            <Text c="dimmed" ff="monospace" size="sm">{state.latestVersionInfo?.tagName ?? 'N/A'}</Text>
                        </Box>
                    </Group>

                    <Box mt="md">{renderStatus()}</Box>

                    <Group justify="flex-end" mt="md">
                        {state.isUpdateAvailable && state.latestVersionInfo?.htmlUrl && (
                            <Button
                                gradient={{from: 'grape', to: 'violet'}}
                                leftSection={<IconGitBranch size={18}/>}
                                variant="gradient"
                                onClick={() => open(state.latestVersionInfo!.htmlUrl)}
                            >
                                Go to Release Page
                            </Button>
                        )}
                        <Button disabled={state.isLoading} onClick={handleCheck}>
                            Check for Updates
                        </Button>
                    </Group>
                </Stack>
            </Paper>

            {import.meta.env.DEV && logs.length > 0 && <DevLogger logs={logs}/>}
        </Stack>
    );
};