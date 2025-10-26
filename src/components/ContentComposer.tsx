import {
    ActionIcon,
    Button,
    Group,
    Paper,
    ScrollArea,
    Select,
    Stack,
    Tabs,
    Text,
    Textarea,
    Title,
    Tooltip,
    Typography,
} from '@mantine/core';
import {IconCopy, IconEye, IconRefresh, IconTrash, IconX} from '@tabler/icons-react';
import {useEffect, useState} from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {SelectedFileList} from './SelectedFileList';
import type {FileInfo} from "../models/FileInfo.ts";
import type {SystemPromptItem} from "../models/SystemPromptItem.ts";

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
        }, 500);

        return () => {
            clearTimeout(handler);
        };
    }, [inputValue, userPrompt, setUserPrompt]);

    useEffect(() => {
        setInputValue(userPrompt);
    }, [userPrompt]);

    return (
        <Paper withBorder h="100%" p="md" shadow="sm">
            <Stack gap="md" h="100%">
                <Group align="center" justify="space-between">
                    <Title order={5}>Content Composer</Title>
                    <Group align="center" gap="xs">
                        <Text c="dimmed" fw={500} size="xs">
                            ~{totalTokens.toLocaleString()} tokens
                        </Text>
                        <Tooltip label="Reload content of selected files">
                            <ActionIcon disabled={!hasFiles} size="sm" variant="light" onClick={onReloadContent}>
                                <IconRefresh size={16}/>
                            </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Clear all selected files">
                            <ActionIcon color="red" disabled={!hasFiles} size="sm" variant="light" onClick={onClearAll}>
                                <IconTrash size={16}/>
                            </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Show file preview">
                            <Button
                                disabled={!selectedFile}
                                leftSection={<IconEye size={14}/>}
                                size="compact-sm"
                                variant="light"
                                onClick={onShowPreview}
                            >
                                Preview
                            </Button>
                        </Tooltip>
                        <Tooltip label="Copy composed prompt to clipboard">
                            <Button
                                disabled={!hasFiles && !userPrompt && !selectedSystemPromptId}
                                leftSection={<IconCopy size={14}/>}
                                size="compact-sm"
                                variant="light"
                                onClick={onCopyAll}
                            >
                                Copy All
                            </Button>
                        </Tooltip>
                    </Group>
                </Group>

                <Select
                    clearable
                    data={systemPrompts.map(p => ({value: p.id, label: p.name}))}
                    label="System Prompt"
                    placeholder="Prepend a system prompt..."
                    value={selectedSystemPromptId}
                    onChange={setSelectedSystemPromptId}
                />

                <SelectedFileList
                    files={files}
                    selectedFile={selectedFile}
                    onFileSelect={onFileSelect}
                    onUncheckGroup={onUncheckGroup}
                    onUncheckItem={onUncheckItem}
                />

                <Stack gap={4}>
                    <Group justify="space-between">
                        <Text component="label" fw={500} htmlFor="user-prompt-editor" size="sm">
                            User Prompt
                        </Text>
                        {inputValue ? (
                            <ActionIcon
                                aria-label="Clear prompt"
                                c="dimmed"
                                variant="transparent"
                                onClick={() => setInputValue('')}
                            >
                                <IconX size={16}/>
                            </ActionIcon>
                        ) : null}
                    </Group>
                    <Tabs defaultValue="write" variant="outline">
                        <Tabs.List>
                            <Tabs.Tab value="write">Write</Tabs.Tab>
                            <Tabs.Tab disabled={!inputValue.trim()} value="preview">Preview</Tabs.Tab>
                        </Tabs.List>
                        <Tabs.Panel pt="xs" value="write">
                            <Textarea
                                autosize
                                id="user-prompt-editor"
                                maxRows={8}
                                minRows={3}
                                placeholder="Append a user prompt... Markdown is supported."
                                value={inputValue}
                                onChange={(e) => setInputValue(e.currentTarget.value)}
                            />
                        </Tabs.Panel>
                        <Tabs.Panel pt="xs" value="preview">
                            <ScrollArea
                                mah="15rem"
                                mih="5.25rem"
                                p="xs"
                                style={{
                                    border: '1px solid var(--mantine-color-default-border)',
                                    borderRadius: 'var(--mantine-radius-sm)',
                                }}
                                type="auto"
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