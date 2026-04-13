import { isValid, parse, format, parseISO } from 'date-fns';
import { generateDynamicSchema } from '../../types/Rules';
import type { FieldType } from './SchemaInferencer';
import { assessFingerprintQuality } from './BiometricValidator';
import type { AssessmentResult } from './BiometricValidator';
import type { CleaningConfig } from './CleaningEngineConfig';
import fuzzysort from 'fuzzysort';

export type ProcessedRow = {
    rowId: number;
    original: Record<string, string>;
    suggested: Record<string, string>;
    isDuplicate: boolean;
    errors: string[];
    biometricAssessment?: AssessmentResult;
};

export const applyStandardization = (rawValue: string, type: FieldType, config: CleaningConfig['standardize']) => {
    let val = String(rawValue);
    if (!val) return "";

    for (const ruleId of config.order) {
        const rule = config[ruleId as keyof Omit<CleaningConfig['standardize'], 'order'>];
        if (!rule || !rule.enabled) continue;

        switch (rule.type) {
            case 'trimWhitespace':
                val = val.replace(/[^\x20-\x7E]/g, '');
                val = val.trim().replace(/\s+/g, ' ');
                break;
            case 'expandAbbreviations':
                if (type === 'NAME') {
                   const titleRegex = /^(Mr|Mrs|Ms|Dr|Prof|Miss|Mister|Doctor|Mx)\.?\s+/i;
                   val = val.replace(titleRegex, '');
                }
                break;
            case 'casing':
                if (rule.strategy === 'LOWER') val = val.toLowerCase();
                else if (rule.strategy === 'UPPER') val = val.toUpperCase();
                else if (rule.strategy === 'TITLE') {
                    val = val.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                }
                break;
            case 'enforceISO8601':
                if (type === 'DATE') {
                   let cleaned = val;
                   let isDone = false;
                   if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
                       const d = parseISO(cleaned);
                       if (isValid(d)) isDone = true;
                   }
                   if (!isDone) {
                     const formats = [
                       'MM/dd/yyyy', 'M/d/yyyy', 'dd/MM/yyyy', 'd/M/yyyy', 'yyyy/MM/dd', 'yyyy-MM-dd',
                       'MMM d, yyyy', 'MMMM d, yyyy', 'MM/dd/yy', 'dd/MM/yy'
                     ];
                     for (const fmt of formats) {
                       let parsedDate = parse(cleaned, fmt, new Date());
                       if (isValid(parsedDate)) {
                         val = format(parsedDate, 'yyyy-MM-dd');
                         isDone = true;
                         break;
                       }
                     }
                     if(!isDone) {
                        const fallback = new Date(cleaned);
                        if(isValid(fallback)) val = format(fallback, 'yyyy-MM-dd');
                     }
                   }
                }
                break;
        }
    }
    
    // Type-specific forced constraints
    if (type === 'NUMBER') val = val.replace(/[^\d\.\-]/g, '');
    if (type === 'PHONE') val = val.replace(/[^\d\+]/g, '');
    if (type === 'EMAIL') val = val.replace(/[^\x20-\x7E\s]/g, '').trim().toLowerCase();

    return val.trim();
};

export const processDataset = (data: any[], schemaMap: Record<string, FieldType>, config: CleaningConfig): ProcessedRow[] => {
  const dynamicSchema = generateDynamicSchema(schemaMap);
  const lastSeenValues: Record<string, string> = {};

  // First pass: Normalization & Imputation
  const processedRows: ProcessedRow[] = data.map((row, index) => {
    const original: Record<string, string> = {};
    const suggested: Record<string, string> = {};
    let biometricAssessment: AssessmentResult | undefined = undefined;

    for (const [col, type] of Object.entries(schemaMap)) {
        if (type === 'IGNORE') continue;
        
        const rawValue = row[col] != null ? String(row[col]) : "";
        original[col] = rawValue;

        let workingValue = rawValue;

        // Imputation Logic
        if (!workingValue || workingValue.trim() === '') {
            if (config.missing.strategy === 'DEFAULT_FILL') {
                workingValue = config.missing.defaultFillText;
            } else if (config.missing.strategy === 'INTERPOLATE') {
                workingValue = lastSeenValues[col] || ""; 
            }
        } 
        
        if (workingValue) {
             lastSeenValues[col] = workingValue;
        }

        let cleanedValue = workingValue;

        if (type === 'FINGERPRINT') {
            // Apply light trim
            cleanedValue = workingValue.trim();
            let payload;
            try {
                payload = typeof workingValue === 'string' ? JSON.parse(workingValue) : workingValue;
            } catch {
                payload = workingValue;
            }
            biometricAssessment = assessFingerprintQuality(payload);
        } else {
            cleanedValue = applyStandardization(workingValue, type, config.standardize);
        }

        suggested[col] = cleanedValue;
    }

    const result = dynamicSchema.safeParse(suggested);
    const errors = !result.success ? result.error.issues.map((i: any) => `${i.path.join('.')}: ${i.message}`) : [];

    if (config.missing.strategy === 'FLAG_ONLY') {
       for (const [col, val] of Object.entries(suggested)) {
           if (!val || val.trim() === '') {
               errors.push(`${col}: Missing data flag triggered`);
           }
       }
    }

    if (biometricAssessment && biometricAssessment.status !== 'passed') {
         errors.push(`Biometric [${biometricAssessment.status.toUpperCase()}]: ${biometricAssessment.message}`);
         if (biometricAssessment.errors) {
             biometricAssessment.errors.forEach((e: string) => errors.push(`Biometric: ${e}`));
         }
    }

    return {
      rowId: index + 1,
      original,
      suggested,
      isDuplicate: false,
      errors,
      biometricAssessment
    };
  });

  // Second pass: Deduplication
  const dedupProps = config.dedup;
  if (dedupProps.strategy !== 'OFF') {
      const seenExact = new Set<string>();
      const seenValuesFuzzy: string[] = [];
      const thresholdScore = -(100 - dedupProps.fuzzyThreshold) * 10; // Simple fuzzysort mapping constraint

      for (let r of processedRows) {
            let dedupKeyStr = '';

            if (dedupProps.columnsToCompare === 'ALL') {
                 const keys = Object.keys(r.suggested).filter(k => schemaMap[k] === 'ID' || schemaMap[k] === 'EMAIL');
                 if (keys.length > 0) dedupKeyStr = keys.map(k => r.suggested[k]).join('|');
                 else dedupKeyStr = Object.values(r.suggested).join('|');
            } else {
                 dedupKeyStr = dedupProps.columnsToCompare.map(c => r.suggested[c]).join('|');
            }

            if (!dedupKeyStr) continue;

            if (dedupProps.strategy === 'EXACT') {
                if (seenExact.has(dedupKeyStr)) {
                    r.isDuplicate = true;
                } else {
                    seenExact.add(dedupKeyStr);
                }
            } else if (dedupProps.strategy === 'FUZZY') {
                const searchRes = fuzzysort.go(dedupKeyStr, seenValuesFuzzy);
                if (searchRes.length > 0 && searchRes[0].score >= thresholdScore) {
                    r.isDuplicate = true;
                } else {
                    seenValuesFuzzy.push(dedupKeyStr);
                }
            }
      }
  }

  return processedRows;
};
