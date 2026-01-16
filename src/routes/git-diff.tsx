import { createFileRoute } from '@tanstack/react-router';
import { GitDiffManager } from '../components/GitDiffManager';

export const Route = createFileRoute('/git-diff')({
    component: GitDiffManager,
});