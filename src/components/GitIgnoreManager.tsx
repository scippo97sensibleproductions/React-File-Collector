import {useEffect, useState} from 'react';
import {
    ActionIcon,
    Alert,
    Button,
    Card,
    Center,
    Group,
    Loader,
    Paper,
    rem,
    ScrollArea,
    Stack,
    Text,
    TextInput,
    ThemeIcon,
    Title,
    Tooltip,
    useMantineTheme
} from '@mantine/core';
import {notifications} from '@mantine/notifications';
import {
    IconAlertCircle,
    IconCheck,
    IconDeviceFloppy,
    IconFileImport,
    IconGitBranch,
    IconPencil,
    IconPlus,
    IconTrash,
    IconX,
} from '@tabler/icons-react';
import {BaseDirectory, exists, readTextFile, writeTextFile} from '@tauri-apps/plugin-fs';
import {open as openDialog} from '@tauri-apps/plugin-dialog';
import {createFileEnsuringPath} from "../helpers/FileSystemManager.ts";
import type {GitIgnoreItem} from "../models/GitIgnoreItem.ts";

const GITIGNORE_PATH = import.meta.env.VITE_GITIGNORE_PATH ?? 'FileCollector/gitignores.json';
const parsedBaseDir = parseInt(import.meta.env.VITE_FILE_BASE_PATH ?? '', 10);
const BASE_DIR = (Number.isNaN(parsedBaseDir) ? 21 : parsedBaseDir) as BaseDirectory;

