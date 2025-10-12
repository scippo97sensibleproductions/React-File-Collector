import type {GitIgnoreItem} from "../models/GitIgnoreItem.ts";
import type {ProcessedPattern} from "../models/ProcessedPattern.ts";

const escapeRegexChars = (str: string): string =>
    str.replace(/[.+^${}()|[\]]/g, '\\$&');

const unescapeGitignoreSpecialChars = (str: string): string =>
    str.replace(/\\([!#*? ])/g, '$1');

const convertGitignoreWildcards = (str: string): string =>
    str.replace(/\*/g, '[^/]*').replace(/\?/g, '[^/]');

const handleDoubleAsterisk = (str: string): string => {
    let result = str;
    if (result.startsWith('**/')) {
        result = `(?:.*/)?${result.substring(3)}`;
    }
    result = result.replace(/\/\*\*(\/|$)/g, '(?:/.*)*$1');
    result = result.replace(/\/(\*\*)$/, '(?:/.*)?');
    return result;
};

const applyAnchoring = (pattern: string, regexString: string): string => {
    if (pattern.includes('/') && !pattern.startsWith('**/')) {
        return `^${regexString}`;
    }
    return `(?:^|/)${regexString}`;
};

const finalizePatternMatching = (pattern: string, regexString: string): string => {
    if (pattern.endsWith('/')) {
        return `${regexString.slice(0, -1)}($|/.*)`;
    }
    return `${regexString}($|/.*)`;
};

const patternToRegex = (pattern: string): RegExp => {
    const pipeline = [
        escapeRegexChars,
        unescapeGitignoreSpecialChars,
        convertGitignoreWildcards,
        handleDoubleAsterisk,
        (s: string) => applyAnchoring(pattern, s),
        (s: string) => finalizePatternMatching(pattern, s),
    ];

    const finalRegexString = pipeline.reduce((acc, fn) => fn(acc), pattern);

    return new RegExp(finalRegexString);
};

export const processPattern = (item: GitIgnoreItem): ProcessedPattern | null => {
    let pattern = item.pattern.trim();

    if (pattern === '' || pattern.startsWith('#')) {
        return null;
    }

    const isNegated = pattern.startsWith('!');
    if (isNegated) {
        pattern = pattern.substring(1);
    }

    if (pattern.startsWith('\\!')) {
        pattern = pattern.substring(1);
    }

    const regex = patternToRegex(pattern);

    return {
        originalPattern: item.pattern,
        pattern: pattern,
        isNegated: isNegated,
        regex: regex,
    };
};

const findLastMatch = (path: string, patterns: ProcessedPattern[]): ProcessedPattern | null => {
    let lastMatch: ProcessedPattern | null = null;
    for (const p of patterns) {
        if (p.regex.test(path)) {
            lastMatch = p;
        }
    }
    return lastMatch;
};

const isNegatedButParentIsIgnored = (path: string, patterns: ProcessedPattern[]): boolean => {
    let parent = path;
    while (parent.includes('/')) {
        parent = parent.substring(0, parent.lastIndexOf('/'));
        if (parent === '') break;

        const parentDirectoryPath = `${parent}/`;
        const parentMatch = findLastMatch(parentDirectoryPath, patterns);

        if (parentMatch && !parentMatch.isNegated) {
            return true;
        }
    }
    return false;
}

export const checkIgnore = (processedPatterns: ProcessedPattern[], fullPath: string): boolean => {
    const targetMatch = findLastMatch(fullPath, processedPatterns);

    if (!targetMatch) {
        return false;
    }

    if (targetMatch.isNegated) {
        return isNegatedButParentIsIgnored(fullPath, processedPatterns);
    }

    return true;
};

export const shouldIgnore = (items: GitIgnoreItem[], fullPath: string): boolean => {
    const patterns = items.map(processPattern).filter((p): p is ProcessedPattern => p !== null);
    return checkIgnore(patterns, fullPath);
};