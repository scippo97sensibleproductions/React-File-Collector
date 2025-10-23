import {
    Accordion,
    ActionIcon,
    Badge,
    Box,
    Group,
    ScrollArea,
    Stack,
    Text,
    Tooltip,
} from '@mantine/core';
import {IconTrash} from '@tabler/icons-react';
import type {FileInfo} from "../models/FileInfo.ts";
import {type FileGroupInfo, getGroupInfoForFile} from "../helpers/FileGroupManager.tsx";
import {SelectedFileEntry} from "./SelectedFileEntry.tsx";
import {useCallback, useEffect, useState} from "react";

interface SelectedFileListProps {
    files: FileInfo[];
    selectedFile: FileInfo | null;
    onFileSelect: (file: FileInfo | null) => void;
    onUncheckItem: (path: string) => void;
    onUncheckGroup?: (paths: string[]) => void;
    onFileTokensChange: (total: number) => void;
}

interface FileGroup {
    groupInfo: FileGroupInfo;
    files: FileInfo[];
}

export const SelectedFileList = ({
                                     files,
                                     selectedFile,
                                     onFileSelect,
                                     onUncheckItem,
                                     onUncheckGroup,
                                     onFileTokensChange
                                 }: SelectedFileListProps) => {
    const [tokenCounts, setTokenCounts] = useState<Record<string, number | null>>({});

    const handleTokenCountCalculated = useCallback((path: string, count: number | null) => {
        setTokenCounts(currentCounts => ({...currentCounts, [path]: count}));
    }, []);

    useEffect(() => {
        const total = Object.values(tokenCounts).reduce((acc, count) => acc + (count ?? 0), 0);
        onFileTokensChange(total);
    }, [tokenCounts, onFileTokensChange]);


    const groups: Record<string, FileGroup> = {};

    for (const file of files) {
        const groupInfo = getGroupInfoForFile(file.path);
        if (!groups[groupInfo.key]) {
            groups[groupInfo.key] = {groupInfo, files: []};
        }
        groups[groupInfo.key].files.push(file);
    }

    const groupedFiles: FileGroup[] = Object.values(groups).sort((a, b) => a.groupInfo.label.localeCompare(b.groupInfo.label));

    if (files.length === 0) {
        return (
            <Box style={{flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0}}>
                <Text fw={500} size="sm">Selected Files (0)</Text>
            </Box>
        );
    }

    const calculateGroupTokens = (groupFiles: FileInfo[]) => {
        return groupFiles.reduce((acc, file) => {
            const count = tokenCounts[file.path];
            return acc + (typeof count === 'number' ? count : 0);
        }, 0);
    };

    return (
        <Box style={{flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0}}>
            <Text fw={500} size="sm">Selected Files ({files.length})</Text>
            <ScrollArea mt="xs" style={{flex: 1}}>
                <Accordion multiple defaultValue={groupedFiles.map(g => g.groupInfo.key)} variant="separated">
                    {groupedFiles.map(({groupInfo, files: groupFiles}) => (
                        <Accordion.Item key={groupInfo.key} value={groupInfo.key}>
                            <Accordion.Control>
                                <Group justify="space-between" wrap="nowrap">
                                    <Group gap="xs" style={{overflow: 'hidden'}}>
                                        {groupInfo.icon}
                                        <Text fw={500} size="sm" truncate="end">{groupInfo.label}</Text>
                                    </Group>
                                    <Group align="center" gap="xs" wrap="nowrap">
                                        <Text c="dimmed" ff="monospace" size="xs">
                                            ~{calculateGroupTokens(groupFiles).toLocaleString()}
                                        </Text>
                                        <Badge color={groupInfo.color} variant="light">{groupFiles.length}</Badge>
                                    </Group>
                                </Group>
                            </Accordion.Control>
                            <Accordion.Panel>
                                <Stack gap={0}>
                                    {onUncheckGroup && (
                                        <Group justify="flex-end" pb="xs" pr={4}>
                                            <Tooltip label={`Remove all ${groupInfo.label} files`}>
                                                <ActionIcon
                                                    color="red"
                                                    size="sm"
                                                    variant="subtle"
                                                    onClick={() => onUncheckGroup(groupFiles.map(f => f.path))}
                                                >
                                                    <IconTrash size={16}/>
                                                </ActionIcon>
                                            </Tooltip>
                                        </Group>
                                    )}
                                    {groupFiles.map((file) => (
                                        <SelectedFileEntry
                                            key={file.path}
                                            file={file}
                                            isSelected={selectedFile?.path === file.path}
                                            onSelect={onFileSelect}
                                            onTokenCountCalculated={handleTokenCountCalculated}
                                            onUncheck={onUncheckItem}
                                        />
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