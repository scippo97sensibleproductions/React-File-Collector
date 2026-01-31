import {
    AppShell,
    Box,
    Burger,
    Button,
    Group,
    Modal,
    rem,
    Stack,
    Text,
    ThemeIcon,
    Title
} from "@mantine/core";
import { createRootRoute, Outlet } from '@tanstack/react-router';
import { useDisclosure } from "@mantine/hooks";
import { IconArrowUpRightCircle, IconCode, IconDownload } from "@tabler/icons-react";
import { useEffect } from "react";
import { ThemeToggle } from "../layout/ThemeToggle.tsx";
import { NavMenu } from "../layout/NavMenu.tsx";
import { useUpdater } from "../hooks/useUpdater.tsx";
import { TitleBar } from "../components/TitleBar.tsx";

const UpdatePromptModal = () => {
    const { isModalOpen, closeModal, startInstall, updateInfo, status } = useUpdater();

    if (!updateInfo) {
        return null;
    }

    return (
        <Modal
            centered
            closeOnClickOutside={true}
            opened={isModalOpen}
            title="Update Available!"
            onClose={closeModal}
        >
            <Stack gap="lg">
                <Group>
                    <ThemeIcon gradient={{ from: 'teal', to: 'blue' }} size="xl" variant="gradient">
                        <IconArrowUpRightCircle style={{ width: rem(32), height: rem(32) }} />
                    </ThemeIcon>
                    <div>
                        <Text fw={500}>A new version of File Collector is ready.</Text>
                        <Text c="dimmed" size="sm">
                            Version {updateInfo.version} is available. You are running {updateInfo.currentVersion}.
                        </Text>
                    </div>
                </Group>
                <Button
                    fullWidth
                    gradient={{ from: 'blue', to: 'cyan' }}
                    leftSection={<IconDownload size={18} />}
                    loading={status === 'downloading' || status === 'installing'}
                    variant="gradient"
                    onClick={startInstall}
                >
                    {status === 'downloading' ? 'Downloading...' :
                        status === 'installing' ? 'Installing...' : 'Download and Install'}
                </Button>
            </Stack>
        </Modal>
    );
};

const RootLayout = () => {
    const [opened, { toggle, close }] = useDisclosure();
    const { checkUpdate } = useUpdater();

    useEffect(() => {
        // Run a silent check on mount.
        // If an update is found but was previously ignored, the modal will NOT open.
        checkUpdate(true);
    }, [checkUpdate]);

    return (
        <>
            <TitleBar />
            <UpdatePromptModal />
            <Box>
                <AppShell
                    header={{ height: 60 }}
                    layout="alt"
                    navbar={{ width: 200, breakpoint: 'sm', collapsed: { mobile: !opened } }}
                    padding="md"
                    styles={{
                        root: {
                            height: '100vh',
                            overflow: 'hidden',
                        },
                        navbar: {
                            top: 30,
                            height: 'calc(100vh - 30px)',
                        },
                        header: {
                            top: 30,
                        },
                        main: {
                            paddingTop: 'calc(var(--app-shell-header-height) + 30px)',
                            paddingBottom: 0,
                            height: '100vh',
                            overflow: 'hidden'
                        }
                    }}
                >
                    <AppShell.Header>
                        <Group h="100%" px="md">
                            <Burger hiddenFrom="sm" opened={opened} size="sm" onClick={toggle} />
                            <IconCode />
                            <Title order={4}>File Collector</Title>
                        </Group>
                    </AppShell.Header>

                    <AppShell.Navbar p="md">
                        <Stack h="100%" justify="space-between">
                            <Box>
                                <NavMenu onNavigate={close} />
                            </Box>
                            <ThemeToggle />
                        </Stack>
                    </AppShell.Navbar>

                    <AppShell.Main>
                        <Outlet />
                    </AppShell.Main>
                </AppShell>
            </Box>
        </>
    );
}

export const Route = createRootRoute({ component: RootLayout });