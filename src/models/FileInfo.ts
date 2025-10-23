export interface FileInfo {
    path: string;
    language?: string;
    content?: string; // This remains for on-demand use like the viewer
    error?: string;
    tokenCount?: number; // This will be populated by the list item component
}