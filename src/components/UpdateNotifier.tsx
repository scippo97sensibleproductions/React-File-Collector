import { useEffect, useState } from 'react';
import { Modal, Text, Button, Group, Stack, Title, ThemeIcon, rem } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconArrowUpRightCircle, IconDownload } from '@tabler/icons-react';
import { getVersion } from '@tauri-apps/api/app';
import { fetch } from '@tauri-apps/plugin-http';
import { open } from '@tauri-apps/plugin-shell';
import type { GitHubRelease } from '../models/GitHubRelease.ts';

const REPO_URL = import.meta.env.VITE_GITHUB_REPO_URL;
const GITHUB_API_URL = `https://api.github.com/repos/${REPO_URL}/releases/latest`;

const isVersionNewer = (latest: string, current: string): boolean => {
    const latestParts = latest.replace('v', '').split('.').map(Number);
    const currentParts = current.split('.').map(Number);

    for (let i = 0; i < Math.max(latestParts.length, currentParts.length); i++) {
        const latestPart = latestParts[i] || 0;
        const currentPart = currentParts[i] || 0;
        if (latestPart > currentPart) return true;
        if (latestPart < currentPart) return false;
    }
    return false;
};

export const UpdateNotifier = () => {
    const [opened, { open: openModal, close }] = useDisclosure(false);
    const [latestVersion, setLatestVersion] = useState('');
    const [currentVersion, setCurrentVersion] = useState('');
    const [releaseUrl, setReleaseUrl] = useState('');

    useEffect(() => {
        const checkForUpdate = async () => {
            try {
                const current = await getVersion();
                setCurrentVersion(current);

                const response = await fetch(GITHUB_API_URL, {
                    method: 'GET',
                    headers: { 'User-Agent': 'FileCollector-App-Updater' },
                });

                if (!response.ok) return;

                const latestRelease = (await response.json()) as GitHubRelease;

                if (!latestRelease?.tag_name) return;

                const latest = latestRelease.tag_name;

                if (isVersionNewer(latest, current)) {
                    setLatestVersion(latest);
                    setReleaseUrl(latestRelease.html_url);
                    openModal();
                }
            } catch {
                // Fails silently on network error or API failure.
            }
        };

        if (!import.meta.env.DEV) {
            checkForUpdate();
        }
    }, [openModal]);

    if (import.meta.env.DEV) {
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
                            You are on version {currentVersion}, but {latestVersion} is available.
                        </Text>
                    </div>
                </Group>
                <Button
                    fullWidth
                    leftSection={<IconDownload size={18} />}
                    onClick={() => open(releaseUrl)}
                    variant="gradient"
                    gradient={{ from: 'blue', to: 'cyan' }}
                >
                    Go to Download Page
                </Button>
            </Stack>
        </Modal>
    );
};