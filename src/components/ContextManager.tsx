import { useEffect, useState } from 'react';
import {
    Stack,
    Text,
    Group,
    TextInput,
    Select,
    ActionIcon,
    Title,
    Tooltip,
    Alert,
    Center,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconDeviceFloppy, IconPlayerPlay, IconTrash, IconAlertCircle, IconCheck } from '@tabler/icons-react';
import { BaseDirectory, exists, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { createFileEnsuringPath } from '../helpers/FileSystemManager.ts';
import type { SavedContext } from '../models/SavedContext.ts';

const CONTEXTS_PATH = import.meta.env.VITE_CONTEXTS_PATH || 'FileCollector/contexts.json';
const BASE_DIR = (Number(import.meta.env.VITE_FILE_BASE_PATH) || 21) as BaseDirectory;

interface ContextManagerProps {
    currentPath: string | null;
    selectedFilePaths: string[];
    onLoadContext: (filePaths: string[]) => void;
}

export const ContextManager = ({ currentPath, selectedFilePaths, onLoadContext }: ContextManagerProps) => {
    const [allContexts, setAllContexts] = useState<SavedContext[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [newContextName, setNewContextName] = useState('');
    const [selectedContextId, setSelectedContextId] = useState<string | null>(null);

    useEffect(() => {
        const loadContexts = async () => {
            setError(null);
            try {
                const fileExists = await exists(CONTEXTS_PATH, { baseDir: BASE_DIR });
                if (!fileExists) {
                    await createFileEnsuringPath(CONTEXTS_PATH, { baseDir: BASE_DIR });
                    await writeTextFile(CONTEXTS_PATH, '[]', { baseDir: BASE_DIR });
                    setAllContexts([]);
                    return;
                }
                const content = await readTextFile(CONTEXTS_PATH, { baseDir: BASE_DIR });
                const data = content ? JSON.parse(content) : [];

                if (Array.isArray(data)) {
                    setAllContexts(data);
                } else {
                    const validationError = 'Invalid data format in contexts.json. Expected an array.';
                    setError(`Failed to load contexts: ${validationError}`);
                }
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : String(err);
                setError(`Failed to load contexts: ${errorMessage}`);
            }
        };
        loadContexts();
    }, []);

    const saveContextsToFile = async (updatedContexts: SavedContext[]) => {
        try {
            const content = JSON.stringify(updatedContexts, null, 2);
            await writeTextFile(CONTEXTS_PATH, content, { baseDir: BASE_DIR });
            setAllContexts(updatedContexts);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            setError(`Failed to save contexts: ${errorMessage}`);
            notifications.show({
                title: 'Save Error',
                message: 'Could not save the context file.',
                color: 'red',
            });
        }
    };

    const handleSaveContext = async () => {
        if (!currentPath || !newContextName.trim()) return;

        const trimmedName = newContextName.trim();
        const existingContextIndex = allContexts.findIndex(c => c.rootPath === currentPath && c.name === trimmedName);

        const updatedContexts = [...allContexts];
        let notificationMessage: string;

        if (existingContextIndex !== -1) {
            updatedContexts[existingContextIndex] = {
                ...updatedContexts[existingContextIndex],
                selectedFilePaths: selectedFilePaths,
            };
            notificationMessage = `Context '${trimmedName}' updated.`;
        } else {
            const newContext: SavedContext = {
                id: crypto.randomUUID(),
                name: trimmedName,
                rootPath: currentPath,
                selectedFilePaths: selectedFilePaths,
            };
            updatedContexts.push(newContext);
            notificationMessage = `Context '${trimmedName}' saved.`;
        }

        await saveContextsToFile(updatedContexts);
        notifications.show({
            title: 'Success',
            message: notificationMessage,
            color: 'green',
            icon: <IconCheck />,
        });
        setNewContextName('');
    };

    const handleLoadContext = () => {
        if (!selectedContextId) return;
        const contextToLoad = allContexts.find(c => c.id === selectedContextId);
        if (contextToLoad) {
            onLoadContext(contextToLoad.selectedFilePaths);
            notifications.show({
                title: 'Context Loaded',
                message: `Loaded selection from '${contextToLoad.name}'.`,
                color: 'blue',
            });
        }
    };

    const handleDeleteContext = async () => {
        if (!selectedContextId) return;
        const contextToDelete = allContexts.find(c => c.id === selectedContextId);
        if (contextToDelete) {
            const updatedContexts = allContexts.filter(c => c.id !== selectedContextId);
            await saveContextsToFile(updatedContexts);
            notifications.show({
                title: 'Context Deleted',
                message: `Deleted context '${contextToDelete.name}'.`,
                color: 'red',
                icon: <IconTrash />,
            });
            setSelectedContextId(null);
        }
    };

    if (error) {
        return (
            <Alert icon={<IconAlertCircle size="1rem" />} title="Error!" color="red" variant="light">
                {error}
            </Alert>
        );
    }

    if (!currentPath) {
        return (
            <Stack>
                <Title order={5}>Contexts</Title>
                <Center>
                    <Text c="dimmed" size="sm">
                        Select a folder to manage contexts.
                    </Text>
                </Center>
            </Stack>
        );
    }

    const contextsForCurrentPath = allContexts
        .filter(c => c.rootPath === currentPath)
        .map(c => ({ value: c.id, label: c.name }));

    return (
        <Stack gap="md">
            <Title order={5}>Contexts</Title>
            <Stack gap="xs">
                <TextInput
                    label="Save current selection as"
                    placeholder="New context name..."
                    value={newContextName}
                    onChange={e => setNewContextName(e.currentTarget.value)}
                    rightSection={
                        <Tooltip label="Save Context">
                            <ActionIcon
                                variant="light"
                                onClick={handleSaveContext}
                                disabled={!newContextName.trim() || selectedFilePaths.length === 0}
                            >
                                <IconDeviceFloppy size={16} />
                            </ActionIcon>
                        </Tooltip>
                    }
                />
            </Stack>
            {contextsForCurrentPath.length > 0 ? (
                <Stack gap={4}>
                    <Text component="label" size="sm" fw={500}>
                        Load or delete context
                    </Text>
                    <Group grow preventGrowOverflow={false} wrap="nowrap" align="center">
                        <Select
                            placeholder="Select a context..."
                            data={contextsForCurrentPath}
                            value={selectedContextId}
                            onChange={setSelectedContextId}
                            clearable
                        />
                        <Group gap="xs">
                            <Tooltip label="Load">
                                <ActionIcon variant="light" onClick={handleLoadContext} disabled={!selectedContextId}>
                                    <IconPlayerPlay size={16} />
                                </ActionIcon>
                            </Tooltip>
                            <Tooltip label="Delete">
                                <ActionIcon variant="light" color="red" onClick={handleDeleteContext} disabled={!selectedContextId}>
                                    <IconTrash size={16} />
                                </ActionIcon>
                            </Tooltip>
                        </Group>
                    </Group>
                </Stack>
            ) : (
                <Text c="dimmed" size="sm" ta="center">
                    No saved contexts for this folder.
                </Text>
            )}
        </Stack>
    );
};