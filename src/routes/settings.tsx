import {createFileRoute} from '@tanstack/react-router'
import {Tabs, useMantineTheme} from "@mantine/core";
import {IconBrandGit, IconCloudDownload, IconMessageChatbot, IconSettings} from "@tabler/icons-react";
import {GitIgnoreManager} from "../components/GitIgnoreManager.tsx";
import {SystemPromptManager} from "../components/SystemPromptManager.tsx";
import {useMediaQuery} from "@mantine/hooks";
import {UpdateManager} from "../components/UpdateManager.tsx";

const Settings = () => {
    const theme = useMantineTheme();
    const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);

    return (
        <Tabs
            defaultValue="gitIgnore"
            h="100%"
            orientation={isMobile ? 'horizontal' : 'vertical'}
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
                <Tabs.Tab leftSection={<IconBrandGit size={20}/>} value="gitIgnore">
                    Ignores
                </Tabs.Tab>
                <Tabs.Tab leftSection={<IconMessageChatbot size={20}/>} value="systemPrompts">
                    System Prompts
                </Tabs.Tab>
                <Tabs.Tab leftSection={<IconCloudDownload size={20}/>} value="updates">
                    Updates
                </Tabs.Tab>
                <Tabs.Tab leftSection={<IconSettings size={20}/>} value="settings">
                    Settings
                </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel h="100%" p="md" value="gitIgnore">
                <GitIgnoreManager/>
            </Tabs.Panel>

            <Tabs.Panel h="100%" p="md" value="systemPrompts">
                <SystemPromptManager/>
            </Tabs.Panel>

            <Tabs.Panel h="100%" p="md" value="updates">
                <UpdateManager/>
            </Tabs.Panel>

            <Tabs.Panel p="md" value="settings">
                Settings tab content
            </Tabs.Panel>
        </Tabs>
    );
}

export const Route = createFileRoute('/settings')({
    component: Settings,
})