import {useEffect} from 'react';
import {Button, Group, Modal, rem, Stack, Text, ThemeIcon, Title} from '@mantine/core';
import {useDisclosure} from '@mantine/hooks';
import {IconArrowUpRightCircle, IconDownload} from '@tabler/icons-react';
import {open} from '@tauri-apps/plugin-shell';
import {useUpdateCheck} from '../hooks/useUpdateCheck.ts';

export const UpdateNotifier = () => {
    const [opened, {open: openModal, close}] = useDisclosure(false);
    const {state, check} = useUpdateCheck();

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
        <Modal centered opened={opened} title={<Title order={4}>Update Available!</Title>} onClose={close}>
            <Stack gap="lg">
                <Group>
                    <ThemeIcon gradient={{from: 'teal', to: 'blue'}} size="xl" variant="gradient">
                        <IconArrowUpRightCircle style={{width: rem(32), height: rem(32)}}/>
                    </ThemeIcon>
                    <div>
                        <Text fw={500}>A new version of File Collector is ready.</Text>
                        <Text c="dimmed" size="sm">
                            You are on version {state.currentVersion}, but {state.latestVersionInfo.tagName} is
                            available.
                        </Text>
                    </div>
                </Group>
                <Button
                    fullWidth
                    gradient={{from: 'blue', to: 'cyan'}}
                    leftSection={<IconDownload size={18}/>}
                    variant="gradient"
                    onClick={() => open(state.latestVersionInfo!.htmlUrl)}
                >
                    Go to Download Page
                </Button>
            </Stack>
        </Modal>
    );
};