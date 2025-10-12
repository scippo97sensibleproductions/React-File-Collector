import { createFileRoute } from '@tanstack/react-router'
import { Tabs, useMantineTheme } from "@mantine/core";
import { IconBrandGit, IconSettings, IconMessageChatbot, IconCloudDownload } from "@tabler/icons-react";
import { GitIgnoreManager } from "../components/GitIgnoreManager.tsx";
import { SystemPromptManager } from "../components/SystemPromptManager.tsx";
import { useMediaQuery } from "@mantine/hooks";
import { UpdateManager } from "../components/UpdateManager.tsx";

export const Route = createFileRoute('/settings')({
    component: RouteComponent,
})

function RouteComponent() {
    const theme = useMantineTheme();
    const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);

    return (
        <Tabs
            defaultValue="gitIgnore"
            orientation={isMobile ? 'horizontal' : 'vertical'}
            h="100%"
            styles={{
                root: {
                    display: 'flex',
                    flexDirection: isMobile ? 'column' : 'row',
                },
                panel: {
                    flex: 1,
                    overflow: 'hidden',
                    minHeight: 0,
                },
            }}
        >
            <Tabs.List>
                <Tabs.Tab value="gitIgnore" leftSection={<IconBrandGit size={20} />}>
                    Ignores
                </Tabs.Tab>
                <Tabs.Tab value="systemPrompts" leftSection={<IconMessageChatbot size={20} />}>
                    System Prompts
                </Tabs.Tab>
                <Tabs.Tab value="updates" leftSection={<IconCloudDownload size={20} />}>
                    Updates
                </Tabs.Tab>
                <Tabs.Tab value="settings" leftSection={<IconSettings size={20} />}>
                    Settings
                </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="gitIgnore" p="md" h="100%">
                <GitIgnoreManager />
            </Tabs.Panel>

            <Tabs.Panel value="systemPrompts" p="md" h="100%">
                <SystemPromptManager />
            </Tabs.Panel>

            <Tabs.Panel value="updates" p="md" h="100%">
                <UpdateManager />
            </Tabs.Panel>

            <Tabs.Panel value="settings" p="md">
                Settings tab content
            </Tabs.Panel>
        </Tabs>
    );
}