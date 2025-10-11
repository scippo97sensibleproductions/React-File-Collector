import { useState } from 'react';
import { Box, Checkbox, Group, Stack, Text, Title, Center } from '@mantine/core';
import { List, type RowComponentProps } from 'react-window';
import { IconCaretDownFilled, IconCaretRightFilled, IconFolderOff } from '@tabler/icons-react';
import { useElementSize } from '@mantine/hooks';
import { FileIcon } from './FileIcon';
import type { DefinedTreeNode } from '../routes';

interface FlatNode {
    id: string;
    label: string;
    depth: number;
    isFolder: boolean;
    node: DefinedTreeNode;
}

interface VirtualizedFileTreeProps {
    data: DefinedTreeNode[];
    checkedItems: string[];
    onNodeToggle: (node: DefinedTreeNode) => void;
}

type CheckState = 'checked' | 'unchecked' | 'indeterminate';

type TreeRowProps = {
    flatNodes: FlatNode[];
    nodeCheckStates: Map<string, CheckState>;
    expandedIds: Set<string>;
    toggleExpand: (id: string) => void;
    toggleCheck: (node: DefinedTreeNode) => void;
};

const flattenTree = (nodes: DefinedTreeNode[], expandedIds: Set<string>, depth = 0): FlatNode[] => {
    let flatList: FlatNode[] = [];
    for (const node of nodes) {
        const isFolder = Array.isArray(node.children);
        flatList.push({ id: node.value, label: node.label, depth, isFolder, node });
        if (isFolder && expandedIds.has(node.value) && node.children) {
            flatList = flatList.concat(flattenTree(node.children, expandedIds, depth + 1));
        }
    }
    return flatList;
};

const collectFilePaths = (node: DefinedTreeNode): string[] => {
    if (!node.children) {
        return [node.value];
    }
    return node.children.flatMap(collectFilePaths);
};

const NodeRow = ({ index, style, ariaAttributes, ...props }: RowComponentProps<TreeRowProps>) => {
    const { flatNodes, nodeCheckStates, expandedIds, toggleExpand, toggleCheck } = props;
    const { id, label, depth, isFolder, node } = flatNodes[index];

    const state = nodeCheckStates.get(id) ?? 'unchecked';
    const isChecked = state === 'checked';
    const isIndeterminate = state === 'indeterminate';

    return (
        <Box style={style} {...ariaAttributes}>
            <Group gap={0} wrap="nowrap" style={{ height: '100%' }}>
                <Box
                    style={{ paddingLeft: depth * 20, display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                    onClick={() => isFolder && toggleExpand(id)}
                >
                    {isFolder ? (
                        expandedIds.has(id) ? <IconCaretDownFilled size={14} /> : <IconCaretRightFilled size={14} />
                    ) : (
                        <Box w={14} />
                    )}
                </Box>
                <Group
                    gap="xs"
                    wrap="nowrap"
                    style={{ flex: 1, cursor: 'pointer', height: '100%' }}
                    onClick={(e) => {
                        e.stopPropagation();
                        toggleCheck(node);
                    }}
                >
                    <Checkbox
                        checked={isChecked}
                        indeterminate={isIndeterminate}
                        readOnly
                        aria-hidden
                    />
                    <FileIcon name={label} isFolder={isFolder} expanded={expandedIds.has(id)} />
                    <Text size="sm" truncate="end" style={{ userSelect: 'none' }} title={label}>
                        {label}
                    </Text>
                </Group>
            </Group>
        </Box>
    );
};

export const VirtualizedFileTree = ({ data, checkedItems, onNodeToggle }: VirtualizedFileTreeProps) => {
    const [expandedIds, setExpandedIds] = useState(new Set<string>());
    const { ref: containerRef } = useElementSize();

    const toggleExpand = (id: string) => {
        setExpandedIds(currentIds => {
            const newIds = new Set(currentIds);
            if (newIds.has(id)) {
                newIds.delete(id);
            } else {
                newIds.add(id);
            }
            return newIds;
        });
    };

    const nodeCheckStates = (() => {
        const states = new Map<string, CheckState>();
        const checkedSet = new Set(checkedItems);

        const calculateState = (node: DefinedTreeNode): CheckState => {
            if (!node.children) {
                return checkedSet.has(node.value) ? 'checked' : 'unchecked';
            }

            const descendantFiles = collectFilePaths(node);
            if (descendantFiles.length === 0) {
                return 'unchecked';
            }

            const checkedCount = descendantFiles.filter(path => checkedSet.has(path)).length;

            if (checkedCount === 0) return 'unchecked';
            if (checkedCount === descendantFiles.length) return 'checked';
            return 'indeterminate';
        };

        const traverse = (nodes: DefinedTreeNode[]) => {
            for (const node of nodes) {
                states.set(node.value, calculateState(node));
                if (node.children) {
                    traverse(node.children);
                }
            }
        };

        traverse(data);
        return states;
    })();

    const flatNodes = flattenTree(data, expandedIds);

    const rowProps = {
        flatNodes,
        nodeCheckStates,
        expandedIds,
        toggleExpand,
        toggleCheck: onNodeToggle,
    };

    return (
        <Stack h="100%" gap="sm">
            <Title order={5}>Project Files</Title>
            <Box style={{ flex: 1, minHeight: 0 }} ref={containerRef}>
                {data.length > 0 ? (
                    <List
                        rowCount={flatNodes.length}
                        rowHeight={28}
                        rowComponent={NodeRow}
                        rowProps={rowProps}
                    />
                ) : (
                    <Center h="100%">
                        <Stack align="center">
                            <IconFolderOff size={48} stroke={1.5} color="var(--mantine-color-gray-5)" />
                            <Text c="dimmed" ta="center">Select a folder to<br />view the file tree.</Text>
                        </Stack>
                    </Center>
                )}
            </Box>
        </Stack>
    );
};