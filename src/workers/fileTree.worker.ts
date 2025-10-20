import { type DirEntry, readDir } from "@tauri-apps/plugin-fs";
import { join } from "@tauri-apps/api/path";
import { shouldIgnore } from "../helpers/GitIgnoreParser";
import type { GitIgnoreItem } from "../models/GitIgnoreItem";
import type { DefinedTreeNode } from "../models/tree";

export interface ScanRequest {
    path: string;
    gitIgnoreItems: GitIgnoreItem[];
}

export interface ScanResult {
    tree: DefinedTreeNode[];
    allFiles: { label:string; value: string }[];
}

const buildFileTree = async (
    currentPath: string,
    gitIgnoreItems: GitIgnoreItem[]
): Promise<ScanResult> => {
    const entries: DirEntry[] = await readDir(currentPath);
    const nodes: DefinedTreeNode[] = [];
    let allFiles: { label: string; value: string }[] = [];

    for (const entry of entries) {
        const fullPath = await join(currentPath, entry.name);

        const node: DefinedTreeNode = {
            value: fullPath,
            label: entry.name,
        };

        if (entry.isDirectory) {
            const dirPathForCheck = `${fullPath.replace(/\\/g, '/')}/`;
            if (shouldIgnore(gitIgnoreItems, dirPathForCheck)) {
                continue;
            }

            const { tree: children, allFiles: childFiles } = await buildFileTree(fullPath, gitIgnoreItems);
            if (children.length > 0) {
                node.children = children;
                nodes.push(node);
                allFiles = allFiles.concat(childFiles);
            }
        } else {
            if (shouldIgnore(gitIgnoreItems, fullPath.replace(/\\/g, '/'))) {
                continue;
            }
            nodes.push(node);
            allFiles.push({ label: node.label, value: node.value });
        }
    }

    nodes.sort((a, b) => {
        const aIsFolder = !!a.children;
        const bIsFolder = !!b.children;
        if (aIsFolder !== bIsFolder) return aIsFolder ? -1 : 1;
        return a.label.localeCompare(b.label);
    });

    return { tree: nodes, allFiles };
};


self.onmessage = async (e: MessageEvent<ScanRequest>) => {
    try {
        const { path, gitIgnoreItems } = e.data;
        const result = await buildFileTree(path, gitIgnoreItems);
        self.postMessage(result);
    } catch (error) {
        self.postMessage({ error: error instanceof Error ? error.message : "An unknown worker error occurred." });
    }
};