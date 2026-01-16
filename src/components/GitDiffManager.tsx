import {
    ActionIcon,
    Alert,
    Box,
    Button,
    Center,
    Collapse,
    Container,
    Flex,
    Group,
    Loader,
    LoadingOverlay,
    Select,
    type SelectProps,
    Stack,
    Text,
    TextInput,
    Title,
    Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
    IconAlertCircle,
    IconCheck,
    IconFilter,
    IconGitBranch,
    IconGitCommit,
    IconRefresh,
    IconSearch,
    IconSortAscending,
    IconSortDescending,
    IconUser,
    IconX
} from '@tabler/icons-react';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { BaseDirectory, readTextFile } from '@tauri-apps/plugin-fs';
import { useEffect, useMemo, useState } from 'react';
import { ContentComposer } from './ContentComposer';
import { FileViewer } from './FileViewer';
import { loadLastActivePath } from '../helpers/SessionManager';
import { estimateTokens } from '../helpers/TokenCounter';
import { GitService, type CommitChangeDetails } from '../helpers/GitService';
import type { GitBranch, GitCommit } from '../models/GitModels';
import type { FileInfo } from '../models/FileInfo';
import type { SystemPromptItem } from '../models/SystemPromptItem';

const PROMPTS_PATH = import.meta.env.VITE_SYSTEM_PROMPTS_PATH ?? 'FileCollector/system_prompts.json';
const parsedBaseDir = parseInt(import.meta.env.VITE_FILE_BASE_PATH ?? '', 10);
const BASE_DIR = (Number.isNaN(parsedBaseDir) ? 21 : parsedBaseDir) as BaseDirectory;

type SortField = 'date' | 'author' | 'subject';
type SortDirection = 'asc' | 'desc';

interface FileChangeAggregated {
    path: string;
    totalLines: number;
    commits: string[]; // Hashes
}

