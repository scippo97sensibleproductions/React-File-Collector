import {useEffect, useState} from 'react';
import {
    ActionIcon,
    Alert,
    Box,
    Button,
    Center,
    Group,
    Loader,
    Paper,
    rem,
    ScrollArea,
    Stack,
    Tabs,
    Text,
    Textarea,
    TextInput,
    ThemeIcon,
    Title,
} from '@mantine/core';
import {notifications} from '@mantine/notifications';
import {
    IconAlertCircle,
    IconCheck,
    IconDeviceFloppy,
    IconMessageChatbot,
    IconPlus,
    IconTrash,
    IconX,
} from '@tabler/icons-react';
import {BaseDirectory, exists, readTextFile, writeTextFile,} from '@tauri-apps/plugin-fs';
import {createFileEnsuringPath} from "../helpers/FileSystemManager.ts";
import type {SystemPromptItem} from "../models/SystemPromptItem.ts";

const PROMPTS_PATH = import.meta.env.VITE_SYSTEM_PROMPTS_PATH || 'FileCollector/system_prompts.json';
const BASE_DIR = (Number(import.meta.env.VITE_FILE_BASE_PATH) || 21) as BaseDirectory;
const NEW_PROMPT_ID = 'new-prompt';

export const SystemPromptManager = () => {
    const [prompts, setPrompts] = useState<SystemPromptItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<string>(NEW_PROMPT_ID);

    const [draftName, setDraftName] = useState('');
    const [draftContent, setDraftContent] = useState('');

    const loadPrompts = async () => {
        setLoading(true);
        setError(null);
        try {
            const fileExists = await exists(PROMPTS_PATH, {baseDir: BASE_DIR});

            if (!fileExists) {
                await createFileEnsuringPath(PROMPTS_PATH, {baseDir: BASE_DIR});
                await writeTextFile(PROMPTS_PATH, '[]', {baseDir: BASE_DIR});
                setPrompts([]);
            } else {
                const content = await readTextFile(PROMPTS_PATH, {baseDir: BASE_DIR});
                const data = content ? JSON.parse(content) : [];
                if (!Array.isArray(data)) {
                    const errorMessage = 'Invalid data format in system_prompts.json. Expected an array.';
                    setError(`Failed to load or parse system_prompts.json: ${errorMessage}`);
                    setPrompts([]);
                    return;
                }
                setPrompts(data);
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            setError(`Failed to load or parse system_prompts.json: ${errorMessage}`);
            setPrompts([]);
        } finally {
            setLoading(false);
        }
    };

    const savePrompts = async (updatedPrompts: SystemPromptItem[]) => {
        try {
            const content = JSON.stringify(updatedPrompts, null, 2);
            await writeTextFile(PROMPTS_PATH, content, {baseDir: BASE_DIR});
            setPrompts(updatedPrompts);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            setError(`Failed to save system_prompts.json: ${errorMessage}`);
        }
    };

    useEffect(() => {
        loadPrompts();
    }, []);

    useEffect(() => {
        if (activeTab === NEW_PROMPT_ID) {
            setDraftName('');
            setDraftContent('');
        } else {
            const currentPrompt = prompts.find(p => p.id === activeTab);
            if (currentPrompt) {
                setDraftName(currentPrompt.name);
                setDraftContent(currentPrompt.content);
            } else {
                setActiveTab(NEW_PROMPT_ID);
            }
        }
    }, [activeTab, prompts]);


    const handleSavePrompt = async () => {
        if (!draftName.trim() || !draftContent.trim()) return;

        if (activeTab === NEW_PROMPT_ID) {
            const newPrompt: SystemPromptItem = {
                id: crypto.randomUUID(),
                name: draftName.trim(),
                content: draftContent.trim(),
            };
            const updatedPrompts = [...prompts, newPrompt];
            await savePrompts(updatedPrompts);
            notifications.show({
                title: 'Prompt Added',
                message: `Successfully added prompt "${newPrompt.name}".`,
                color: 'green',
                icon: <IconCheck/>,
            });
            setActiveTab(newPrompt.id);
        } else {
            const updatedPrompts = prompts.map(p =>
                p.id === activeTab
                    ? {...p, name: draftName.trim(), content: draftContent.trim()}
                    : p
            );
            await savePrompts(updatedPrompts);
            notifications.show({
                title: 'Prompt Updated',
                message: `Successfully updated "${draftName.trim()}".`,
                color: 'teal',
                icon: <IconDeviceFloppy/>,
            });
        }
    };

    const handleDeletePrompt = async (idToDelete: string) => {
        const promptToDelete = prompts.find(p => p.id === idToDelete);
        if (!promptToDelete) return;

        const updatedPrompts = prompts.filter((p) => p.id !== idToDelete);

        if (activeTab === idToDelete) {
            const currentIndex = prompts.findIndex(p => p.id === idToDelete);
            const nextIndex = Math.max(0, currentIndex - 1);
            const nextPrompt = prompts[nextIndex]
            setActiveTab(updatedPrompts.length > 0 ? (nextPrompt?.id ?? updatedPrompts[0].id) : NEW_PROMPT_ID);
        }

        await savePrompts(updatedPrompts);
        notifications.show({
            title: 'Prompt Removed',
            message: `Successfully removed "${promptToDelete.name}".`,
            color: 'red',
            icon: <IconTrash/>,
        });
    };

    const handleTabChange = (value: string | null) => {
        if (value) {
            setActiveTab(value);
        }
    };

    if (loading) return <Center p="xl"><Loader/></Center>;
    if (error) return <Alert color="red" icon={<IconAlertCircle size="1rem"/>} title="Error!">{error}</Alert>;

    const isNewPrompt = activeTab === NEW_PROMPT_ID;
    const currentPrompt = isNewPrompt ? null : prompts.find(p => p.id === activeTab);
    const isDirty = currentPrompt
        ? draftName !== currentPrompt.name || draftContent !== currentPrompt.content
        : draftName.trim().length > 0 || draftContent.trim().length > 0;
    const canSave = isDirty && draftName.trim().length > 0 && draftContent.trim().length > 0;

    return (
        <Stack gap="xl" h="100%">
            <Group>
                <ThemeIcon gradient={{from: 'teal', to: 'lime', deg: 105}} size="xl" variant="gradient">
                    <IconMessageChatbot style={{width: rem(32), height: rem(32)}}/>
                </ThemeIcon>
                <div>
                    <Title order={3}>System Prompt Manager</Title>
                    <Text c="dimmed">Create and manage reusable prompts for your tasks.</Text>
                </div>
            </Group>

            <Tabs h="100%" style={{display: 'flex', flexDirection: 'column'}} value={activeTab}
                  onChange={handleTabChange}>
                <ScrollArea pb="xs" type="auto">
                    <Tabs.List style={{flexWrap: 'nowrap'}}>
                        <Tabs.Tab leftSection={<IconPlus size={16}/>} value={NEW_PROMPT_ID}>
                            New Prompt
                        </Tabs.Tab>
                        {prompts.map((prompt) => (
                            <Box key={prompt.id} pos="relative">
                                <Tabs.Tab pr="xl" value={prompt.id}>
                                    <Text maw={200} truncate="end">{prompt.name}</Text>
                                </Tabs.Tab>
                                <ActionIcon
                                    aria-label={`Delete prompt: ${prompt.name}`}
                                    size="xs"
                                    style={{
                                        position: 'absolute',
                                        top: '50%',
                                        right: rem(4),
                                        transform: 'translateY(-50%)',
                                    }}
                                    variant="transparent"
                                    onClick={() => handleDeletePrompt(prompt.id)}
                                >
                                    <IconX size={12}/>
                                </ActionIcon>
                            </Box>
                        ))}
                    </Tabs.List>
                </ScrollArea>

                <Paper
                    withBorder
                    p="md"
                    shadow="sm"
                    style={{flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0}}
                >
                    <Stack h="calc(100vh - 310px)">
                        <TextInput
                            label="Prompt Name"
                            placeholder="e.g., C# Code Reviewer"
                            value={draftName}
                            onChange={(e) => setDraftName(e.currentTarget.value)}
                        />
                        <Textarea
                            label="Prompt Content"
                            placeholder="You are a senior C# developer..."
                            style={{flex: 1}}
                            styles={{wrapper: {height: '100%'}, input: {height: '100%'}}}
                            value={draftContent}
                            onChange={(e) => setDraftContent(e.currentTarget.value)}
                        />
                        <Group justify="flex-end" mt="md">
                            <Button
                                disabled={!canSave}
                                leftSection={isNewPrompt ? <IconPlus size={18}/> : <IconDeviceFloppy size={18}/>}
                                onClick={handleSavePrompt}
                            >
                                {isNewPrompt ? 'Add New Prompt' : 'Save Changes'}
                            </Button>
                        </Group>
                    </Stack>
                </Paper>
            </Tabs>
        </Stack>
    );
};