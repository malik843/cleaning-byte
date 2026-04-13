export type StrategyMissing = 'FLAG_ONLY' | 'DEFAULT_FILL' | 'INTERPOLATE';
export type StrategyCasing = 'TITLE' | 'UPPER' | 'LOWER' | 'ORIGINAL';
export type StrategyDedup = 'OFF' | 'EXACT' | 'FUZZY';

export interface RuleConfig {
    id: string;
    enabled: boolean;
}

export interface StandardizationConfig {
    trimWhitespace: RuleConfig & { type: 'trimWhitespace' };
    casing: RuleConfig & { type: 'casing', strategy: StrategyCasing };
    enforceISO8601: RuleConfig & { type: 'enforceISO8601' };
    expandAbbreviations: RuleConfig & { type: 'expandAbbreviations' };
    order: string[]; // e.g. ['trimWhitespace', 'casing', ...] specifies the execution order
}

export interface MissingDataConfig {
    strategy: StrategyMissing;
    defaultFillText: string;
}

export interface DedupConfig {
    strategy: StrategyDedup;
    fuzzyThreshold: number; // 0 to 100
    columnsToCompare: 'ALL' | string[]; // Will usually map to keys that are EMAIL or ID naturally unless overridden
}

export interface CleaningConfig {
    id: string;
    name: string;
    standardize: StandardizationConfig;
    missing: MissingDataConfig;
    dedup: DedupConfig;
}

export const DEFAULT_CONFIG: CleaningConfig = {
    id: 'default',
    name: 'Recommended Baseline',
    standardize: {
        trimWhitespace: { id: 'trimWhitespace', type: 'trimWhitespace', enabled: true },
        casing: { id: 'casing', type: 'casing', enabled: true, strategy: 'TITLE' },
        enforceISO8601: { id: 'enforceISO8601', type: 'enforceISO8601', enabled: true },
        expandAbbreviations: { id: 'expandAbbreviations', type: 'expandAbbreviations', enabled: false },
        order: ['trimWhitespace', 'expandAbbreviations', 'casing', 'enforceISO8601']
    },
    missing: {
        strategy: 'FLAG_ONLY',
        defaultFillText: 'NOT_PROVIDED'
    },
    dedup: {
        strategy: 'EXACT',
        fuzzyThreshold: 85,
        columnsToCompare: 'ALL'
    }
};
