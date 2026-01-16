import { Command } from '@tauri-apps/plugin-shell';
import type { GitBranch, GitCommit } from '../models/GitModels';

export interface CommitFileChange {
    path: string;
    additions: number;
    deletions: number;
}

export interface CommitChangeDetails {
    hash: string;
    files: CommitFileChange[];
}

export class GitService {
    private readonly repoPath: string;

    constructor(repoPath: string) {
        this.repoPath = repoPath;
    }

    private async executeGit(args: string[]): Promise<string> {
        const command = Command.create('git', ['-C', this.repoPath, ...args]);
        const output = await command.execute();

        if (output.code !== 0) {
            throw new Error(`Git command failed: ${output.stderr}`);
        }

        return output.stdout;
    }

    public async getBranches(): Promise<GitBranch[]> {
        const output = await this.executeGit(['branch', '--format=%(refname:short)|%(HEAD)']);
        return output.split('\n')
            .filter(line => line.trim())
            .map(line => {
                const [name, head] = line.split('|');
                return { name, isCurrent: head === '*' };
            });
    }

    public async getCommits(branch: string): Promise<GitCommit[]> {
        // Format: Hash|ShortHash|Subject|Author|Date
        const output = await this.executeGit([
            'log',
            branch,
            '--pretty=format:%H|%h|%s|%an|%ad',
            '--date=short',
            '-n', '1000'
        ]);

        return output.split('\n')
            .filter(line => line.trim())
            .map(line => {
                const [hash, shortHash, subject, author, date] = line.split('|');
                return { hash, shortHash, subject, author, date };
            });
    }

    public async getCommitDiff(hash: string, files?: string[]): Promise<string> {
        const args = ['show', hash, '--stat', '-p'];
        if (files && files.length > 0) {
            args.push('--');
            args.push(...files);
        }
        return await this.executeGit(args);
    }

    public async getBulkCommitChanges(hashes: string[]): Promise<CommitChangeDetails[]> {
        if (hashes.length === 0) return [];

        const BATCH_SIZE = 20;
        const results: CommitChangeDetails[] = [];

        for (let i = 0; i < hashes.length; i += BATCH_SIZE) {
            const batch = hashes.slice(i, i + BATCH_SIZE);
            const output = await this.executeGit([
                'show',
                '--numstat',
                '--format=COMMIT:%H',
                ...batch
            ]);

            let currentHash = '';
            let currentFiles: CommitFileChange[] = [];

            const lines = output.split('\n');
            for (const line of lines) {
                if (line.startsWith('COMMIT:')) {
                    if (currentHash) {
                        results.push({ hash: currentHash, files: currentFiles });
                    }
                    currentHash = line.substring(7).trim();
                    currentFiles = [];
                    continue;
                }

                if (!line.trim()) continue;

                const parts = line.split('\t');

                if (parts.length >= 3) {
                    const additionsRaw = parts[0].trim();
                    const deletionsRaw = parts[1].trim();
                    const path = parts[2].trim();

                    const additions = additionsRaw === '-' ? 0 : parseInt(additionsRaw, 10);
                    const deletions = deletionsRaw === '-' ? 0 : parseInt(deletionsRaw, 10);

                    if (path) {
                        currentFiles.push({
                            additions: isNaN(additions) ? 0 : additions,
                            deletions: isNaN(deletions) ? 0 : deletions,
                            path: path
                        });
                    }
                }
            }
            if (currentHash) {
                results.push({ hash: currentHash, files: currentFiles });
            }
        }

        return results;
    }
}