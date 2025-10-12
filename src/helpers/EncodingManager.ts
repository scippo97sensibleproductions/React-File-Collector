import {readFile} from '@tauri-apps/plugin-fs';

export async function readTextFileWithDetectedEncoding(path: string): Promise<string> {
    const buffer = await readFile(path);

    if (buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
        return new TextDecoder('utf-8').decode(buffer.slice(3));
    }
    if (buffer.length >= 2 && buffer[0] === 0xFF && buffer[1] === 0xFE) {
        return new TextDecoder('utf-16le').decode(buffer.slice(2));
    }
    if (buffer.length >= 2 && buffer[0] === 0xFE && buffer[1] === 0xFF) {
        return new TextDecoder('utf-16be').decode(buffer.slice(2));
    }

    return new TextDecoder('utf-8').decode(buffer);
}