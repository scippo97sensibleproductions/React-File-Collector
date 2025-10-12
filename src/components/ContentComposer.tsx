import {
    ActionIcon,
    Button,
    Group,
    Paper,
    Select,
    Stack,
    Text,
    Textarea,
    Title,
    Tooltip,
    Tabs,
    ScrollArea,
    Typography,
} from '@mantine/core';
import { IconCopy, IconEye, IconRefresh, IconTrash, IconX } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { SelectedFileList } from './SelectedFileList';
import type { FileInfo } from "../models/FileInfo.ts";
import type { SystemPromptItem } from "../models/SystemPromptItem.ts";

interface ContentComposerProps {
    files: FileInfo[];
    systemPrompts: SystemPromptItem[];
    selectedFile: FileInfo | null;
    userPrompt: string;
    selectedSystemPromptId: string | null;
    onFileSelect: (file: FileInfo | null) => void;
    onUncheckItem: (path: string) => void;
    onUncheckGroup?: (paths: string[]) => void;
    onCopyAll: () => void;
    onReloadContent: () => void;
    onClearAll: () => void;
    setUserPrompt: (prompt: string) => void;
    setSelectedSystemPromptId: (id: string | null) => void;
    totalTokens: number;
    onShowPreview: () => void;
}

export const ContentComposer = ({
                                    files,
                                    systemPrompts,
                                    selectedFile,
                                    userPrompt,
                                    selectedSystemPromptId,
                                    onFileSelect,
                                    onUncheckItem,
                                    onUncheckGroup,
                                    onCopyAll,
                                    onReloadContent,
                                    onClearAll,
                                    setUserPrompt,
                                    setSelectedSystemPromptId,
                                    totalTokens,
                                    onShowPreview
                                }: ContentComposerProps) => {
    const hasFiles = files.length > 0;
    const [inputValue, setInputValue] = useState(userPrompt);

    useEffect(() => {
        const handler = setTimeout(() => {
            if (userPrompt !== inputValue) {
                setUserPrompt(inputValue);
            }
        }, 1000);

        return () => {
            clearTimeout(handler);
        };
    }, [inputValue, userPrompt, setUserPrompt]);

    useEffect(() => {
        setInputValue(userPrompt);
    }, [userPrompt]);

    return (
        <Paper withBorder shadow="sm" p="md" h="100%">
            <Stack h="100%" gap="md">
                <Group justify="space-between" align="center">
                    <Title order={5}>Content Composer</Title>
                    <Group gap="xs" align="center">
                        <Text size="xs" c="dimmed" fw={500}>
                            ~{totalTokens.toLocaleString()} tokens
                        </Text>
                        <Tooltip label="Reload content of selected files">
                            <ActionIcon variant="light" size="sm" onClick={onReloadContent} disabled={!hasFiles}>
                                <IconRefresh size={16} />
                            </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Clear all selected files">
                            <ActionIcon variant="light" color="red" size="sm" onClick={onClearAll} disabled={!hasFiles}>
                                <IconTrash size={16} />
                            </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Show file preview">
                            <Button
                                size="compact-sm"
                                variant="light"
                                onClick={onShowPreview}
                                leftSection={<IconEye size={14} />}
                                disabled={!selectedFile}
                            >
                                Preview
                            </Button>
                        </Tooltip>
                        <Tooltip label="Copy composed prompt to clipboard">
                            <Button
                                size="compact-sm"
                                variant="light"
                                onClick={onCopyAll}
                                leftSection={<IconCopy size={14} />}
                                disabled={!hasFiles && !userPrompt && !selectedSystemPromptId}
                            >
                                Copy All
                            </Button>
                        </Tooltip>
                    </Group>
                </Group>

                <Select
                    label="System Prompt"
                    placeholder="Prepend a system prompt..."
                    data={systemPrompts.map(p => ({ value: p.id, label: p.name }))}
                    value={selectedSystemPromptId}
                    onChange={setSelectedSystemPromptId}
                    clearable
                />

                <SelectedFileList
                    files={files}
                    selectedFile={selectedFile}
                    onFileSelect={onFileSelect}
                    onUncheckItem={onUncheckItem}
                    onUncheckGroup={onUncheckGroup}
                />

                <Stack gap={4}>
                    <Group justify="space-between">
                        <Text component="label" size="sm" fw={500} htmlFor="user-prompt-editor">
                            User Prompt
                        </Text>
                        {inputValue ? (
                            <ActionIcon
                                onClick={() => setInputValue('')}
                                variant="transparent"
                                c="dimmed"
                                aria-label="Clear prompt"
                            >
                                <IconX size={16}/>
                            </ActionIcon>
                        ) : null}
                    </Group>
                    <Tabs defaultValue="write" variant="outline">
                        <Tabs.List>
                            <Tabs.Tab value="write">Write</Tabs.Tab>
                            <Tabs.Tab value="preview" disabled={!inputValue.trim()}>Preview</Tabs.Tab>
                        </Tabs.List>
                        <Tabs.Panel value="write" pt="xs">
                            <Textarea
                                id="user-prompt-editor"
                                placeholder="Append a user prompt... Markdown is supported."
                                value={inputValue}
                                onChange={(e) => setInputValue(e.currentTarget.value)}
                                autosize
                                minRows={3}
                                maxRows={8}
                            />
                        </Tabs.Panel>
                        <Tabs.Panel value="preview" pt="xs">
                            <ScrollArea
                                mah="15rem"
                                mih="5.25rem"
                                type="auto"
                                p="xs"
                                style={{
                                    border: '1px solid var(--mantine-color-default-border)',
                                    borderRadius: 'var(--mantine-radius-sm)',
                                }}
                            >
                                <Typography>
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {inputValue.trim() ? inputValue : '*Nothing to preview*'}
                                    </ReactMarkdown>
                                </Typography>
                            </ScrollArea>
                        </Tabs.Panel>
                    </Tabs>
                </Stack>
            </Stack>
        </Paper>
    );
};