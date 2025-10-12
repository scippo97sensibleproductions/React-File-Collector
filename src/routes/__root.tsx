import {AppShell, Box, Burger, Group, Stack, Title} from "@mantine/core"
import {createRootRoute, Outlet} from '@tanstack/react-router'
import {ThemeToggle} from "../layout/ThemeToggle.tsx";
import {NavMenu} from "../layout/NavMenu.tsx";
import {useDisclosure} from "@mantine/hooks";
import {IconCode} from "@tabler/icons-react";
import {UpdateNotifier} from "../components/UpdateNotifier.tsx";

const RootLayout = () => {
    const [opened, {toggle, close}] = useDisclosure();

    return (
        <>
            <UpdateNotifier/>
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