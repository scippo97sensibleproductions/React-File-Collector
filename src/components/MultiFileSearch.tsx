import {type ReactNode, useState, useTransition} from 'react';
import {
    Accordion,
    ActionIcon,
    Badge,
    Box,
    Button,
    Center,
    Group,
    Loader,
    NavLink,
    ScrollArea,
    Stack,
    Text,
    Textarea,
    ThemeIcon,
    Tooltip,
} from '@mantine/core';
import {IconFileImport, IconPlus, IconSearch} from '@tabler/icons-react';
import {FileIcon} from "./FileIcon.tsx";
import {getGroupInfoForFile} from "../helpers/FileGroupManager.tsx";

interface FileNode {
    label: string;
    value: string;
}

interface FileGroup {
    label: string;
    icon: ReactNode;
    color: string;
    files: FileNode[];
}

interface MultiFileSearchProps {
    allFiles: FileNode[];
    checkedItems: string[];
    onCheckItem: (path: string) => void;
    onCheckItems: (paths: string[]) => void;
}

const getTruncatedPath = (fullPath: string): string => {
    const separator = fullPath.includes('/') ? '/' : '\\';
    const parts = fullPath.split(separator);
    if (parts.length <= 1) return '';

    const pathParts = parts.slice(0, -1);
    if (pathParts.length <= 3) {
        return pathParts.join(separator);
    }

    const relevantParts = pathParts.slice(-3);
    return `...${separator}${relevantParts.join(separator)}`;
};

export const MultiFileSearch = ({allFiles, checkedItems, onCheckItem, onCheckItems}: MultiFileSearchProps) => {
    const [inputValue, setInputValue] = useState('');
    const [searchResults, setSearchResults] = useState<FileGroup[] | null>(null);
    const [isSearching, startTransition] = useTransition();

    const handleSearch = () => {
        startTransition(() => {
            const searchTerms = inputValue
                .split('\n')
                .map(line => line.trim().replace(/\\/g, '/'))
                .filter(line => line.length > 0);

            if (searchTerms.length === 0) {
                setSearchResults(null);
                return;
            }

            const normalizedFiles = allFiles.map(file => ({
                ...file,
                normalizedValue: file.value.replace(/\\/g, '/')
            }));

            const matchedFiles = new Set<FileNode>();
            for (const file of normalizedFiles) {
                for (const term of searchTerms) {
                    if (file.normalizedValue.endsWith(term)) {
                        matchedFiles.add(file);
                        break;
                    }
                }
            }

            const groups: Record<string, FileGroup> = {};
            for (const file of Array.from(matchedFiles)) {
                const groupInfo = getGroupInfoForFile(file.label);
                if (!groups[groupInfo.label]) {
                    groups[groupInfo.label] = {
                        label: groupInfo.label,
                        icon: groupInfo.icon,
                        color: groupInfo.color,
                        files: [],
                    };
                }
                groups[groupInfo.label].files.push(file);
            }

            const groupedFilesArray = Object.values(groups);
            const sortedGroups = groupedFilesArray.toSorted((a, b) => a.label.localeCompare(b.label));

            for (const group of sortedGroups) {
                group.files.sort((a, b) => a.label.localeCompare(b.label));
            }

            setSearchResults(sortedGroups);
        });
    };

    const handleAddAll = () => {
        if (!searchResults) return;
        const allFoundPaths = searchResults.flatMap(group => group.files.map(file => file.value));
        onCheckItems(allFoundPaths);
    };

    const checkedSet = new Set(checkedItems);
    const totalFoundCount = searchResults?.reduce((acc, group) => acc + group.files.length, 0) ?? 0;

    return (
        <Stack gap="sm" h="100%">
            <Textarea
                autosize
                label="File paths"
                minRows={3}
                placeholder="directory/file.ts&#10;another/file.cs&#10;..."
                value={inputValue}
                onChange={(event) => setInputValue(event.currentTarget.value)}
            />
            <Group grow>
                <Button
                    disabled={isSearching || !inputValue.trim()}
                    leftSection={<IconSearch size={16}/>}
                    variant="light"
                    onClick={handleSearch}
                >
                    Search
                </Button>
                <Button
                    disabled={isSearching || totalFoundCount === 0}
                    leftSection={<IconFileImport size={16}/>}
                    variant="light"
                    onClick={handleAddAll}
                >
                    Add All ({totalFoundCount})
                </Button>
            </Group>

            <Box style={{flex: 1, overflow: 'hidden', position: 'relative'}}>
                {isSearching && (
                    <Center inset={0} pos="absolute" style={{zIndex: 10}}>
                        <Loader size="sm"/>
                    </Center>
                )}
                <ScrollArea h="100%">
                    {!isSearching && searchResults && totalFoundCount === 0 && (
                        <Text c="dimmed" pt="md" size="sm" ta="center">No files found.</Text>
                    )}
                    {!isSearching && searchResults && totalFoundCount > 0 && (
                        <Accordion multiple defaultValue={searchResults.map(g => g.label)} variant="separated">
                            {searchResults.map((group) => (
                                <Accordion.Item key={group.label} value={group.label}>
                                    <Accordion.Control>
                                        <Group justify="space-between">
                                            <Group gap="xs">
                                                <ThemeIcon color={group.color} radius="sm" size="lg" variant="light">
                                                    {group.icon}
                                                </ThemeIcon>
                                                <Text fw={500} size="sm">{group.label}</Text>
                                            </Group>
                                            <Badge color={group.color} radius="sm"
                                                   variant="light">{group.files.length}</Badge>
                                        </Group>
                                    </Accordion.Control>
                                    <Accordion.Panel>
                                        {group.files.map((file) => (
                                            <NavLink
                                                key={file.value}
                                                description={
                                                    <Text c="dimmed" size="xs" truncate="end">
                                                        {getTruncatedPath(file.value)}
                                                    </Text>
                                                }
                                                label={
                                                    <Tooltip withArrow label={file.value} position="bottom-start">
                                                        <Text size="sm" truncate="end">{file.label}</Text>
                                                    </Tooltip>
                                                }
                                                leftSection={<FileIcon expanded={false} isFolder={false}
                                                                       name={file.label}/>}
                                                rightSection={
                                                    <Tooltip label="Add file to selection">
                                                        <ActionIcon
                                                            aria-label="Add file"
                                                            disabled={checkedSet.has(file.value)}
                                                            size="sm"
                                                            variant="subtle"
                                                            onClick={() => onCheckItem(file.value)}
                                                        >
                                                            <IconPlus size={16}/>
                                                        </ActionIcon>
                                                    </Tooltip>
                                                }
                                            />
                                        ))}
                                    </Accordion.Panel>
                                </Accordion.Item>
                            ))}
                        </Accordion>
                    )}
                </ScrollArea>
            </Box>
        </Stack>
    );
};