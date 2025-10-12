import { useEffect } from 'react';
import { Modal, Text, Button, Group, Stack, Title, ThemeIcon, rem } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconArrowUpRightCircle, IconDownload } from '@tabler/icons-react';
import { open } from '@tauri-apps/plugin-shell';
import { useUpdateCheck } from '../hooks/useUpdateCheck.ts';

export const UpdateNotifier = () => {
    const [opened, { open: openModal, close }] = useDisclosure(false);
    const { state, check } = useUpdateCheck();

    useEffect(() => {
        const runCheck = async () => {
            if (!import.meta.env.DEV) {
                await check();
            }
        };
        runCheck();
    }, [check]);

    useEffect(() => {
        if (state.isUpdateAvailable) {
            openModal();
        }
    }, [state.isUpdateAvailable, openModal]);

    if (import.meta.env.DEV || !state.isUpdateAvailable || !state.latestVersionInfo) {
        return null;
    }

    return (
        <Modal opened={opened} onClose={close} title={<Title order={4}>Update Available!</Title>} centered>
            <Stack gap="lg">
                <Group>
                    <ThemeIcon size="xl" variant="gradient" gradient={{ from: 'teal', to: 'blue' }}>
                        <IconArrowUpRightCircle style={{ width: rem(32), height: rem(32) }} />
                    </ThemeIcon>
                    <div>
                        <Text fw={500}>A new version of File Collector is ready.</Text>
                        <Text size="sm" c="dimmed">
                            You are on version {state.currentVersion}, but {state.latestVersionInfo.tagName} is available.
                        </Text>
                    </div>
                </Group>
                <Button
                    fullWidth
                    leftSection={<IconDownload size={18} />}
                    onClick={() => open(state.latestVersionInfo!.htmlUrl)}
                    variant="gradient"
                    gradient={{ from: 'blue', to: 'cyan' }}
                >
                    Go to Download Page
                </Button>
            </Stack>
        </Modal>
    );
};