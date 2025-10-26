export interface FileInfo {
    path: string;
    status: 'pending' | 'processing' | 'complete' | 'error';
    language?: string;
    error?: string;
    tokenCount?: number;
}