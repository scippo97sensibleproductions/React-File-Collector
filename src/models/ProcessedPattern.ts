export interface ProcessedPattern {
    pattern: string;
    isNegated: boolean;
    regex: RegExp;
    originalPattern: string;
}