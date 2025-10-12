import {BaseDirectory, create, exists, type FileHandle, mkdir,} from '@tauri-apps/plugin-fs';

export interface CreateFileOptions {
    baseDir: BaseDirectory;
}

export const createFileEnsuringPath = async (
    filePath: string,
    options: CreateFileOptions
): Promise<FileHandle> => {
    const lastSeparatorIndex = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'));

    if (lastSeparatorIndex !== -1) {
        const dirPath = filePath.substring(0, lastSeparatorIndex);

        const directoryExists = await exists(dirPath, {baseDir: options.baseDir});

        if (!directoryExists) {
            await mkdir(dirPath, {baseDir: options.baseDir, recursive: true});
        }
    }

    return await create(filePath, options);
};