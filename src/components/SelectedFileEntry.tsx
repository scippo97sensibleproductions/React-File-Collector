import {useEffect, useState} from "react";
import {ActionIcon, Box, NavLink, rgba, Text, Tooltip, useMantineColorScheme, useMantineTheme} from "@mantine/core";
import {IconX} from "@tabler/icons-react";
import {readTextFileWithDetectedEncoding} from "../helpers/EncodingManager.ts";
import {estimateTokens} from "../helpers/TokenCounter.ts";
import type {FileInfo} from "../models/FileInfo.ts";
import {FileIcon} from "./FileIcon.tsx";

const MAX_FILE_SIZE = 200_000;

interface SelectedFileEntryProps {
    file: FileInfo;
    isSelected: boolean;
    onSelect: (file: FileInfo | null) => void;
    onUncheck: (path: string) => void;
    onTokenCountCalculated: (path: string, count: number | null) => void;
}

export const SelectedFileEntry = ({file, isSelected, onSelect, onUncheck, onTokenCountCalculated}: SelectedFileEntryProps) => {
    const theme = useMantineTheme();
    const {colorScheme} = useMantineColorScheme();
    const [tokenCount, setTokenCount] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isCancelled = false;

        const calculateTokens = async () => {
            let count: number | null = null;
            let err: string | null = null;
            try {
                const content = await readTextFileWithDetectedEncoding(file.path);
                if (isCancelled) return;

                if (content.length > MAX_FILE_SIZE) {
                    err = `File too large`;
                } else {
                    count = estimateTokens(content);
                }
            } catch (e) {
                if (isCancelled) return;
                err = e instanceof Error ? e.message : 'Read failed';
            }

            if (!isCancelled) {
                setTokenCount(count);
                setError(err);
                onTokenCountCalculated(file.path, count);
            }
        };

        calculateTokens();

        return () => {
            isCancelled = true;
            onTokenCountCalculated(file.path, null);
        };
    }, [file.path, onTokenCountCalculated]);

    const getDescription = () => {
        if (error) return `Error: ${error}`;
        if (tokenCount === null) return '...';
        return `~${tokenCount.toLocaleString()} tokens`;
    };

    return (
        <Box
            style={{
                backgroundColor: error
                    ? (colorScheme === 'dark' ? rgba(theme.colors.red[9], 0.2) : theme.colors.red[0])
                    : undefined,
            }}
        >
            <NavLink
                active={isSelected}
                color={error ? 'red' : theme.primaryColor}
                description={getDescription()}
                label={
                    <Tooltip withArrow label={file.path} position="bottom-start">
                        <Text truncate="end">{file.path.split(/[\\/]/).pop()}</Text>
                    </Tooltip>
                }
                leftSection={<FileIcon expanded={false} isFolder={false} name={file.path}/>}
                rightSection={
                    <ActionIcon
                        aria-label="uncheckFile"
                        c="dimmed"
                        variant="transparent"
                        onClick={(e) => {
                            e.stopPropagation();
                            onUncheck(file.path);
                        }}
                    >
                        <IconX size={16}/>
                    </ActionIcon>
                }
                onClick={() => onSelect(isSelected ? null : file)}
            />
        </Box>
    );
};