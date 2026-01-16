export interface GitBranch {
    name: string;
    isCurrent: boolean;
}

export interface GitCommit {
    hash: string;
    shortHash: string;
    subject: string;
    author: string;
    date: string;
}