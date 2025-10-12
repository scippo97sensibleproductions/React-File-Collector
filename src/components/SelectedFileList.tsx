import {
    ActionIcon,
    Box,
    NavLink,
    Text,
    Tooltip,
    useMantineTheme,
    rgba,
    Accordion,
    Group,
    Badge,
    Stack,
    ScrollArea,
    useMantineColorScheme,
} from '@mantine/core';
import { IconTrash, IconX } from '@tabler/icons-react';
import type { FileInfo } from "../models/FileInfo.ts";
import { FileIcon } from "./FileIcon.tsx";
import { getGroupInfoForFile, type FileGroupInfo } from "../helpers/FileGroupManager.tsx";

interface SelectedFileListProps {
    files: FileInfo[];
    selectedFile: FileInfo | null;
    onFileSelect: (file: FileInfo | null) => void;
    onUncheckItem: (path: string) => void;
    onUncheckGroup?: (paths: string[]) => void;
}

interface FileGroup {
    groupInfo: FileGroupInfo;
    files: FileInfo[];
    totalTokens: number;
}

export const SelectedFileList = ({
                                     files,
                                     selectedFile,
                                     onFileSelect,
                                     onUncheckItem,
                                     onUncheckGroup,
                                 }: SelectedFileListProps) => {
    const theme = useMantineTheme();
    const { colorScheme } = useMantineColorScheme();

    const groups: Record<string, FileGroup> = {};

    for (const file of files) {
        const groupInfo = getGroupInfoForFile(file.path);
        if (!groups[groupInfo.key]) {
            groups[groupInfo.key] = { groupInfo, files: [], totalTokens: 0 };
        }
        groups[groupInfo.key].files.push(file);
        groups[groupInfo.key].totalTokens += file.tokenCount ?? 0;
    }

    const groupedFiles: FileGroup[] = Object.values(groups).sort((a, b) => b.totalTokens - a.totalTokens);

    if (files.length === 0) {
        return (
            <Box style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <Text size="sm" fw={500}>Selected Files (0)</Text>
            </Box>
        );
    }

    return (
        <Box style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <Text size="sm" fw={500}>Selected Files ({files.length})</Text>
            <ScrollArea style={{ flex: 1 }} mt="xs">
                <Accordion multiple variant="separated" defaultValue={groupedFiles.map(g => g.groupInfo.key)}>
                    {groupedFiles.map(({ groupInfo, files: groupFiles, totalTokens }) => (
                        <Accordion.Item key={groupInfo.key} value={groupInfo.key}>
                            <Accordion.Control>
                                <Group justify="space-between" wrap="nowrap">
                                    <Group gap="xs" style={{ overflow: 'hidden' }}>
                                        {groupInfo.icon}
                                        <Text size="sm" fw={500} truncate="end">{groupInfo.label}</Text>
                                    </Group>
                                    <Group gap="xs" wrap="nowrap" align="center">
                                        <Text size="xs" c="dimmed" ff="monospace">
                                            ~{totalTokens.toLocaleString()}
                                        </Text>
                                        <Badge color={groupInfo.color} variant="light">{groupFiles.length}</Badge>
                                        {onUncheckGroup && (
                                            <Tooltip label={`Remove all ${groupInfo.label} files`}>
                                                <ActionIcon
                                                    size="sm"
                                                    variant="subtle"
                                                    color="red"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onUncheckGroup(groupFiles.map(f => f.path));
                                                    }}
                                                >
                                                    <IconTrash size={16} />
                                                </ActionIcon>
                                            </Tooltip>
                                        )}
                                    </Group>
                                </Group>
                            </Accordion.Control>
                            <Accordion.Panel>
                                <Stack gap={0}>
                                    {groupFiles.map((file) => (
                                        <Box
                                            key={file.path}
                                            style={{
                                                backgroundColor: file.error
                                                    ? (colorScheme === 'dark' ? rgba(theme.colors.red[9], 0.2) : theme.colors.red[0])
                                                    : undefined,
                                            }}
                                        >
                                            <NavLink
                                                active={selectedFile?.path === file.path}
                                                label={
                                                    <Tooltip label={file.path} position="bottom-start" withArrow>
                                                        <Text truncate="end">{file.path.split(/[\\/]/).pop()}</Text>
                                                    </Tooltip>
                                                }
                                                description={file.error ? 'Error reading file' : `~${(file.tokenCount ?? 0).toLocaleString()} tokens`}
                                                color={file.error ? 'red' : theme.primaryColor}
                                                onClick={() => onFileSelect(selectedFile?.path === file.path ? null : file)}
                                                leftSection={<FileIcon name={file.path} isFolder={false} expanded={false} />}
                                                rightSection={
                                                    <ActionIcon
                                                        variant="transparent"
                                                        c="dimmed"
                                                        aria-label="uncheckFile"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onUncheckItem(file.path);
                                                        }}
                                                    >
                                                        <IconX size={16} />
                                                    </ActionIcon>
                                                }
                                            />
                                        </Box>
                                    ))}
                                </Stack>
                            </Accordion.Panel>
                        </Accordion.Item>
                    ))}
                </Accordion>
            </ScrollArea>
        </Box>
    );
};