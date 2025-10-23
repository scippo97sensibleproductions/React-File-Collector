import {ActionIcon, Alert, Box, Center, Code, Loader, Paper, ScrollArea, Stack, Text,} from '@mantine/core';
import {IconAlertCircle, IconInfoCircle, IconMessagePlus, IconX} from '@tabler/icons-react';
import {useEffect, useRef, useState} from "react";
import type {FileInfo} from "../models/FileInfo.ts";
import 'prismjs/themes/prism-okaidia.css';
import 'prismjs/plugins/line-numbers/prism-line-numbers.css';
import './FileViewer.css';
import SyntaxHighlighterWorker from '../workers/syntaxHighlighter.worker.ts?worker';
import {readTextFileWithDetectedEncoding} from "../helpers/EncodingManager.ts";

const LOADER_DELAY_MS = 300;

interface FileViewerProps {
    selectedFile: FileInfo | null;
    isEmpty: boolean;
    onClose: () => void;
}

export const FileViewer = ({selectedFile, isEmpty, onClose}: FileViewerProps) => {
    const [fileContent, setFileContent] = useState<{ content: string; language: string } | null>(null);
    const [fileError, setFileError] = useState<string | null>(null);
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

            if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
            setIsLoading(false);

            setHighlightedHtml(event.data.error ? null : event.data.html);
        };

        worker.addEventListener('message', messageHandler);
        return () => worker.terminate();
    }, []);

    useEffect(() => {
        if (!selectedFile) {
            setIsLoading(false);
            return;
        }

        let isCancelled = false;
        const loadContent = async () => {
            setIsLoading(true);
            setFileContent(null);
            setFileError(null);
            setHighlightedHtml(null);

            try {
                const content = await readTextFileWithDetectedEncoding(selectedFile.path);
                if (!isCancelled) {
                    setFileContent({content, language: selectedFile.language ?? 'plaintext'});
                }
            } catch (e) {
                if (!isCancelled) {
                    setFileError(e instanceof Error ? e.message : String(e));
                    setIsLoading(false);
                }
            }
        };

        loadContent();

        return () => {
            isCancelled = true;
            if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
        };
    }, [selectedFile]);

    useEffect(() => {
        if (!fileContent || !isWorkerReady || !workerRef.current) {
            return;
        }

        loadingTimerRef.current = window.setTimeout(() => {
            setIsLoading(true);
        }, LOADER_DELAY_MS);

        jobCounterRef.current += 1;
        const currentJobId = `job-${jobCounterRef.current}`;

        workerRef.current.postMessage({
            code: fileContent.content,
            language: fileContent.language,
            jobId: currentJobId
        });

        return () => {
            if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
        };
    }, [fileContent, isWorkerReady]);

    const renderContent = () => {
        if (isEmpty) {
            return (
                <Center h="100%">
                    <Stack align="center" gap="xs">
                        <IconInfoCircle color="var(--mantine-color-gray-5)" size={48} stroke={1.5}/>
                        <Text c="dimmed">Select files from the tree to begin.</Text>
                    </Stack>
                </Center>
            );
        }

        if (!selectedFile) {
            return (
                <Center h="100%">
                    <Stack align="center" gap="xs">
                        <IconMessagePlus color="var(--mantine-color-gray-5)" size={48} stroke={1.5}/>
                        <Text c="dimmed">Select a file to view its content.</Text>
                    </Stack>
                </Center>
            );
        }

        return (
            <Stack gap="xs" h="100%">
                <Code block c="dimmed" fz="xs">{selectedFile.path}</Code>
                <ScrollArea style={{flex: 1, position: 'relative'}}>
                    {isLoading && <Center inset={0} pos="absolute" style={{zIndex: 1}}><Loader/></Center>}

                    {fileError && (
                        <Alert color="red" icon={<IconAlertCircle/>} title="Could Not Display File" variant="light">
                            {fileError}
                        </Alert>
                    )}

                    {!fileError && highlightedHtml && (
                        <Box
                            className="line-numbers"
                            dangerouslySetInnerHTML={{__html: `<pre><code>${highlightedHtml}</code></pre>`}}
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
            style={{position: 'relative'}}
        >
            <ActionIcon
                aria-label="Close preview"
                color="gray"
                style={{position: 'absolute', top: 8, right: 8, zIndex: 2}}
                variant="subtle"
                onClick={onClose}
            >
                <IconX size={16}/>
            </ActionIcon>
            {renderContent()}
        </Paper>
    );
};