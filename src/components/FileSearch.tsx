import {type ReactNode, useEffect, useState, useTransition} from 'react';
import {
    Accordion,
    ActionIcon,
    Badge,
    Box,
    Center,
    Group,
    Loader,
    NavLink,
    ScrollArea,
    Stack,
    Text,
    TextInput,
    ThemeIcon,
    Tooltip,
} from '@mantine/core';
import {IconPlus, IconSearch, IconX} from '@tabler/icons-react';
import {useDebouncedValue} from '@mantine/hooks';
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

export const FileSearch = ({allFiles, checkedItems, onCheckItem}: FileSearchProps) => {
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
        <Stack gap="sm" h="100%">
            <TextInput
                leftSection={<IconSearch size={16} stroke={1.5}/>}
                placeholder="Search all project files..."
                rightSection={
                    searchQuery ? (
                        <ActionIcon
                            aria-label="Clear search"
                            c="dimmed"
                            variant="transparent"
                            onClick={() => setSearchQuery('')}
                        >
                            <IconX size={16}/>
                        </ActionIcon>
                    ) : null
                }
                value={searchQuery}
                onChange={handleSearchChange}
            />
            <Box style={{flex: 1, overflow: 'hidden', position: 'relative'}}>
                {isSearching && (
                    <Center inset={0} pos="absolute" style={{zIndex: 10}}>
                        <Loader size="sm"/>
                    </Center>
                )}
                <ScrollArea h="100%">
                    {!isSearching && debouncedSearchQuery.trim() && groupedFiles.length === 0 && (
                        <Text c="dimmed" pt="md" size="sm" ta="center">No files found.</Text>
                    )}
                    {!isSearching && groupedFiles.length > 0 && (
                        <Accordion multiple value={activeAccordionItems} variant="separated"
                                   onChange={setActiveAccordionItems}>
                            {groupedFiles.map((group) => (
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
}