export const GitIgnoreManager = () => {
    const theme = useMantineTheme();
    const [items, setItems] = useState<GitIgnoreItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [newPattern, setNewPattern] = useState('');
    const [editingState, setEditingState] = useState<{ index: number; value: string } | null>(null);

    const loadGitIgnoreItems = async () => {
        setLoading(true);
        setError(null);
        try {
            const fileExists = await exists(GITIGNORE_PATH, {baseDir: BASE_DIR});

            if (!fileExists) {
                await createFileEnsuringPath(GITIGNORE_PATH, {baseDir: BASE_DIR});
                await writeTextFile(GITIGNORE_PATH, '[]', {baseDir: BASE_DIR});
                setItems([]);
                notifications.show({
                    title: 'Setup Complete',
                    message: 'Created a new gitignore storage file.',
                    color: 'blue',
                });
            } else {
                const content = await readTextFile(GITIGNORE_PATH, {baseDir: BASE_DIR});
                const data = content ? JSON.parse(content) : [];
                if (!Array.isArray(data)) {
                    const errorMessage = 'Invalid data format in gitignores.json. Expected an array.';
                    setError(`Failed to load or parse gitignores.json: ${errorMessage}`);
                    notifications.show({
                        title: 'Loading Error',
                        message: 'Could not load the gitignore file due to invalid content.',
                        color: 'red',
                        icon: <IconAlertCircle/>,
                    });
                    setItems([]);
                } else {
                    setItems(data);
                }
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            setError(`Failed to load or parse gitignores.json: ${errorMessage}`);
            notifications.show({
                title: 'Loading Error',
                message: 'Could not load the gitignore file. Please check permissions or file content.',
                color: 'red',
                icon: <IconAlertCircle/>,
            });
        } finally {
            setLoading(false);
        }
    };

    const saveGitIgnoreItems = async (updatedItems: GitIgnoreItem[]) => {
        const uniquePatterns = [...new Set(updatedItems.map((item) => item.pattern.trim()).filter(Boolean))];
        const finalItems = uniquePatterns.map((pattern) => ({pattern}));

        try {
            const content = JSON.stringify(finalItems, null, 2);
            await writeTextFile(GITIGNORE_PATH, content, {baseDir: BASE_DIR});
            setItems(finalItems);
            return finalItems;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            setError(`Failed to save gitignores.json: ${errorMessage}`);
            notifications.show({
                title: 'Save Error',
                message: 'Could not save changes to the gitignore file.',
                color: 'red',
                icon: <IconAlertCircle/>,
            });
            return items;
        }
    };

    useEffect(() => {
        loadGitIgnoreItems();
    }, []);

    const handleAddItem = async () => {
        if (!newPattern.trim()) return;
        const isNewPattern = !items.some(item => item.pattern === newPattern.trim());
        await saveGitIgnoreItems([...items, {pattern: newPattern}]);

        if (isNewPattern) {
            notifications.show({
                title: 'Pattern Added',
                message: `Successfully added "${newPattern.trim()}".`,
                color: 'green',
                icon: <IconCheck/>,
            });
        } else {
            notifications.show({
                title: 'Pattern Exists',
                message: `The pattern "${newPattern.trim()}" is already in the list.`,
                color: 'yellow',
            });
        }
        setNewPattern('');
    };

    const handleDeleteItem = async (indexToDelete: number) => {
        const itemToDelete = items[indexToDelete];
        const updatedItems = items.filter((_, index) => index !== indexToDelete);
        await saveGitIgnoreItems(updatedItems);
        notifications.show({
            title: 'Pattern Removed',
            message: `Successfully removed "${itemToDelete.pattern}".`,
            color: 'red',
            icon: <IconTrash/>,
        });
    };

    const handleUpdateItem = async () => {
        if (!editingState || !editingState.value.trim()) return;

        const updatedItems = [...items];
        updatedItems[editingState.index] = {pattern: editingState.value.trim()};

        await saveGitIgnoreItems(updatedItems);

        notifications.show({
            title: 'Pattern Updated',
            message: 'Successfully updated the pattern.',
            color: 'teal',
            icon: <IconDeviceFloppy/>,
        });
        setEditingState(null);
    };

    const handleImportFile = async () => {
        try {
            const selectedPath = await openDialog({
                multiple: false,
                filters: [{name: 'Gitignore File', extensions: ['gitignore']}],
                title: 'Import .gitignore file',
            });

            if (typeof selectedPath !== 'string') return;

            const content = await readTextFile(selectedPath);
            const newPatterns = content
                .split('\n')
                .map((line) => line.trim())
                .filter((line) => line && !line.startsWith('#'))
                .map((pattern) => ({pattern}));

            if (newPatterns.length === 0) {
                notifications.show({
                    title: 'Import Empty',
                    message: 'The selected file contained no valid patterns.',
                    color: 'orange',
                });
                return;
            }

            const currentLength = items.length;
            const updatedList = await saveGitIgnoreItems([...items, ...newPatterns]);
            const addedCount = updatedList.length - currentLength;

            notifications.show({
                title: 'Import Successful',
                message: `Imported ${newPatterns.length} patterns. Added ${addedCount} new unique patterns.`,
                color: 'grape',
                icon: <IconFileImport/>,
            });
        } catch {
            notifications.show({
                title: 'Import Error',
                message: 'An error occurred while importing the file.',
                color: 'red',
            });
        }
    };

    if (loading) {
        return <Center p="xl"><Loader color="blue"/></Center>;
    }

    if (error) {
        return <Alert color="red" icon={<IconAlertCircle size="1rem"/>} title="Error!" variant="light">{error}</Alert>;
    }

    return (
        <Stack gap="xl" h="100%">
            <Group justify="space-between">
                <Group>
                    <ThemeIcon gradient={{from: 'indigo', to: 'cyan'}} size="xl" variant="gradient">
                        <IconGitBranch style={{width: rem(32), height: rem(32)}}/>
                    </ThemeIcon>
                    <div>
                        <Title order={3}>Gitignore Manager</Title>
                        <Text c="dimmed">Manage global gitignore patterns for file collection.</Text>
                    </div>
                </Group>
                <Button
                    gradient={{from: 'grape', to: 'violet'}}
                    leftSection={<IconFileImport size={18}/>}
                    variant="gradient"
                    onClick={handleImportFile}
                >
                    Import .gitignore
                </Button>
            </Group>

            <Paper withBorder p="md" shadow="sm">
                <Stack align="stretch" gap="md" justify="flex-start">
                    <TextInput
                        aria-label="New gitignore pattern"
                        placeholder="e.g., node_modules/"
                        value={newPattern}
                        onChange={(e) => setNewPattern(e.currentTarget.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                    />
                    <Button
                        disabled={!newPattern.trim()}
                        leftSection={<IconPlus size={18}/>}
                        onClick={handleAddItem}
                    >
                        Add Pattern
                    </Button>
                </Stack>
            </Paper>

            <Paper withBorder shadow="sm" style={{flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0}}>
                <ScrollArea style={{flex: 1}}>
                    <Stack gap="xs" p="xs">
                        {items.length > 0 ? (
                            items.map((item, index) => (
                                <Card key={item.pattern} withBorder p="xs" radius="sm">
                                    {editingState?.index === index ? (
                                        <Group justify="space-between">
                                            <TextInput
                                                autoFocus
                                                style={{flex: 1}}
                                                value={editingState.value}
                                                onChange={(e) => setEditingState({
                                                    ...editingState,
                                                    value: e.currentTarget.value
                                                })}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleUpdateItem();
                                                    if (e.key === 'Escape') setEditingState(null);
                                                }}
                                            />
                                            <Group gap="xs">
                                                <Tooltip label="Save">
                                                    <ActionIcon color="green" variant="light"
                                                                onClick={handleUpdateItem}><IconCheck
                                                        size={18}/></ActionIcon>
                                                </Tooltip>
                                                <Tooltip label="Cancel">
                                                    <ActionIcon color="gray" variant="light"
                                                                onClick={() => setEditingState(null)}><IconX size={18}/></ActionIcon>
                                                </Tooltip>
                                            </Group>
                                        </Group>
                                    ) : (
                                        <Group justify="space-between">
                                            <Text ff="monospace" fz="sm" truncate="end">{item.pattern}</Text>
                                            <Group gap="xs">
                                                <Tooltip label="Edit">
                                                    <ActionIcon color="blue" variant="subtle"
                                                                onClick={() => setEditingState({
                                                                    index,
                                                                    value: item.pattern
                                                                })}><IconPencil size={18}/></ActionIcon>
                                                </Tooltip>
                                                <Tooltip label="Delete">
                                                    <ActionIcon color="red" variant="subtle"
                                                                onClick={() => handleDeleteItem(index)}><IconTrash
                                                        size={18}/></ActionIcon>
                                                </Tooltip>
                                            </Group>
                                        </Group>
                                    )}
                                </Card>
                            ))
                        ) : (
                            <Center h="100%" p="xl">
                                <Text c="dimmed">No gitignore patterns found.</Text>
                            </Center>
                        )}
                    </Stack>
                </ScrollArea>
                <Text c="dimmed" p="xs" size="xs" style={{borderTop: `1px solid ${theme.colors.dark[4]}`}} ta="right">
                    Total Patterns: {items.length}
                </Text>
            </Paper>
        </Stack>
    );
};