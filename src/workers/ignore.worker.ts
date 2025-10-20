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
}

self.onmessage = (e: MessageEvent<FilterRequest>) => {
    const { id, entries, gitIgnoreItems } = e.data;

    const files: EntryToFilter[] = [];
    const dirs: EntryToFilter[] = [];

    for (const entry of entries) {
        const normalizedPath = entry.path.replace(/\\/g, '/');
        const pathToCheck = entry.isDirectory ? `${normalizedPath}/` : normalizedPath;

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