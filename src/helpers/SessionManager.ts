import { BaseDirectory, exists, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { createFileEnsuringPath } from './FileSystemManager.ts';

const SESSION_PATH = import.meta.env.VITE_SESSION_PATH ?? 'FileCollector/session.json';
const parsedBaseDir = parseInt(import.meta.env.VITE_FILE_BASE_PATH ?? '', 10);
const BASE_DIR = (Number.isNaN(parsedBaseDir) ? 21 : parsedBaseDir) as BaseDirectory;

interface SessionState {
    lastActivePath: string | null;
    selectionsByPath: Record<string, string[]>;
}

const defaultSessionState: SessionState = {
    lastActivePath: null,
    selectionsByPath: {},
};

async function readSessionState(): Promise<SessionState> {
    try {
        const fileExists = await exists(SESSION_PATH, { baseDir: BASE_DIR });
        if (!fileExists) {
            return defaultSessionState;
        }
        const content = await readTextFile(SESSION_PATH, { baseDir: BASE_DIR });
        const data = content ? JSON.parse(content) : {};
        return { ...defaultSessionState, ...data };
    } catch {
        return defaultSessionState;
    }
}

async function writeSessionState(data: SessionState): Promise<void> {
    try {
        await createFileEnsuringPath(SESSION_PATH, { baseDir: BASE_DIR });
        const content = JSON.stringify(data, null, 2);
        await writeTextFile(SESSION_PATH, content, { baseDir: BASE_DIR });
    } catch (error) {
        console.error('Failed to save session state:', error);
    }
}

export async function loadLastActivePath(): Promise<string | null> {
    const state = await readSessionState();
    return state.lastActivePath;
}

export async function saveLastActivePath(path: string | null): Promise<void> {
    const state = await readSessionState();
    state.lastActivePath = path;
    await writeSessionState(state);
}

export async function loadSelectionsForPath(rootPath: string): Promise<string[]> {
    if (!rootPath) return [];
    const state = await readSessionState();
    return state.selectionsByPath[rootPath] ?? [];
}

export async function saveSelectionsForPath(rootPath: string, selectedFilePaths: string[]): Promise<void> {
    if (!rootPath) return;
    const state = await readSessionState();
    if (!state.selectionsByPath) {
        state.selectionsByPath = {};
    }
    state.selectionsByPath[rootPath] = selectedFilePaths;
    await writeSessionState(state);
}