import type {GitIgnoreItem} from "../models/GitIgnoreItem.ts";
import type {ProcessedPattern} from "../models/ProcessedPattern.ts";

const escapeRegexChars = (str: string): string =>
    str.replace(/[.+^${}()|[\]\\]/g, '\\$&');

const convertGitignoreWildcards = (str: string): string =>
    str.replace(/\*/g, '[^/]*').replace(/\?/g, '[^/]');

const handleDoubleAsterisk = (str: string): string => {
    if (str === '**') return '.*';

    let result = str;
    if (result.startsWith('**/')) {
        result = result.substring(3); 
    }

    result = result.replace(/\/\*\*\//g, '(?:/|/.+/)');

    result = result.replace(/\/\*\*$/, '(?:/.*)?');

    return result;
};

const patternToRegex = (pattern: string): RegExp => {
    let regexString = pattern;

    const isExplicitlyRooted = regexString.startsWith('/');
    if (isExplicitlyRooted) {
        regexString = regexString.substring(1);
    }
    
    const isDirectoryOnly = regexString.endsWith('/');
    const cleanPatternForCheck = isDirectoryOnly ? regexString.slice(0, -1) : regexString;
    
    const hasInternalSlash = cleanPatternForCheck.includes('/') && !regexString.startsWith('**/');
    const isAnchored = isExplicitlyRooted || hasInternalSlash;
    
    regexString = escapeRegexChars(regexString);
    regexString = convertGitignoreWildcards(regexString);

    regexString = regexString.replace(/\\\*\\\*/g, '**');
    regexString = handleDoubleAsterisk(regexString);

    if (isAnchored) {
        regexString = `^${regexString}`;
    } else {
        regexString = `(?:^|/)${regexString}`;
    }

    if (!regexString.endsWith('/') && !regexString.endsWith('.*') && !regexString.endsWith('?')) {
        regexString = `${regexString}(?:$|/)`;
    } else if (regexString.endsWith('/')) {
        regexString = `${regexString}`;
    }
    
    return new RegExp(regexString);
};

export const processPattern = (item: GitIgnoreItem): ProcessedPattern | null => {
    let pattern = item.pattern.trim();

    if (!pattern || pattern.startsWith('#')) {
        return null;
    }

    const isNegated = pattern.startsWith('!');
    if (isNegated) {
        pattern = pattern.substring(1);
    }

    if (pattern.startsWith('\\!')) {
        pattern = pattern.substring(1);
    }

    try {
        const regex = patternToRegex(pattern);
        return {
            originalPattern: item.pattern,
            pattern: pattern,
            isNegated: isNegated,
            regex: regex,
        };
    } catch (e) {
        console.warn(`Failed to process gitignore pattern: ${pattern}`, e);
        return null;
    }
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
    if (parent.endsWith('/')) parent = parent.slice(0, -1);

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
        return isNegatedButParentIsIgnored(fullPath, processedPatterns);
    }

    if (targetMatch.isNegated) {
        return isNegatedButParentIsIgnored(fullPath, processedPatterns);
    }

    return true;
};

const processedPatternsCache = new Map<string, ProcessedPattern[]>();

export const shouldIgnore = (items: GitIgnoreItem[], relativePath: string): boolean => {
    const cacheKey = JSON.stringify(items);
    if (!processedPatternsCache.has(cacheKey)) {
        const patterns = items.map(processPattern).filter((p): p is ProcessedPattern => p !== null);
        processedPatternsCache.set(cacheKey, patterns);
    }
    const patterns = processedPatternsCache.get(cacheKey)!;
    return checkIgnore(patterns, relativePath);
};