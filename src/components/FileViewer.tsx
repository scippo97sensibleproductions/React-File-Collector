import {
    Alert,
    Center,
    Code,
    Paper,
    ScrollArea,
    Stack,
    Text,
    Loader,
    Box, ActionIcon,
} from '@mantine/core';
import { IconAlertCircle, IconMessagePlus, IconInfoCircle, IconX } from '@tabler/icons-react';
import { useEffect, useState, useRef } from "react";
import type { FileInfo } from "../models/FileInfo.ts";
import 'prismjs/themes/prism-okaidia.css';
import 'prismjs/plugins/line-numbers/prism-line-numbers.css';
import './FileViewer.css';
import SyntaxHighlighterWorker from '../workers/syntaxHighlighter.worker.ts?worker';
import { readTextFileWithDetectedEncoding } from "../helpers/EncodingManager.ts";

const LOADER_DELAY_MS = 300;

interface FileViewerProps {
    selectedFile: FileInfo | null;
    isEmpty: boolean;
    onClose: () => void;
}

export const FileViewer = ({ selectedFile, isEmpty, onClose }: FileViewerProps) => {
    const [highlightedHtml, setHighlightedHtml] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isWorkerReady, setIsWorkerReady] = useState(false);
    const workerRef = useRef<Worker | null>(null);
    const jobCounterRef = useRef(0);
    const loadingTimerRef = useRef<number | null>(null);

    useEffect(() => {
        const worker = new SyntaxHighlighterWorker();
        workerRef.current = worker;

        const messageHandler = (event: MessageEvent) => {
            if (event.data.ready) {
                setIsWorkerReady(true);
                return;
            }

            if (event.data.jobId !== `job-${jobCounterRef.current}`) {
                return;
            }

            if (loadingTimerRef.current) {
                clearTimeout(loadingTimerRef.current);
            }
            setIsLoading(false);

            if (event.data.error) {
                setHighlightedHtml(null);
            } else {
                setHighlightedHtml(event.data.html);
            }
        };

        worker.addEventListener('message', messageHandler);

        return () => {
            worker.terminate();
        };
    }, []);

    useEffect(() => {
        if (loadingTimerRef.current) {
            clearTimeout(loadingTimerRef.current);
        }

        if (!selectedFile || !isWorkerReady || !workerRef.current) {
            return;
        }

        loadingTimerRef.current = window.setTimeout(() => {
            setIsLoading(true);
        }, LOADER_DELAY_MS);

        jobCounterRef.current += 1;
        const currentJobId = `job-${jobCounterRef.current}`;

        const loadAndHighlight = async () => {
            try {
                const content = await readTextFileWithDetectedEncoding(selectedFile.path);
                if (currentJobId !== `job-${jobCounterRef.current}`) {
                    return;
                }
                workerRef.current?.postMessage({
                    code: content,
                    language: selectedFile.language,
                    jobId: currentJobId
                });
            } catch {
                if (currentJobId === `job-${jobCounterRef.current}`) {
                    if (loadingTimerRef.current) {
                        clearTimeout(loadingTimerRef.current);
                    }
                    setIsLoading(false);
                }
            }
        };

        loadAndHighlight();

        return () => {
            if (loadingTimerRef.current) {
                clearTimeout(loadingTimerRef.current);
            }
        };
    }, [selectedFile, isWorkerReady]);

    const renderContent = () => {
        if (isEmpty) {
            return (
                <Center h="100%">
                    <Stack align="center" gap="xs">
                        <IconInfoCircle size={48} stroke={1.5} color="var(--mantine-color-gray-5)"/>
                        <Text c="dimmed">Select files from the tree to begin.</Text>
                    </Stack>
                </Center>
            );
        }

        if (!selectedFile) {
            return (
                <Center h="100%">
                    <Stack align="center" gap="xs">
                        <IconMessagePlus size={48} stroke={1.5} color="var(--mantine-color-gray-5)"/>
                        <Text c="dimmed">Select a file to view its content.</Text>
                    </Stack>
                </Center>
            );
        }

        return (
            <Stack h="100%" gap="xs">
                <Code block fz="xs" c="dimmed">{selectedFile.path}</Code>
                <ScrollArea style={{ flex: 1, position: 'relative' }}>
                    {isLoading && <Center pos="absolute" inset={0} style={{zIndex: 1}}><Loader/></Center>}

                    {selectedFile.error && (
                        <Alert variant="light" color="red" title="Could Not Display File" icon={<IconAlertCircle/>}>
                            {selectedFile.error}
                        </Alert>
                    )}

                    {!selectedFile.error && highlightedHtml && (
                        <Box
                            className="line-numbers"
                            dangerouslySetInnerHTML={{ __html: `<pre><code>${highlightedHtml}</code></pre>` }}
                        />
                    )}
                </ScrollArea>
            </Stack>
        );
    };

    return (
        <Paper
            withBorder
            h="100%"
            p={!isEmpty && selectedFile ? 'md' : undefined}
            style={{ position: 'relative' }}
        >
            <ActionIcon
                variant="subtle"
                color="gray"
                onClick={onClose}
                style={{ position: 'absolute', top: 8, right: 8, zIndex: 2 }}
                aria-label="Close preview"
            >
                <IconX size={16} />
            </ActionIcon>
            {renderContent()}
        </Paper>
    );
};