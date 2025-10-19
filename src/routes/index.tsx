import {createFileRoute} from '@tanstack/react-router';
import {useCallback, useState} from "react";
import {BaseDirectory, type DirEntry, readDir} from "@tauri-apps/plugin-fs";
import {join} from "@tauri-apps/api/path";
import {open as openDialog} from '@tauri-apps/plugin-dialog';
import {shouldIgnore} from "../helpers/GitIgnoreParser.ts";
import {FileManager} from "../components/FileManager.tsx";
import type {GitIgnoreItem} from "../models/GitIgnoreItem.ts";
import {DefinedTreeNode} from "../models/tree.ts";

const GITIGNORE_PATH = import.meta.env.VITE_GITIGNORE_PATH ?? 'FileCollector/gitignores.json';
const parsedBaseDir = parseInt(import.meta.env.VITE_FILE_BASE_PATH ?? '', 10);
const BASE_DIR = (Number.isNaN(parsedBaseDir) ? 21 : parsedBaseDir) as BaseDirectory;

async function fetchGitIgnoreItems(): Promise<GitIgnoreItem[]> {
    try {
        const {readTextFile, exists} = await import('@tauri-apps/plugin-fs');
        const fileExists = await exists(GITIGNORE_PATH, {baseDir: BASE_DIR});
        if (fileExists) {
            const content = await readTextFile(GITIGNORE_PATH, {baseDir: BASE_DIR});
            const items = JSON.parse(content);
            return Array.isArray(items) ? items : [];
        }
    } catch {
        return [];
    }
    return [];
}

const buildFileTree = async (
    currentPath: string,
    gitIgnoreItems: GitIgnoreItem[]
): Promise<{ tree: DefinedTreeNode[], allFiles: { label: string; value: string }[] }> => {
    const entries: DirEntry[] = await readDir(currentPath);
    const nodes: DefinedTreeNode[] = [];
    let allFiles: { label: string; value: string }[] = [];

    for (const entry of entries) {
        const fullPath = await join(currentPath, entry.name);

        if (shouldIgnore(gitIgnoreItems, fullPath)) {
            continue;
        }

        const node: DefinedTreeNode = {
            value: fullPath,
            label: entry.name,
        };

        if (entry.isDirectory) {
            const {tree: children, allFiles: childFiles} = await buildFileTree(fullPath, gitIgnoreItems);
            if (children.length > 0) {
                node.children = children;
                nodes.push(node);
                allFiles = allFiles.concat(childFiles);
            }
        } else {
            nodes.push(node);
            allFiles.push({label: node.label, value: node.value});
        }
    }

    nodes.sort((a, b) => {
        const aIsFolder = !!a.children;
        const bIsFolder = !!b.children;
        if (aIsFolder !== bIsFolder) return aIsFolder ? -1 : 1;
        return a.label.localeCompare(b.label);
    });

    return {tree: nodes, allFiles};
};


const IndexComponent = () => {
    const [path, setPath] = useState<string | null>(null);
    const [treeData, setTreeData] = useState<DefinedTreeNode[]>([]);
    const [allFiles, setAllFiles] = useState<{ label: string; value: string }[]>([]);
    const [checkedItems, setCheckedItems] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const loadDirectory = useCallback(async (selectedPath: string) => {
        setIsLoading(true);
        try {
            const gitIgnoreItems = await fetchGitIgnoreItems();
            const {tree, allFiles: foundFiles} = await buildFileTree(selectedPath, gitIgnoreItems);
            setPath(selectedPath);
            setTreeData(tree);
            setAllFiles(foundFiles);
            setCheckedItems([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleSelectFolder = async () => {
        const selected = await openDialog({directory: true, multiple: false});
        if (typeof selected === 'string') {
            await loadDirectory(selected);
        }
    };

    const handleReloadTree = () => {
        if (path) {
            loadDirectory(path);
        }
    };

    const handleNodeToggle = (node: DefinedTreeNode) => {
        const collectFilePaths = (n: DefinedTreeNode): string[] => {
            if (!n.children) return [n.value];
            return n.children.flatMap(collectFilePaths);
        };
        const pathsToToggle = new Set(collectFilePaths(node));
        const currentCheckedSet = new Set(checkedItems);

        const allPathsPresent = Array.from(pathsToToggle).every(p => currentCheckedSet.has(p));

        if (allPathsPresent) {
            setCheckedItems(current => current.filter(p => !pathsToToggle.has(p)));
        } else {
            setCheckedItems(current => [...new Set([...current, ...Array.from(pathsToToggle)])]);
        }
    };

    return (
        <FileManager
            allFiles={allFiles}
            checkedItems={checkedItems}
            data={treeData}
            isLoading={isLoading}
            path={path}
            setCheckedItems={setCheckedItems}
            onNodeToggle={handleNodeToggle}
            onReloadTree={handleReloadTree}
            onSelectFolder={handleSelectFolder}
        />
    );
}

export const Route = createFileRoute('/')({
    component: IndexComponent,
});