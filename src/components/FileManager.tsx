import {
    ActionIcon,
    Box,
    Button,
    Center,
    Flex,
    Group,
    Loader,
    Overlay,
    Paper,
    Stack,
    Tabs,
    Text,
    Tooltip,
    useMantineTheme
} from "@mantine/core";
import {IconArchive, IconCheck, IconFiles, IconFolderOpen, IconRefresh, IconSearch, IconTxt} from "@tabler/icons-react";
import {useCallback, useEffect, useRef, useState} from "react";
import {FileSearch} from "./FileSearch.tsx";
import {VirtualizedFileTree} from "./VirtualizedFileTree.tsx";
import {ContextManager} from "./ContextManager.tsx";
import {BaseDirectory, readTextFile, stat} from "@tauri-apps/plugin-fs";
import {useDebouncedValue, useMediaQuery} from "@mantine/hooks";
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
import FileProcessorWorker from '../workers/fileProcessor.worker.ts?worker';
import {MultiFileSearch} from "./MultiFileSearch.tsx";
import {LoadingScreen} from "./LoadingScreen.tsx";

const PROMPTS_PATH = import.meta.env.VITE_SYSTEM_PROMPTS_PATH ?? 'FileCollector/system_prompts.json';
const parsedBaseDir = parseInt(import.meta.env.VITE_FILE_BASE_PATH ?? '', 10);
const BASE_DIR = (Number.isNaN(parsedBaseDir) ? 21 : parsedBaseDir) as BaseDirectory;
const MAX_FILE_SIZE_BYTES = 200_000;

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
    onAbort: () => void;
}

const generateTreeString = (nodes: DefinedTreeNode[], prefix = ''): string => {
    let treeString = '';
    nodes.forEach((node, index) => {
        const isLast = index === nodes.length - 1;
        const connector = isLast ? '└─ ' : '├─ ';
        const newPrefix = prefix + (isLast ? '    ' : '│   ');
        treeString += `${prefix}${connector}${node.label}\n`;
        if (node.children) {
            treeString += generateTreeString(node.children, newPrefix);
        }
    });
    return treeString;
};

const findNodeByPath = (nodes: DefinedTreeNode[], path: string): DefinedTreeNode | null => {
    for (const node of nodes) {
        if (node.value === path) {
            return node;
        }
        if (node.children) {
            const found = findNodeByPath(node.children, path);
            if (found) {
                return found;
            }
        }
    }
    return null;
};