export const GitDiffManager = () => {
    const [repoPath, setRepoPath] = useState<string | null>(null);
    const [gitService, setGitService] = useState<GitService | null>(null);

    const [branches, setBranches] = useState<GitBranch[]>([]);
    const [selectedBranch, setSelectedBranch] = useState<string | null>(null);

    const [allCommits, setAllCommits] = useState<GitCommit[]>([]);

    const [startCommitHash, setStartCommitHash] = useState<string | null>(null);
    const [endCommitHash, setEndCommitHash] = useState<string | null>(null);

    // File Selection State
    const [excludedFiles, setExcludedFiles] = useState<Set<string>>(new Set());
    const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);

    // Data Cache
    const [commitChanges, setCommitChanges] = useState<CommitChangeDetails[]>([]);
    const [isFetchingChanges, setIsFetchingChanges] = useState(false);

    // Preview
    const [previewContent, setPreviewContent] = useState<string | null>(null);
    const [isPreviewVisible, setIsPreviewVisible] = useState(false);
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);

    // Filters & Sort
    const [searchQuery, setSearchQuery] = useState('');
    const [filterAuthor, setFilterAuthor] = useState<string | null>(null);
    const [sortField, setSortField] = useState<SortField>('date');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
    const [filtersVisible, { toggle: toggleFilters }] = useDisclosure(true);

    const [systemPrompts, setSystemPrompts] = useState<SystemPromptItem[]>([]);
    const [selectedSystemPromptId, setSelectedSystemPromptId] = useState<string | null>(null);
    const [userPrompt, setUserPrompt] = useState('');

    const [isLoading, setIsLoading] = useState(false);
    const [isCopying, setIsCopying] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Init Logic (System Prompts, Repo Path)
    useEffect(() => {
        const getSystemPrompts = async () => {
            try {
                const content = await readTextFile(PROMPTS_PATH, { baseDir: BASE_DIR });
                const prompts = content ? JSON.parse(content) : [];
                if (Array.isArray(prompts)) setSystemPrompts(prompts);
            } catch {
                setSystemPrompts([]);
            }
        };
        getSystemPrompts();

        const initRepo = async () => {
            const path = await loadLastActivePath();
            if (path) {
                setRepoPath(path);
                setGitService(new GitService(path));
            }
        };
        initRepo();
    }, []);

    // Load Branches
    useEffect(() => {
        if (!gitService) return;
        const loadBranches = async () => {
            try {
                setIsLoading(true);
                const branchList = await gitService.getBranches();
                setBranches(branchList);
                const current = branchList.find(b => b.isCurrent);
                if (current) setSelectedBranch(current.name);
                else if (branchList.length > 0) setSelectedBranch(branchList[0].name);
            } catch (err) {
                setError(err instanceof Error ? err.message : String(err));
            } finally {
                setIsLoading(false);
            }
        };
        loadBranches();
    }, [gitService]);

    // Load Commits
    useEffect(() => {
        if (!gitService || !selectedBranch) return;
        const loadCommits = async () => {
            try {
                setIsLoading(true);
                const commitList = await gitService.getCommits(selectedBranch);
                setAllCommits(commitList);

                if (commitList.length > 0) {
                    const end = commitList[0];
                    const start = commitList.length > 5 ? commitList[5] : commitList[commitList.length - 1];
                    setEndCommitHash(end.hash);
                    setStartCommitHash(start.hash);
                } else {
                    setEndCommitHash(null);
                    setStartCommitHash(null);
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : String(err));
            } finally {
                setIsLoading(false);
            }
        };
        loadCommits();
    }, [gitService, selectedBranch]);

    const authors = useMemo(() => {
        const unique = new Set(allCommits.map(c => c.author));
        return Array.from(unique).sort();
    }, [allCommits]);

    const dropdownCommits = useMemo(() => {
        return allCommits.filter(c => {
            if (filterAuthor && c.author !== filterAuthor) return false;
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                return c.subject.toLowerCase().includes(query) ||
                    c.shortHash.toLowerCase().includes(query) ||
                    c.hash.toLowerCase().includes(query);
            }
            return true;
        });
    }, [allCommits, filterAuthor, searchQuery]);

    const finalCommits = useMemo(() => {
        if (!startCommitHash || !endCommitHash || allCommits.length === 0) return [];

        const startIndex = allCommits.findIndex(c => c.hash === startCommitHash);
        const endIndex = allCommits.findIndex(c => c.hash === endCommitHash);

        if (startIndex === -1 || endIndex === -1) return [];

        const firstIndex = Math.min(startIndex, endIndex);
        const lastIndex = Math.max(startIndex, endIndex);

        const rawSlice = allCommits.slice(firstIndex, lastIndex + 1);

        const filtered = rawSlice.filter(c => {
            if (filterAuthor && c.author !== filterAuthor) return false;
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                return c.subject.toLowerCase().includes(query) ||
                    c.shortHash.toLowerCase().includes(query) ||
                    c.hash.toLowerCase().includes(query);
            }
            return true;
        });

        return filtered.sort((a, b) => {
            let comparison: number;
            switch (sortField) {
                case 'author':
                    comparison = a.author.localeCompare(b.author);
                    break;
                case 'subject':
                    comparison = a.subject.localeCompare(b.subject);
                    break;
                case 'date':
                default:
                    comparison = a.date.localeCompare(b.date);
                    if (comparison === 0) {
                        const idxA = allCommits.indexOf(a);
                        const idxB = allCommits.indexOf(b);
                        comparison = idxB - idxA;
                    }
                    break;
            }
            return sortDirection === 'asc' ? comparison : -comparison;
        });
    }, [allCommits, startCommitHash, endCommitHash, filterAuthor, searchQuery, sortField, sortDirection]);

    // Fetch Changed Files for the selected commits
    useEffect(() => {
        if (!gitService || finalCommits.length === 0) {
            setCommitChanges([]);
            return;
        }

        const fetchChanges = async () => {
            setIsFetchingChanges(true);
            try {
                const hashes = finalCommits.map(c => c.hash);
                const changes = await gitService.getBulkCommitChanges(hashes);
                setCommitChanges(changes);
                setExcludedFiles(new Set()); // Reset selections on range/filter change
            } catch (e) {
                console.error("Failed to fetch changes", e);
            } finally {
                setIsFetchingChanges(false);
            }
        };

        const timer = setTimeout(fetchChanges, 200); // Debounce slightly
        return () => clearTimeout(timer);

    }, [finalCommits, gitService]);

    // Aggregate files from commitChanges
    const aggregatedFiles: FileInfo[] = useMemo(() => {
        const fileMap = new Map<string, FileChangeAggregated>();

        for (const cc of commitChanges) {
            for (const file of cc.files) {
                if (!fileMap.has(file.path)) {
                    fileMap.set(file.path, { path: file.path, totalLines: 0, commits: [] });
                }
                const entry = fileMap.get(file.path)!;
                entry.totalLines += (file.additions + file.deletions);
                entry.commits.push(cc.hash);
            }
        }

        return Array.from(fileMap.values())
            .map(f => ({
                path: f.path,
                status: 'complete' as const,
                // Rough estimation: 1 line ~ 10 tokens
                tokenCount: f.totalLines * 10,
                language: f.path.split('.').pop()
            }))
            .sort((a, b) => a.path.localeCompare(b.path));
    }, [commitChanges]);

    // Fetch Preview Content Effect
    useEffect(() => {
        if (!isPreviewVisible || !selectedFilePath || !gitService) {
            return;
        }

        const fetchPreview = async () => {
            setIsPreviewLoading(true);
            setPreviewContent(null);

            try {
                // Identify commits that touched this file
                const relevantCommits = finalCommits.filter(c => {
                    const changes = commitChanges.find(cc => cc.hash === c.hash);
                    return changes?.files.some(f => f.path === selectedFilePath);
                });

                if (relevantCommits.length === 0) {
                    setPreviewContent("No changes found for this file in the current selection range.");
                    return;
                }

                const diffs = await Promise.all(relevantCommits.map(async (c) => {
                    const d = await gitService.getCommitDiff(c.hash, [selectedFilePath]);
                    return `commit ${c.hash}\nAuthor: ${c.author}\nDate: ${c.date}\nSubject: ${c.subject}\n\n${d}`;
                }));

                setPreviewContent(diffs.join('\n' + '-'.repeat(40) + '\n'));
            } catch (error) {
                const msg = error instanceof Error ? error.message : String(error);
                setPreviewContent(`Error loading preview: ${msg}`);
            } finally {
                setIsPreviewLoading(false);
            }
        };

        fetchPreview();
    }, [selectedFilePath, isPreviewVisible, finalCommits, commitChanges, gitService]);


    const handleCopyAll = async () => {
        if (!gitService || finalCommits.length === 0) return;
        setIsCopying(true);

        try {
            const systemPrompt = systemPrompts.find(p => p.id === selectedSystemPromptId)?.content ?? '';

            const allowedFilesPerCommit = new Map<string, string[]>();

            for (const cc of commitChanges) {
                const allowed = cc.files
                    .map(f => f.path)
                    .filter(path => !excludedFiles.has(path));

                if (allowed.length > 0) {
                    allowedFilesPerCommit.set(cc.hash, allowed);
                }
            }

            const commitsToProcess = finalCommits.filter(c => allowedFilesPerCommit.has(c.hash));

            if (commitsToProcess.length === 0) {
                notifications.show({ title: 'Nothing to Copy', message: 'No files selected in the given range.', color: 'yellow' });
                setIsCopying(false);
                return;
            }

            const diffs = await Promise.all(commitsToProcess.map(async (c) => {
                const files = allowedFilesPerCommit.get(c.hash)!;
                const diffContent = await gitService.getCommitDiff(c.hash, files);
                return `COMMIT: ${c.hash}\nAUTHOR: ${c.author}\nDATE: ${c.date}\nSUBJECT: ${c.subject}\n\n${diffContent}`;
            }));

            const contentParts = [];
            if (systemPrompt.trim()) contentParts.push(`SYSTEM PROMPT:\n\n${systemPrompt.trim()}`);

            const summary = commitsToProcess.map(c => `- ${c.shortHash} ${c.subject} (${c.author})`).join('\n');
            contentParts.push(`COMMIT SUMMARY:\n\n${summary}`);

            contentParts.push(diffs.join('\n\n' + '-'.repeat(40) + '\n\n'));

            if (userPrompt.trim()) contentParts.push(`USER PROMPT:\n\n${userPrompt.trim()}`);

            const finalContent = contentParts.join('\n\n' + '='.repeat(40) + '\n\n');
            await writeText(finalContent);

            notifications.show({
                title: 'Git Diff Copied',
                message: `Copied changes from ${commitsToProcess.length} commits.`,
                color: 'green',
                icon: <IconCheck size={18}/>,
            });

        } catch (err) {
            notifications.show({
                title: 'Copy Failed',
                message: err instanceof Error ? err.message : String(err),
                color: 'red',
            });
        } finally {
            setIsCopying(false);
        }
    };

    const handleUncheckItem = (path: string) => {
        setExcludedFiles(prev => {
            const next = new Set(prev);
            next.add(path);
            return next;
        });
    };

    const handleUncheckGroup = (paths: string[]) => {
        setExcludedFiles(prev => {
            const next = new Set(prev);
            paths.forEach(p => next.add(p));
            return next;
        });
    };

    const handleClearAll = () => {
        setExcludedFiles(new Set(aggregatedFiles.map(f => f.path)));
        setSelectedFilePath(null);
        setPreviewContent(null);
    };

    const handleFileSelect = (file: FileInfo | null) => {
        setSelectedFilePath(file?.path ?? null);
    };

    const handleShowPreview = () => {
        setIsPreviewVisible(true);
    };

    const getCommitLabel = (c: GitCommit) => `[${c.date}] ${c.author}: ${c.subject}`;

    const renderCommitOption: SelectProps['renderOption'] = ({ option }) => {
        const commit = allCommits.find(c => c.hash === option.value);
        if (!commit) return <Text size="sm">{option.label}</Text>;
        return (
            <Box>
                <Text fw={500} size="sm" truncate="end">{commit.subject}</Text>
                <Group gap="xs" wrap="nowrap">
                    <Text c="dimmed" size="xs">{commit.date}</Text>
                    <Text c="dimmed" size="xs">•</Text>
                    <Text c="dimmed" size="xs" truncate="end">{commit.author}</Text>
                    <Text c="dimmed" size="xs">•</Text>
                    <Text c="dimmed" ff="monospace" size="xs">{commit.shortHash}</Text>
                </Group>
            </Box>
        );
    };

    const toggleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('desc');
        }
    };

    if (!repoPath) {
        return (
            <Container p="xl">
                <Alert color="blue" icon={<IconAlertCircle size="1rem" />}>
                    No active project found. Please select a folder in the Home tab first.
                </Alert>
            </Container>
        );
    }

    const selectedFileObj = selectedFilePath ? aggregatedFiles.find(f => f.path === selectedFilePath) ?? null : null;

    const validFiles = aggregatedFiles.filter(f => !excludedFiles.has(f.path));
    const fileTokens = validFiles.reduce((acc, f) => acc + (f.tokenCount || 0), 0);
    const totalTokens = estimateTokens(userPrompt) +
        (selectedSystemPromptId ? estimateTokens(systemPrompts.find(p => p.id === selectedSystemPromptId)?.content || '') : 0) +
        fileTokens;

    return (
        <Flex direction="column" gap="md" h="calc(100vh - 100px)">
            <LoadingOverlay overlayProps={{ radius: "sm", blur: 2 }} visible={isCopying} zIndex={1000} />

            <Stack gap="sm" p="md">
                <Group justify="space-between">
                    <Title order={4}>Git Diff Explorer</Title>
                    <Group>
                        <Tooltip label="Toggle Filters">
                            <ActionIcon variant={filtersVisible ? 'filled' : 'light'} onClick={toggleFilters}>
                                <IconFilter size={18}/>
                            </ActionIcon>
                        </Tooltip>
                        <Button
                            leftSection={<IconRefresh size={18} />}
                            variant="light"
                            onClick={() => {
                                setGitService(new GitService(repoPath));
                            }}
                        >
                            Refresh
                        </Button>
                    </Group>
                </Group>

                {error && <Alert withCloseButton color="red" onClose={() => setError(null)}>{error}</Alert>}

                <Group grow>
                    <Select
                        searchable
                        data={branches.map(b => ({ value: b.name, label: b.name }))}
                        label="Branch"
                        leftSection={<IconGitBranch size={16} />}
                        value={selectedBranch}
                        onChange={setSelectedBranch}
                    />
                    <TextInput
                        label="Search Commits"
                        leftSection={<IconSearch size={16}/>}
                        placeholder="Filter by subject or hash..."
                        rightSection={
                            searchQuery ? (
                                <ActionIcon c="dimmed" variant="transparent" onClick={() => setSearchQuery('')}>
                                    <IconX size={16} />
                                </ActionIcon>
                            ) : null
                        }
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.currentTarget.value)}
                    />
                </Group>

                <Collapse in={filtersVisible}>
                    <Group grow align="flex-end">
                        <Select
                            clearable
                            searchable
                            data={authors}
                            label="Filter Author"
                            leftSection={<IconUser size={16}/>}
                            placeholder="All Authors"
                            value={filterAuthor}
                            onChange={setFilterAuthor}
                        />
                        <Group grow gap="xs" style={{flex: 1}}>
                            <Button
                                leftSection={sortField === 'date' ? (sortDirection === 'asc' ? <IconSortAscending size={16}/> : <IconSortDescending size={16}/>) : null}
                                variant={sortField === 'date' ? 'filled' : 'light'}
                                onClick={() => toggleSort('date')}
                            >
                                Date
                            </Button>
                            <Button
                                leftSection={sortField === 'author' ? (sortDirection === 'asc' ? <IconSortAscending size={16}/> : <IconSortDescending size={16}/>) : null}
                                variant={sortField === 'author' ? 'filled' : 'light'}
                                onClick={() => toggleSort('author')}
                            >
                                Author
                            </Button>
                        </Group>
                    </Group>
                </Collapse>

                <Group grow>
                    <Select
                        searchable
                        data={dropdownCommits.map(c => ({ value: c.hash, label: getCommitLabel(c) }))}
                        label="Start Commit (Older)"
                        leftSection={<IconGitCommit size={16} />}
                        limit={20}
                        nothingFoundMessage="No commits match your filters"
                        renderOption={renderCommitOption}
                        value={startCommitHash}
                        onChange={setStartCommitHash}
                    />
                    <Select
                        searchable
                        data={dropdownCommits.map(c => ({ value: c.hash, label: getCommitLabel(c) }))}
                        label="End Commit (Newer)"
                        leftSection={<IconGitCommit size={16} />}
                        limit={20}
                        nothingFoundMessage="No commits match your filters"
                        renderOption={renderCommitOption}
                        value={endCommitHash}
                        onChange={setEndCommitHash}
                    />
                </Group>

                <Text c="dimmed" size="xs" ta="center">
                    {finalCommits.length} commits selected. {validFiles.length} files modified. {isFetchingChanges ? '(Analyzing...)' : ''}
                </Text>
            </Stack>

            {isLoading ? (
                <Center h="100%">
                    <Loader size="lg" />
                </Center>
            ) : (
                <Flex direction={{base: 'column', md: 'row'}} gap="md" pb="md" px="md" style={{flex: 1, minHeight: 0}}>
                    <Box style={{ flex: 1, minHeight: 0 }}>
                        <ContentComposer
                            files={validFiles}
                            includeFileTree={false}
                            selectedFile={selectedFileObj}
                            selectedSystemPromptId={selectedSystemPromptId}
                            setIncludeFileTree={() => {}}
                            setSelectedSystemPromptId={setSelectedSystemPromptId}
                            setUserPrompt={setUserPrompt}
                            systemPrompts={systemPrompts}
                            totalTokens={totalTokens}
                            treeRootPath={null}
                            userPrompt={userPrompt}
                            onClearAll={handleClearAll}
                            onClearTreeRoot={() => {}}
                            onCopyAll={handleCopyAll}
                            onFileSelect={handleFileSelect}
                            onReloadContent={() => {}}
                            onShowPreview={handleShowPreview}
                            onUncheckGroup={handleUncheckGroup}
                            onUncheckItem={handleUncheckItem}
                        />
                    </Box>
                    {isPreviewVisible && (
                        <Box h={{base: 'auto', md: '100%'}} style={{flex: 1, minWidth: 0}}>
                            {isPreviewLoading ? (
                                <Center h="100%"><Loader /></Center>
                            ) : (
                                <FileViewer
                                    content={previewContent || ""}
                                    isEmpty={!selectedFilePath}
                                    selectedFile={selectedFileObj}
                                    onClose={() => setIsPreviewVisible(false)}
                                />
                            )}
                        </Box>
                    )}
                </Flex>
            )}
        </Flex>
    );
};