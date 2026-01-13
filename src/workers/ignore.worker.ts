import { shouldIgnore } from '../helpers/GitIgnoreParser';
import type { GitIgnoreItem } from '../models/GitIgnoreItem';

interface EntryToFilter {
    path: string;
    name: string;
    isDirectory: boolean;
}

interface FilterRequest {
    id: number;
    entries: EntryToFilter[];
    gitIgnoreItems: GitIgnoreItem[];
    rootPath: string;
}

self.onmessage = (e: MessageEvent<FilterRequest>) => {
    const { id, entries, gitIgnoreItems, rootPath } = e.data;

    const files: EntryToFilter[] = [];
    const dirs: EntryToFilter[] = [];

    const normalizedRoot = rootPath.replace(/\\/g, '/').replace(/\/$/, '');

    for (const entry of entries) {
        const normalizedFullPath = entry.path.replace(/\\/g, '/');

        let relativePath = normalizedFullPath;
        if (normalizedFullPath.startsWith(normalizedRoot)) {
            relativePath = normalizedFullPath.substring(normalizedRoot.length);
        }

        if (relativePath.startsWith('/')) {
            relativePath = relativePath.substring(1);
        }

        const pathToCheck = entry.isDirectory ? `${relativePath}/` : relativePath;

        if (!shouldIgnore(gitIgnoreItems, pathToCheck)) {
            if (entry.isDirectory) {
                dirs.push(entry);
            } else {
                files.push(entry);
            }
        }
    }

    self.postMessage({ id, result: { files, dirs } });
};