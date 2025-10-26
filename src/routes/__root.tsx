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
} from "@mantine/core"
import {createRootRoute, Outlet} from '@tanstack/react-router'
import {ThemeToggle} from "../layout/ThemeToggle.tsx";
import {NavMenu} from "../layout/NavMenu.tsx";
import {useDisclosure} from "@mantine/hooks";
import {IconArrowUpRightCircle, IconCode, IconDownload} from "@tabler/icons-react";
import {useEffect} from "react";
import {useUpdater} from "../hooks/useUpdater.tsx";

const UpdatePromptModal = () => {
    const {isModalOpen, closeModal, startInstall, updateInfo, status} = useUpdater();

    if (!updateInfo) {
        return null;
    }

    return (
        <Modal centered opened={isModalOpen} title={<Title order={4}>Update Available!</Title>} onClose={closeModal}>
            <Stack gap="lg">
                <Group>
                    <ThemeIcon gradient={{from: 'teal', to: 'blue'}} size="xl" variant="gradient">
                        <IconArrowUpRightCircle style={{width: rem(32), height: rem(32)}}/>
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
                    gradient={{from: 'blue', to: 'cyan'}}
                    leftSection={<IconDownload size={18}/>}
                    loading={status === 'downloading' || status === 'installing'}
                    variant="gradient"
                    onClick={startInstall}
                >
                    Download and Install
                </Button>
            </Stack>
        </Modal>
    );
};

const RootLayout = () => {
    const [opened, {toggle, close}] = useDisclosure();
    const {checkUpdate} = useUpdater();

    useEffect(() => {
        checkUpdate(false);
    }, [checkUpdate]);

    return (
        <>
            <UpdatePromptModal/>
            <AppShell
                header={{height: 60}}
                layout="alt"
                navbar={{width: 200, breakpoint: 'sm', collapsed: {mobile: !opened}}}
                padding="md"
            >
                <AppShell.Header>
                    <Group h="100%" px="md">
                        <Burger hiddenFrom="sm" opened={opened} size="sm" onClick={toggle}/>
                        <IconCode/>
                        <Title order={4}>File Collector</Title>
                    </Group>
                </AppShell.Header>

                <AppShell.Navbar p="md">
                    <Stack h="100%" justify="space-between">
                        <Box>
                            <NavMenu onNavigate={close}/>
                        </Box>
                        <ThemeToggle/>
                    </Stack>
                </AppShell.Navbar>

                <AppShell.Main>
                    <Outlet/>
                </AppShell.Main>
            </AppShell>
        </>
    );
}

export const Route = createRootRoute({component: RootLayout})