export const FileManager = ({
                                data,
                                allFiles,
                                checkedItems,
                                setCheckedItems,
                                onNodeToggle,
                                path,
                                isLoading,
                                onSelectFolder,
                                onReloadTree,
                                onAbort
                            }: FileManagerProps) => {
    const theme = useMantineTheme();
    const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);

    const [files, setFiles] = useState<Map<string, FileInfo>>(new Map());
    const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [systemPrompts, setSystemPrompts] = useState<SystemPromptItem[]>([]);
    const [selectedSystemPromptId, setSelectedSystemPromptId] = useState<string | null>(null);
    const [userPrompt, setUserPrompt] = useState('');
    const [debouncedUserPrompt] = useDebouncedValue(userPrompt, 1000);
    const [composedTotalTokens, setComposedTotalTokens] = useState(0);
    const [isPreviewVisible, setIsPreviewVisible] = useState(false);
    const [includeFileTree, setIncludeFileTree] = useState(false);
    const [treeRootPath, setTreeRootPath] = useState<string | null>(null);

    const workerRef = useRef<Worker | null>(null);
    const jobCounterRef = useRef(0);

    useEffect(() => {
        const worker = new FileProcessorWorker();
        workerRef.current = worker;

        worker.onmessage = (event: MessageEvent<{ jobId: number; fileInfo: FileInfo }>) => {
            if (event.data.jobId !== jobCounterRef.current) return;

            setFiles(prevFiles => {
                const newFiles = new Map(prevFiles);
                newFiles.set(event.data.fileInfo.path, event.data.fileInfo);
                return newFiles;
            });
        };

        return () => worker.terminate();
    }, []);

    useEffect(() => {
        const getSystemPrompts = async () => {
            try {
                const content = await readTextFile(PROMPTS_PATH, {baseDir: BASE_DIR});
                const prompts = content ? JSON.parse(content) : [];
                if (Array.isArray(prompts)) setSystemPrompts(prompts);
            } catch {
                setSystemPrompts([]);
            }
        };
        getSystemPrompts();
    }, []);

    const processFiles = useCallback((paths: string[]) => {
        if (!workerRef.current) return;
        jobCounterRef.current += 1;
        const currentJobId = jobCounterRef.current;

        paths.forEach(async (path) => {
            try {
                const meta = await stat(path);
                if (meta.size > MAX_FILE_SIZE_BYTES) {
                    throw new Error(`File is too large (over ${MAX_FILE_SIZE_BYTES / 1000} KB).`);
                }

                const content = await readTextFileWithDetectedEncoding(path);
                workerRef.current?.postMessage({
                    file: {path, content},
                    jobId: currentJobId
                });

            } catch (e) {
                const errorInfo: FileInfo = {
                    path,
                    status: 'error',
                    error: e instanceof Error ? e.message : String(e),
                };
                setFiles(prev => new Map(prev).set(path, errorInfo));
            }
        });
    }, []);


    const handleReloadContent = () => {
        const paths = Array.from(files.keys());
        setFiles(prev => {
            const pendingFiles = new Map(prev);
            for (const path of paths) {
                pendingFiles.set(path, {...pendingFiles.get(path)!, status: 'processing'});
            }
            return pendingFiles;
        });
        processFiles(paths);
    };


    useEffect(() => {
        const currentPaths = new Set(checkedItems);
        const previousPaths = new Set(files.keys());

        const addedPaths = checkedItems.filter(p => !previousPaths.has(p));
        const removedPaths = Array.from(previousPaths).filter(p => !currentPaths.has(p));

        if (addedPaths.length === 0 && removedPaths.length === 0) return;

        setFiles(prev => {
            const newFiles = new Map(prev);
            removedPaths.forEach(path => newFiles.delete(path));
            addedPaths.forEach(path => newFiles.set(path, {path, status: 'processing'}));
            return newFiles;
        });

        if (addedPaths.length > 0) {
            processFiles(addedPaths);
        }

        if (selectedFilePath && removedPaths.includes(selectedFilePath)) {
            setSelectedFilePath(null);
        }

    }, [checkedItems, files, selectedFilePath, processFiles]);


    useEffect(() => {
        let activeJobs = 0;
        let totalFileTokens = 0;

        for (const file of files.values()) {
            if (file.status === 'pending' || file.status === 'processing') {
                activeJobs++;
            }
            if (file.status === 'complete' && file.tokenCount) {
                totalFileTokens += file.tokenCount;
            }
        }
        setIsProcessing(activeJobs > 0);

        const userPromptTokens = estimateTokens(debouncedUserPrompt);
        const selectedPrompt = systemPrompts.find(p => p.id === selectedSystemPromptId);
        const systemPromptTokens = selectedPrompt ? estimateTokens(selectedPrompt.content) : 0;

        let treeTokens = 0;
        if (includeFileTree && data.length > 0) {
            const rootNode = treeRootPath ? findNodeByPath(data, treeRootPath) : null;
            const nodesForTree = rootNode ? [rootNode] : data;
            const treeString = generateTreeString(nodesForTree);
            treeTokens = estimateTokens(treeString);
        }

        setComposedTotalTokens(systemPromptTokens + userPromptTokens + totalFileTokens + treeTokens);

    }, [files, debouncedUserPrompt, selectedSystemPromptId, systemPrompts, includeFileTree, data, treeRootPath]);

    const handleAddItem = (filePath: string) => {
        setCheckedItems(prevItems => Array.from(new Set(prevItems).add(filePath)));
    };

    const handleAddItems = (filePaths: string[]) => {
        setCheckedItems(prevItems => Array.from(new Set([...prevItems, ...filePaths])));
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

    const selectedFile = selectedFilePath ? files.get(selectedFilePath) ?? null : null;

    const handleFileSelect = (file: FileInfo | null) => {
        setSelectedFilePath(file?.path ?? null);
    };

    const handleSetTreeRoot = (path: string | null) => {
        setTreeRootPath(currentPath => (currentPath === path ? null : path));
    };

    const handleCopyAll = async () => {
        const filesToCopy = Array.from(files.values()).filter(file => file.status === 'complete');
        const systemPromptContent = systemPrompts.find(p => p.id === selectedSystemPromptId)?.content ?? '';
        const hasTree = includeFileTree && data.length > 0;

        if (filesToCopy.length === 0 && !userPrompt && !systemPromptContent && !hasTree) {
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
                        return `FILE PATH: ${file.path}\n\nCONTENT:\n\`\`\`${file.language ?? ''}\n${content}\n\`\`\``;
                    } catch {
                        return `FILE PATH: ${file.path}\n\nCONTENT:\n\`\`\`\n--- ERROR READING FILE ---\n\`\`\``;
                    }
                })
            );

            const contentParts = [];
            if (systemPromptContent.trim()) contentParts.push(`SYSTEM PROMPT:\n\n${systemPromptContent.trim()}`);
            if (hasTree) {
                const rootNode = treeRootPath ? findNodeByPath(data, treeRootPath) : null;
                const nodesForTree = rootNode ? [rootNode] : data;
                const treeString = generateTreeString(nodesForTree);
                contentParts.push(`PROJECT FILE TREE:\n\n\`\`\`\n${treeString}\`\`\``);
            }
            if (fileContents.length > 0) contentParts.push(fileContents.join('\n\n---\n\n'));
            if (userPrompt.trim()) contentParts.push(`USER PROMPT:\n\n${userPrompt.trim()}`);
            const formattedContent = contentParts.join('\n\n---\n\n');

            await writeText(formattedContent);

            notifications.show({
                title: 'Content Copied',
                message: `Successfully copied ~${composedTotalTokens.toLocaleString()} tokens to clipboard.`,
                color: 'green',
                icon: <IconCheck size={18}/>,
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
        <Flex direction="column" gap="md" h={{base: 'auto', lg: 'calc(100vh - 100px)'}}>
            <LoadingScreen message="Scanning directory..." visible={isLoading} onAbort={onAbort} />

            <Box pos="relative">
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
                                <Tabs.Tab leftSection={<IconTxt size={16}/>} value="multi-search">
                                    Multi-Search
                                </Tabs.Tab>
                                <Tabs.Tab leftSection={<IconArchive size={16}/>} value="contexts">
                                    Contexts
                                </Tabs.Tab>
                            </Tabs.List>

                            <Tabs.Panel pt="xs" style={{flex: 1, minHeight: 0}} value="files">
                                <VirtualizedFileTree
                                    checkedItems={checkedItems}
                                    data={data}
                                    treeRootPath={treeRootPath}
                                    onNodeToggle={onNodeToggle}
                                    onSetTreeRoot={handleSetTreeRoot}
                                />
                            </Tabs.Panel>

                            <Tabs.Panel pt="xs" style={{flex: 1, minHeight: 0}} value="search">
                                <FileSearch
                                    allFiles={allFiles}
                                    checkedItems={checkedItems}
                                    onCheckItem={handleAddItem}
                                />
                            </Tabs.Panel>

                            <Tabs.Panel pt="xs" style={{flex: 1, minHeight: 0}} value="multi-search">
                                <MultiFileSearch
                                    allFiles={allFiles}
                                    checkedItems={checkedItems}
                                    onCheckItem={handleAddItem}
                                    onCheckItems={handleAddItems}
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
                    {isProcessing && (
                        <Overlay backgroundOpacity={0.6} blur={2} color="var(--mantine-color-body)" zIndex={100}>
                            <Center h="100%">
                                <Stack align="center" gap="xs">
                                    <Loader size="sm"/>
                                    <Text c="dimmed" size="xs">Processing files...</Text>
                                </Stack>
                            </Center>
                        </Overlay>
                    )}
                    <Box
                        h={{base: 'auto', md: '100%'}}
                        miw={{md: isPreviewVisible ? 400 : undefined}}
                        w={{base: '100%', md: isPreviewVisible ? '45%' : '100%'}}
                    >
                        <ContentComposer
                            files={Array.from(files.values())}
                            includeFileTree={includeFileTree}
                            selectedFile={selectedFile}
                            selectedSystemPromptId={selectedSystemPromptId}
                            setIncludeFileTree={setIncludeFileTree}
                            setSelectedSystemPromptId={setSelectedSystemPromptId}
                            setUserPrompt={setUserPrompt}
                            systemPrompts={systemPrompts}
                            totalTokens={composedTotalTokens}
                            treeRootPath={treeRootPath}
                            userPrompt={userPrompt}
                            onClearAll={handleClearAll}
                            onClearTreeRoot={() => setTreeRootPath(null)}
                            onCopyAll={handleCopyAll}
                            onFileSelect={handleFileSelect}
                            onReloadContent={handleReloadContent}
                            onShowPreview={() => setIsPreviewVisible(true)}
                            onUncheckGroup={handleRemoveGroupItems}
                            onUncheckItem={handleRemoveItem}
                        />
                    </Box>
                    {isPreviewVisible && (
                        <Box h={{base: 'auto', md: '100%'}} style={{flex: 1, minWidth: 0}}>
                            <FileViewer
                                isEmpty={checkedItems.length === 0}
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