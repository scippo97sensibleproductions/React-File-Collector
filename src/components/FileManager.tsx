import {
    ActionIcon,
    Box,
    Button,
    Flex,
    Group,
    LoadingOverlay,
    Paper,
    Tabs,
    Text,
    Tooltip,
    useMantineTheme
} from "@mantine/core";
import { IconArchive, IconCheck, IconFiles, IconFolderOpen, IconRefresh, IconSearch } from "@tabler/icons-react";
import { useState, useEffect, useRef } from "react";
import { FileSearch } from "./FileSearch.tsx";
import { VirtualizedFileTree } from "./VirtualizedFileTree.tsx";
import type { DefinedTreeNode } from "../routes";
import { ContextManager } from "./ContextManager.tsx";
import { BaseDirectory, readTextFile } from "@tauri-apps/plugin-fs";
import { useDebouncedValue, useMediaQuery } from "@mantine/hooks";
import { getLanguage } from "../helpers/fileTypeManager.ts";
import { estimateTokens } from "../helpers/TokenCounter.ts";
import { readTextFileWithDetectedEncoding } from "../helpers/EncodingManager.ts";
import type { FileInfo } from "../models/FileInfo.ts";
import { ContentComposer } from "./ContentComposer.tsx";
import { FileViewer } from "./FileViewer.tsx";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { notifications } from "@mantine/notifications";
import { PathDisplay } from "./PathDisplay.tsx";
import type { SystemPromptItem } from "../models/SystemPromptItem.ts";

const PROMPTS_PATH = import.meta.env.VITE_SYSTEM_PROMPTS_PATH || 'FileCollector/system_prompts.json';
const BASE_DIR = (Number(import.meta.env.VITE_FILE_BASE_PATH) || 21) as BaseDirectory;
const MAX_FILE_SIZE = 200_000;
const LOADER_DELAY_MS = 300;

interface FileManagerProps {
    data: DefinedTreeNode[];
    allFiles: { label: string; value: string }[];
    checkedItems: string[];
    setCheckedItems: React.Dispatch<React.SetStateAction<string[]>>;
    onNodeToggle: (node: DefinedTreeNode) => void;
    path: string | null;
    isLoading: boolean;
    onSelectFolder: () => void;
    onReloadTree: () => void;
}

