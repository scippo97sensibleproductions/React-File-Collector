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
import {IconArchive, IconCheck, IconFiles, IconFolderOpen, IconRefresh, IconSearch} from "@tabler/icons-react";
import {useEffect, useMemo, useState} from "react";
import {FileSearch} from "./FileSearch.tsx";
import {VirtualizedFileTree} from "./VirtualizedFileTree.tsx";
import {ContextManager} from "./ContextManager.tsx";
import {BaseDirectory, readTextFile} from "@tauri-apps/plugin-fs";
import {useMediaQuery} from "@mantine/hooks";
import {getLanguage} from "../helpers/fileTypeManager.ts";
import {estimateTokens} from "../helpers/TokenCounter.ts";
import {readTextFileWithDetectedEncoding} from "../helpers/EncodingManager.ts";
import type {FileInfo} from "../models/FileInfo.ts";
import {ContentComposer} from "./ContentComposer.tsx";
import {FileViewer} from "./FileViewer.tsx";
import {writeText} from "@tauri-apps/plugin-clipboard-manager";
import {notifications} from "@mantine/notifications";
import {PathDisplay} from "./PathDisplay.tsx";
import type {SystemPromptItem} from "../models/SystemPromptItem.ts";
import {DefinedTreeNode} from "../models/tree.ts";

