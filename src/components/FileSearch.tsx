import { useState, useEffect, type ReactNode, useTransition } from 'react';
import {
    ActionIcon,
    Box,
    Center,
    Loader,
    NavLink,
    ScrollArea,
    Stack,
    Text,
    TextInput,
    Tooltip,
    Accordion,
    Group,
    Badge,
    ThemeIcon,
} from '@mantine/core';
import { IconPlus, IconSearch, IconX } from '@tabler/icons-react';
import { useDebouncedValue } from '@mantine/hooks';
import { FileIcon } from "./FileIcon.tsx";
import { getGroupInfoForFile } from "../helpers/FileGroupManager.tsx";

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

interface FileSearchProps {
    allFiles: FileNode[];
    checkedItems: string[];
    onCheckItem: (path: string) => void;
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

export function FileSearch({ allFiles, checkedItems, onCheckItem }: FileSearchProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery] = useDebouncedValue(searchQuery, 700);
    const [searchResults, setSearchResults] = useState<FileGroup[] | null>(null);
    const [isSearching, startTransition] = useTransition();
    const [activeAccordionItems, setActiveAccordionItems] = useState<string[]>([]);

    useEffect(() => {
        startTransition(() => {
            const query = debouncedSearchQuery.trim();
            if (!query) {
                setSearchResults(null);
                setActiveAccordionItems([]);
                return;
            }

            const lowerCaseQuery = query.toLowerCase();
            const results = allFiles.filter(file =>
                file.value.toLowerCase().includes(lowerCaseQuery)
            );

            const groups: Record<string, FileGroup> = {};
            for (const file of results) {
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

            const sortedGroups = Object.values(groups).sort((a, b) => a.label.localeCompare(b.label));
            sortedGroups.forEach(group => group.files.sort((a, b) => a.label.localeCompare(b.label)));

            setSearchResults(sortedGroups);
            setActiveAccordionItems([]);
        });
    }, [debouncedSearchQuery, allFiles]);

    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(event.currentTarget.value);
    };

    const checkedSet = new Set(checkedItems);
    const groupedFiles = searchResults ?? [];

    return (
        <Stack h="100%" gap="sm">
            <TextInput
                placeholder="Search all project files..."
                value={searchQuery}
                onChange={handleSearchChange}
                leftSection={<IconSearch size={16} stroke={1.5} />}
                rightSection={
                    searchQuery ? (
                        <ActionIcon
                            variant="transparent"
                            c="dimmed"
                            onClick={() => setSearchQuery('')}
                            aria-label="Clear search"
                        >
                            <IconX size={16} />
                        </ActionIcon>
                    ) : null
                }
            />
            <Box style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
                {isSearching && (
                    <Center pos="absolute" inset={0} style={{ zIndex: 10 }}>
                        <Loader size="sm" />
                    </Center>
                )}
                <ScrollArea h="100%">
                    {!isSearching && debouncedSearchQuery.trim() && groupedFiles.length === 0 && (
                        <Text c="dimmed" ta="center" pt="md" size="sm">No files found.</Text>
                    )}
                    {!isSearching && groupedFiles.length > 0 && (
                        <Accordion multiple value={activeAccordionItems} onChange={setActiveAccordionItems} variant="separated">
                            {groupedFiles.map((group) => (
                                <Accordion.Item key={group.label} value={group.label}>
                                    <Accordion.Control>
                                        <Group justify="space-between">
                                            <Group gap="xs">
                                                <ThemeIcon color={group.color} variant="light" size="lg" radius="sm">
                                                    {group.icon}
                                                </ThemeIcon>
                                                <Text size="sm" fw={500}>{group.label}</Text>
                                            </Group>
                                            <Badge color={group.color} variant="light" radius="sm">{group.files.length}</Badge>
                                        </Group>
                                    </Accordion.Control>
                                    <Accordion.Panel>
                                        {group.files.map((file) => (
                                            <NavLink
                                                key={file.value}
                                                label={
                                                    <Tooltip label={file.value} position="bottom-start" withArrow>
                                                        <Text truncate="end" size="sm">{file.label}</Text>
                                                    </Tooltip>
                                                }
                                                description={
                                                    <Text truncate="end" size="xs" c="dimmed">
                                                        {getTruncatedPath(file.value)}
                                                    </Text>
                                                }
                                                leftSection={<FileIcon name={file.label} isFolder={false} expanded={false} />}
                                                rightSection={
                                                    <Tooltip label="Add file to selection">
                                                        <ActionIcon
                                                            variant="subtle"
                                                            size="sm"
                                                            onClick={() => onCheckItem(file.value)}
                                                            disabled={checkedSet.has(file.value)}
                                                            aria-label="Add file"
                                                        >
                                                            <IconPlus size={16} />
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
}