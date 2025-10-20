import {createFileRoute} from '@tanstack/react-router';
import {useCallback, useEffect, useRef, useState} from "react";
import {BaseDirectory, type DirEntry, readDir} from "@tauri-apps/plugin-fs";
import {join} from "@tauri-apps/api/path";
import {open as openDialog} from '@tauri-apps/plugin-dialog';
import {FileManager} from "../components/FileManager.tsx";
import type {GitIgnoreItem} from "../models/GitIgnoreItem.ts";
import {DefinedTreeNode} from "../models/tree.ts";
import IgnoreWorker from '../workers/ignore.worker.ts?worker';

const GITIGNORE_PATH = import.meta.env.VITE_GITIGNORE_PATH ?? 'FileCollector/gitignores.json';
const parsedBaseDir = parseInt(import.meta.env.VITE_FILE_BASE_PATH ?? '', 10);
const BASE_DIR = (Number.isNaN(parsedBaseDir) ? 21 : parsedBaseDir) as BaseDirectory;

interface WorkerEntry {
    path: string;
    name: string;
    isDirectory: boolean;
}

interface FilterResult {
    files: WorkerEntry[];
    dirs: WorkerEntry[];
}

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

const IndexComponent = () => {
    const [path, setPath] = useState<string | null>(null);
    const [treeData, setTreeData] = useState<DefinedTreeNode[]>([]);
    const [allFiles, setAllFiles] = useState<{ label: string; value: string }[]>([]);
    const [checkedItems, setCheckedItems] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const workerRef = useRef<Worker | null>(null);
    const jobCounterRef = useRef(0);
    const pendingJobsRef = useRef(new Map<number, (result: FilterResult) => void>());

    useEffect(() => {
        const worker = new IgnoreWorker();
        workerRef.current = worker;

        worker.onmessage = (event: MessageEvent<{ id: number; result: FilterResult }>) => {
            const {id, result} = event.data;
            const pendingJobs = pendingJobsRef.current;
            if (pendingJobs.has(id)) {
                const resolve = pendingJobs.get(id);
                resolve?.(result);
                pendingJobs.delete(id);
            }
        };

        return () => {
            worker.terminate();
        };
    }, []);

    const filterEntriesWithWorker = useCallback((entries: WorkerEntry[], gitIgnoreItems: GitIgnoreItem[]): Promise<FilterResult> => {
        const id = jobCounterRef.current++;
        const worker = workerRef.current;
        if (!worker) return Promise.resolve({files: [], dirs: []});

        return new Promise((resolve) => {
            pendingJobsRef.current.set(id, resolve);
            worker.postMessage({
                id,
                entries,
                gitIgnoreItems,
            });
        });
    }, []);

    const buildFileTree = useCallback(async (currentPath: string, gitIgnoreItems: GitIgnoreItem[]): Promise<{ tree: DefinedTreeNode[], allFiles: { label: string; value: string }[] }> => {
        const entries: DirEntry[] = await readDir(currentPath);

        const workerEntries = await Promise.all(
            entries.map(async (entry) => ({
                name: entry.name,
                isDirectory: entry.isDirectory,
                path: await join(currentPath, entry.name),
            }))
        );

        const {files: filteredFiles, dirs: filteredDirs} = await filterEntriesWithWorker(workerEntries, gitIgnoreItems);

        const allFoundFiles: { label: string; value: string }[] = filteredFiles.map(f => ({label: f.name, value: f.path}));
        const nodes: DefinedTreeNode[] = filteredFiles.map(f => ({label: f.name, value: f.path}));

        const subdirectoryPromises = filteredDirs.map(dir => buildFileTree(dir.path, gitIgnoreItems));
        const subdirectoryResults = await Promise.all(subdirectoryPromises);

        subdirectoryResults.forEach((result, index) => {
            const dir = filteredDirs[index];
            const {tree: children, allFiles: childFiles} = result;
            if (children.length > 0) {
                nodes.push({value: dir.path, label: dir.name, children});
                allFoundFiles.push(...childFiles);
            }
        });

        nodes.sort((a, b) => {
            const aIsFolder = !!a.children;
            const bIsFolder = !!b.children;
            if (aIsFolder !== bIsFolder) return aIsFolder ? -1 : 1;
            return a.label.localeCompare(b.label);
        });

        return {tree: nodes, allFiles: allFoundFiles};
    }, [filterEntriesWithWorker]);

    const loadDirectory = useCallback(async (selectedPath: string) => {
        setIsLoading(true);
        setPath(selectedPath);
        setTreeData([]);
        setAllFiles([]);
        setCheckedItems([]);

        try {
            const gitIgnoreItems = await fetchGitIgnoreItems();
            const {tree, allFiles} = await buildFileTree(selectedPath, gitIgnoreItems);
            setTreeData(tree);
            setAllFiles(allFiles);
        } catch (e) {
            console.error("Failed to build file tree:", e);
        } finally {
            setIsLoading(false);
        }
    }, [buildFileTree]);

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