const PROMPTS_PATH = import.meta.env.VITE_SYSTEM_PROMPTS_PATH ?? 'FileCollector/system_prompts.json';
const parsedBaseDir = parseInt(import.meta.env.VITE_FILE_BASE_PATH ?? '', 10);
const BASE_DIR = (Number.isNaN(parsedBaseDir) ? 21 : parsedBaseDir) as BaseDirectory;

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
    const [isPreviewVisible, setIsPreviewVisible] = useState(false);

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

    const allFilePaths = useMemo(() => new Set(allFiles.map(file => file.value)), [allFiles]);
    const checkedFilePaths = useMemo(() => checkedItems.filter(item => allFilePaths.has(item)), [checkedItems, allFilePaths]);

    useEffect(() => {
        const getSystemPrompts = async () => {
            try {
                const content = await readTextFile(PROMPTS_PATH, {baseDir: BASE_DIR});
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
        const newFiles: FileInfo[] = checkedFilePaths.map(path => ({
            path,
            language: getLanguage(path),
        }));
        setFiles(newFiles);

        if (!selectedFilePath || !checkedFilePaths.includes(selectedFilePath)) {
            setSelectedFilePath(newFiles.length > 0 ? newFiles[0].path : null);
        }
    }, [checkedFilePaths, selectedFilePath]);


    const selectedFile = files.find(f => f.path === selectedFilePath) ?? null;
    const handleFileSelect = (file: FileInfo | null) => {
        setSelectedFilePath(file?.path ?? null);
    };

    const selectedPrompt = systemPrompts.find(p => p.id === selectedSystemPromptId);

    const handleCopyAll = async () => {
        setIsProcessing(true);
        try {
            const systemPromptContent = selectedPrompt ? selectedPrompt.content : '';
            if (checkedFilePaths.length === 0 && !userPrompt && !systemPromptContent) {
                notifications.show({
                    title: 'No Content to Copy',
                    message: 'Select files or write a prompt to generate content.',
                    color: 'yellow',
                });
                return;
            }

            let totalTokens = 0;
            totalTokens += selectedPrompt ? estimateTokens(selectedPrompt.content) : 0;
            totalTokens += estimateTokens(userPrompt);

            const fileContents = await Promise.all(
                checkedFilePaths.map(async (path) => {
                    try {
                        const content = await readTextFileWithDetectedEncoding(path);
                        totalTokens += estimateTokens(content);
                        return `FILE PATH: ${path}\n\nCONTENT:\n\`\`\`${getLanguage(path) ?? ''}\n${content}\n\`\`\``;
                    } catch {
                        return `FILE PATH: ${path}\n\nCONTENT:\n\`\`\`\n--- ERROR READING FILE ---\n\`\`\``;
                    }
                })
            );

            const contentParts = [];
            if (systemPromptContent.trim()) contentParts.push(`SYSTEM PROMPT:\n\n${systemPromptContent.trim()}`);
            if (fileContents.length > 0) contentParts.push(fileContents.join('\n\n---\n\n'));
            if (userPrompt.trim()) contentParts.push(`USER PROMPT:\n\n${userPrompt.trim()}`);
            const formattedContent = contentParts.join('\n\n---\n\n');

            await writeText(formattedContent);
            notifications.show({
                title: 'Content Copied',
                message: `Successfully copied ~${totalTokens.toLocaleString()} tokens to clipboard.`,
                color: 'green',
                icon: <IconCheck size={18}/>,
            });
        } catch {
            notifications.show({
                title: 'Copy Failed',
                message: 'Could not write content to the clipboard.',
                color: 'red',
            });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <Flex direction="column" gap="md" h={{base: 'auto', lg: 'calc(100vh - 100px)'}}>
            <Box pos="relative">
                <LoadingOverlay
                    loaderProps={{children: <Text>Scanning directory...</Text>}}
                    overlayProps={{radius: 'sm', blur: 2}}
                    visible={isLoading}
                    zIndex={1000}
                />
                <Flex
                    align={isMobile ? 'stretch' : 'center'}
                    direction={isMobile ? 'column' : 'row'}
                    gap={isMobile ? 'sm' : 'md'}
                >
                    <Group>
                        <Tooltip label="Select a project folder to analyze">
                            <Button
                                leftSection={<IconFolderOpen size={18}/>}
                                variant="light"
                                onClick={onSelectFolder}
                            >
                                Select Folder
                            </Button>
                        </Tooltip>
                        <Tooltip label="Reload file list from disk">
                            <ActionIcon disabled={!path} variant="light" onClick={onReloadTree}>
                                <IconRefresh size={18}/>
                            </ActionIcon>
                        </Tooltip>
                    </Group>
                    <Box style={{flex: 1, minWidth: 0}}>
                        <PathDisplay path={path}/>
                    </Box>
                </Flex>
            </Box>

            <Flex
                direction={{base: 'column', lg: 'row'}}
                gap="md"
                style={{flex: 1, minHeight: 0}}
            >
                <Box h={{base: 'auto', lg: '100%'}} w={{base: '100%', lg: isPreviewVisible ? 450 : '50%'}}>
                    <Paper withBorder h="100%" p="md" shadow="sm" style={{display: 'flex', flexDirection: 'column'}}>
                        <Tabs defaultValue="files" style={{display: 'flex', flexDirection: 'column', height: '100%'}}>
                            <Tabs.List>
                                <Tabs.Tab leftSection={<IconFiles size={16}/>} value="files">
                                    Files
                                </Tabs.Tab>
                                <Tabs.Tab leftSection={<IconSearch size={16}/>} value="search">
                                    Search
                                </Tabs.Tab>
                                <Tabs.Tab leftSection={<IconArchive size={16}/>} value="contexts">
                                    Contexts
                                </Tabs.Tab>
                            </Tabs.List>

                            <Tabs.Panel pt="xs" style={{flex: 1, minHeight: 0}} value="files">
                                <VirtualizedFileTree
                                    checkedItems={checkedItems}
                                    data={data}
                                    onNodeToggle={onNodeToggle}
                                />
                            </Tabs.Panel>

                            <Tabs.Panel pt="xs" style={{flex: 1, minHeight: 0}} value="search">
                                <FileSearch
                                    allFiles={allFiles}
                                    checkedItems={checkedItems}
                                    onCheckItem={handleAddItem}
                                />
                            </Tabs.Panel>

                            <Tabs.Panel pt="xs" style={{flex: 1, minHeight: 0}} value="contexts">
                                <ContextManager
                                    currentPath={path}
                                    selectedFilePaths={checkedItems}
                                    onLoadContext={handleLoadContext}
                                />
                            </Tabs.Panel>
                        </Tabs>
                    </Paper>
                </Box>

                <Flex direction={{base: 'column', md: 'row'}} gap="md"
                      style={{flex: 1, minWidth: 0, position: 'relative'}}>
                    <LoadingOverlay overlayProps={{radius: 'sm', blur: 2}} visible={isProcessing}/>
                    <Box
                        h={{base: 'auto', md: '100%'}}
                        miw={{md: isPreviewVisible ? 400 : undefined}}
                        w={{base: '100%', md: isPreviewVisible ? '45%' : '100%'}}
                    >
                        <ContentComposer
                            files={files}
                            selectedFile={selectedFile}
                            selectedSystemPromptId={selectedSystemPromptId}
                            setSelectedSystemPromptId={setSelectedSystemPromptId}
                            setUserPrompt={setUserPrompt}
                            systemPrompts={systemPrompts}
                            userPrompt={userPrompt}
                            onClearAll={handleClearAll}
                            onCopyAll={handleCopyAll}
                            onFileSelect={handleFileSelect}
                            onShowPreview={() => setIsPreviewVisible(true)}
                            onUncheckGroup={handleRemoveGroupItems}
                            onUncheckItem={handleRemoveItem}
                        />
                    </Box>
                    {isPreviewVisible && (
                        <Box h={{base: 'auto', md: '100%'}} style={{flex: 1, minWidth: 0}}>
                            <FileViewer
                                key={selectedFile?.path ?? 'empty-viewer'}
                                isEmpty={checkedFilePaths.length === 0}
                                selectedFile={selectedFile}
                                onClose={() => setIsPreviewVisible(false)}
                            />
                        </Box>
                    )}
                </Flex>
            </Flex>
        </Flex>
    );
};