import { AppShell, Box, Burger, Group, Stack, Title } from "@mantine/core"
import { createRootRoute, Outlet } from '@tanstack/react-router'
import { ThemeToggle } from "../layout/ThemeToggle.tsx";
import { NavMenu } from "../layout/NavMenu.tsx";
import { useDisclosure } from "@mantine/hooks";
import { IconCode } from "@tabler/icons-react";
import { UpdateNotifier } from "../components/UpdateNotifier.tsx";

const RootLayout = () => {
    const [opened, { toggle, close }] = useDisclosure();

    return (
        <>
            <UpdateNotifier />
            <AppShell
                padding="md"
                header={{ height: 60 }}
                navbar={{ width: 200, breakpoint: 'sm', collapsed: { mobile: !opened } }}
                layout="alt"
            >
                <AppShell.Header>
                    <Group h="100%" px="md">
                        <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
                        <IconCode />
                        <Title order={4}>File Collector</Title>
                    </Group>
                </AppShell.Header>

                <AppShell.Navbar p="md">
                    <Stack justify="space-between" h="100%">
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
        </>
    );
}

export const Route = createRootRoute({ component: RootLayout })