export const FileManager = ({
                                data,
                                allFiles,
                                checkedItems,
                                setCheckedItems,
                                onNodeToggle,
                                path,
                                isLoading,
                                onSelectFolder,
                                onReloadTree
                            }: FileManagerProps) => {
    const theme = useMantineTheme();
    const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);
    const [files, setFiles] = useState<FileInfo[]>([]);
    const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [systemPrompts, setSystemPrompts] = useState<SystemPromptItem[]>([]);
    const [selectedSystemPromptId, setSelectedSystemPromptId] = useState<string | null>(null);
    const [userPrompt, setUserPrompt] = useState('');
    const [reloadNonce, setReloadNonce] = useState(0);
    const [debouncedUserPrompt] = useDebouncedValue(userPrompt, 1000);
    const [composedTotalTokens, setComposedTotalTokens] = useState(0);
    const loadingTimerRef = useRef<number | null>(null);

    const handleAddItem = (filePath: string) => {
        setCheckedItems(prevItems => Array.from(new Set(prevItems).add(filePath)));
    };

    const handleRemoveItem = (filePath: string) => {
        setCheckedItems(prevItems => prevItems.filter(p => p !== filePath));
    };

    const handleRemoveGroupItems = (filePathsToRemove: string[]) => {
        const pathsToRemoveSet = new Set(filePathsToRemove);
        setCheckedItems(prevItems => prevItems.filter(path => !pathsToRemoveSet.has(path)));
    };

    const handleLoadContext = (pathsToLoad: string[]) => {
        setCheckedItems(pathsToLoad);
    };

    const handleClearAll = () => {
        setCheckedItems([]);
    };

    const allFilePaths = new Set(allFiles.map(file => file.value));
    const checkedFiles = checkedItems.filter(item => allFilePaths.has(item));

    const handleReloadContent = () => setReloadNonce(n => n + 1);

    useEffect(() => {
        const getSystemPrompts = async () => {
            try {
                const content = await readTextFile(PROMPTS_PATH, { baseDir: BASE_DIR });
                const prompts = content ? JSON.parse(content) : [];
                if (Array.isArray(prompts)) {
                    setSystemPrompts(prompts);
                }
            } catch {
                setSystemPrompts([]);
            }
        };
        getSystemPrompts();
    }, []);

    useEffect(() => {
        if (loadingTimerRef.current) {
            clearTimeout(loadingTimerRef.current);
        }

        const syncFiles = async () => {
            if (checkedFiles.length === 0) {
                if (files.length > 0) {
                    setFiles([]);
                    setSelectedFilePath(null);
                }
                setIsProcessing(false);
                return;
            }

            loadingTimerRef.current = window.setTimeout(() => {
                setIsProcessing(true);
            }, LOADER_DELAY_MS);

            try {
                const filePromises = checkedFiles.map(async (path): Promise<FileInfo> => {
                    try {
                        const content = await readTextFileWithDetectedEncoding(path);
                        if (content.length > MAX_FILE_SIZE) {
                            return {
                                path,
                                error: `File is too large (over ${MAX_FILE_SIZE / 1000}k characters).`,
                            };
                        }
                        return {
                            path,
                            language: getLanguage(path),
                            tokenCount: estimateTokens(content),
                        };
                    } catch (e) {
                        return {
                            path,
                            error: `Failed to read file: ${e instanceof Error ? e.message : String(e)}`,
                        };
                    }
                });

                const newFiles = await Promise.all(filePromises);
                newFiles.sort((a, b) => {
                    const aHasError = !!a.error;
                    const bHasError = !!b.error;
                    if (aHasError !== bHasError) {
                        return aHasError ? -1 : 1;
                    }
                    return (b.tokenCount ?? 0) - (a.tokenCount ?? 0);
                });
                setFiles(newFiles);

                const dataPathSet = new Set(checkedFiles);
                if (!selectedFilePath || !dataPathSet.has(selectedFilePath)) {
                    setSelectedFilePath(newFiles.find(f => !f.error)?.path || null);
                }
            } finally {
                if (loadingTimerRef.current) {
                    clearTimeout(loadingTimerRef.current);
                }
                setIsProcessing(false);
            }
        };

        syncFiles();

        return () => {
            if (loadingTimerRef.current) {
                clearTimeout(loadingTimerRef.current);
            }
        };
    }, [checkedFiles, reloadNonce, files.length, selectedFilePath]);

    const selectedFile = files.find(f => f.path === selectedFilePath) || null;
    const handleFileSelect = (file: FileInfo | null) => {
        setSelectedFilePath(file?.path ?? null);
    };

    const fileTokens = files.reduce((acc, file) => acc + (file.tokenCount || 0), 0);

    const selectedPrompt = systemPrompts.find(p => p.id === selectedSystemPromptId);

    const systemPromptTokens = selectedPrompt ? estimateTokens(selectedPrompt.content) : 0;

    useEffect(() => {
        const userPromptTokens = estimateTokens(debouncedUserPrompt);
        setComposedTotalTokens(systemPromptTokens + userPromptTokens + fileTokens);
    }, [debouncedUserPrompt, fileTokens, systemPromptTokens]);

    const handleCopyAll = async () => {
        const filesToCopy = files.filter(file => !file.error);
        const systemPromptContent = selectedPrompt ? selectedPrompt.content : '';

        if (filesToCopy.length === 0 && !userPrompt && !selectedPrompt) {
            notifications.show({
                title: 'No Content to Copy',
                message: 'Select files or write a prompt to generate content.',
                color: 'yellow',
            });
            return;
        }

        try {
            const fileContents = await Promise.all(
                filesToCopy.map(async (file) => {
                    try {
                        const content = await readTextFileWithDetectedEncoding(file.path);
                        return `FILE PATH: ${file.path}\n\nCONTENT:\n\`\`\`${file.language || ''}\n${content}\n\`\`\``;
                    } catch {
                        return `FILE PATH: ${file.path}\n\nCONTENT:\n\`\`\`\n--- ERROR READING FILE ---\n\`\`\``;
                    }
                })
            );

            const contentParts = [];
            if (systemPromptContent.trim()) contentParts.push(`SYSTEM PROMPT:\n\n${systemPromptContent.trim()}`);
            if (fileContents.length > 0) contentParts.push(fileContents.join('\n\n---\n\n'));
            if (userPrompt.trim()) contentParts.push(`USER PROMPT:\n\n${userPrompt.trim()}`);
            const formattedContent = contentParts.join('\n\n---\n\n');

            await writeText(formattedContent);

            const currentTokens = systemPromptTokens + estimateTokens(userPrompt) + fileTokens;
            notifications.show({
                title: 'Content Copied',
                message: `Successfully copied ~${currentTokens.toLocaleString()} tokens to clipboard.`,
                color: 'green',
                icon: <IconCheck size={18} />,
            });
        } catch {
            notifications.show({
                title: 'Copy Failed',
                message: 'Could not write content to the clipboard.',
                color: 'red',
            });
        }
    };

    return (
        <Flex direction="column" h={{ base: 'auto', lg: 'calc(100vh - 100px)' }} gap="md">
            <Box pos="relative">
                <LoadingOverlay
                    visible={isLoading}
                    zIndex={1000}
                    overlayProps={{ radius: 'sm', blur: 2 }}
                    loaderProps={{ children: <Text>Scanning directory...</Text> }}
                />
                <Flex
                    direction={isMobile ? 'column' : 'row'}
                    gap={isMobile ? 'sm' : 'md'}
                    align={isMobile ? 'stretch' : 'center'}
                >
                    <Group>
                        <Tooltip label="Select a project folder to analyze">
                            <Button
                                variant="light"
                                onClick={onSelectFolder}
                                leftSection={<IconFolderOpen size={18} />}
                            >
                                Select Folder
                            </Button>
                        </Tooltip>
                        <Tooltip label="Reload file list from disk">
                            <ActionIcon variant="light" onClick={onReloadTree} disabled={!path}>
                                <IconRefresh size={18} />
                            </ActionIcon>
                        </Tooltip>
                    </Group>
                    <Box style={{ flex: 1, minWidth: 0 }}>
                        <PathDisplay path={path} />
                    </Box>
                </Flex>
            </Box>

            <Flex
                gap="md"
                style={{ flex: 1, minHeight: 0 }}
                direction={{ base: 'column', lg: 'row' }}
            >
                <Box w={{ base: '100%', lg: 450 }} h={{ base: 'auto', lg: '100%' }}>
                    <Paper withBorder shadow="sm" p="md" h="100%" style={{ display: 'flex', flexDirection: 'column' }}>
                        <Tabs defaultValue="files" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                            <Tabs.List>
                                <Tabs.Tab value="files" leftSection={<IconFiles size={16} />}>
                                    Files
                                </Tabs.Tab>
                                <Tabs.Tab value="search" leftSection={<IconSearch size={16} />}>
                                    Search
                                </Tabs.Tab>
                                <Tabs.Tab value="contexts" leftSection={<IconArchive size={16} />}>
                                    Contexts
                                </Tabs.Tab>
                            </Tabs.List>

                            <Tabs.Panel value="files" pt="xs" style={{ flex: 1, minHeight: 0 }}>
                                <VirtualizedFileTree
                                    data={data}
                                    checkedItems={checkedItems}
                                    onNodeToggle={onNodeToggle}
                                />
                            </Tabs.Panel>

                            <Tabs.Panel value="search" pt="xs" style={{ flex: 1, minHeight: 0 }}>
                                <FileSearch
                                    allFiles={allFiles}
                                    checkedItems={checkedItems}
                                    onCheckItem={handleAddItem}
                                />
                            </Tabs.Panel>

                            <Tabs.Panel value="contexts" pt="xs" style={{ flex: 1, minHeight: 0 }}>
                                <ContextManager
                                    currentPath={path}
                                    selectedFilePaths={checkedItems}
                                    onLoadContext={handleLoadContext}
                                />
                            </Tabs.Panel>
                        </Tabs>
                    </Paper>
                </Box>

                <Flex gap="md" style={{ flex: 1, minWidth: 0, position: 'relative' }} direction={{ base: 'column', md: 'row' }}>
                    <LoadingOverlay visible={isProcessing} overlayProps={{ radius: 'sm', blur: 2 }} />
                    <Box w={{ base: '100%', md: '45%' }} miw={{ md: 400 }} h={{ base: 'auto', md: '100%' }}>
                        <ContentComposer
                            files={files}
                            systemPrompts={systemPrompts}
                            selectedFile={selectedFile}
                            userPrompt={userPrompt}
                            selectedSystemPromptId={selectedSystemPromptId}
                            onFileSelect={handleFileSelect}
                            onUncheckItem={handleRemoveItem}
                            onUncheckGroup={handleRemoveGroupItems}
                            onCopyAll={handleCopyAll}
                            onReloadContent={handleReloadContent}
                            onClearAll={handleClearAll}
                            setUserPrompt={setUserPrompt}
                            setSelectedSystemPromptId={setSelectedSystemPromptId}
                            totalTokens={composedTotalTokens}
                        />
                    </Box>
                    <Box style={{ flex: 1, minWidth: 0 }} h={{ base: 'auto', md: '100%' }}>
                        <FileViewer selectedFile={selectedFile} isEmpty={checkedFiles.length === 0} />
                    </Box>
                </Flex>
            </Flex>
        </Flex>
    );
};