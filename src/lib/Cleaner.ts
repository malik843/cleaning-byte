import { isValid, parse, format, parseISO } from 'date-fns';
import { generateDynamicSchema } from '../../types/Rules';
import type { FieldType } from './SchemaInferencer';
import { assessFingerprintQuality } from './BiometricValidator';
import type { AssessmentResult } from './BiometricValidator';

const FORBIDDEN_TITLES = ["Mr", "Mrs", "Ms", "Dr", "Prof", "Miss", "Mister", "Doctor", "Mx"];

export const cleanName = (rawName: string) => {
  if (!rawName) return "";
  let cleaned = String(rawName);

  // 1. Remove Non-Printable Characters
  cleaned = cleaned.replace(/[^\x20-\x7E]/g, '');

  // 2. Remove Double Spaces
  cleaned = cleaned.trim().replace(/\s+/g, ' ');

  // 3. Remove Titles
  const titleRegex = new RegExp(`^(${FORBIDDEN_TITLES.join("|")})\\.?\\s+`, "i");
  cleaned = cleaned.replace(titleRegex, '');

  // 4. Strip Numeric Characters
  cleaned = cleaned.replace(/\d/g, '');

  // 5. Proper Case Transformation
  cleaned = cleaned.toLowerCase().split(' ')
    .filter(word => word.length > 0)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return cleaned.trim();
};

export const cleanEmail = (rawEmail: string) => {
  if (!rawEmail) return "";
  let cleaned = String(rawEmail);
  cleaned = cleaned.replace(/[^\x20-\x7E\s]/g, ''); // no weird spaces inside email ideally
  cleaned = cleaned.trim().toLowerCase();
  return cleaned;
};

export const standardizeDate = (rawDate: string) => {
  if (!rawDate) return "";
  let cleaned = String(rawDate).trim();
  
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
      const d = parseISO(cleaned);
      if (isValid(d)) return cleaned;
  }

  const formats = [
    'MM/dd/yyyy', 'M/d/yyyy',
    'dd/MM/yyyy', 'd/M/yyyy',
    'yyyy/MM/dd', 'yyyy-MM-dd',
    'MMM d, yyyy', 'MMMM d, yyyy',
    'MM/dd/yy', 'dd/MM/yy'
  ];

  for (const fmt of formats) {
    let parsedDate = parse(cleaned, fmt, new Date());
    if (isValid(parsedDate)) {
      return format(parsedDate, 'yyyy-MM-dd');
    }
  }

  const fallback = new Date(cleaned);
  if (isValid(fallback)) {
    return format(fallback, 'yyyy-MM-dd');
  }

  return cleaned; 
};

export const cleanGenericString = (rawString: string) => {
    if (!rawString) return "";
    let cleaned = String(rawString);
    cleaned = cleaned.replace(/[^\x20-\x7E]/g, '');
    return cleaned.trim();
};

export const cleanNumber = (rawNum: string) => {
    if (!rawNum) return "";
    let cleaned = String(rawNum).replace(/[^\d\.\-]/g, '');
    return cleaned;
};

export const cleanPhone = (rawPhone: string) => {
    if(!rawPhone) return "";
    return String(rawPhone).replace(/[^\d\+]/g, '');
};

export type ProcessedRow = {
    rowId: number;
    original: Record<string, string>;
    suggested: Record<string, string>;
    isDuplicate: boolean;
    errors: string[];
    biometricAssessment?: AssessmentResult;
};

export const processDataset = (data: any[], schemaMap: Record<string, FieldType>): ProcessedRow[] => {
  const seenIds = new Set();
  const dynamicSchema = generateDynamicSchema(schemaMap);

  return data.map((row, index) => {
    const original: Record<string, string> = {};
    const suggested: Record<string, string> = {};

    let uniqueKeyParts: string[] = [];
    let biometricAssessment: AssessmentResult | undefined = undefined;

    for (const [col, type] of Object.entries(schemaMap)) {
        if (type === 'IGNORE') continue;
        
        const rawValue = row[col] != null ? String(row[col]) : "";
        original[col] = rawValue;

        let cleanedValue = rawValue;
        
        switch(type) {
            case 'NAME': cleanedValue = cleanName(rawValue); break;
            case 'EMAIL': cleanedValue = cleanEmail(rawValue); break;
            case 'DATE': cleanedValue = standardizeDate(rawValue); break;
            case 'NUMBER': cleanedValue = cleanNumber(rawValue); break;
            case 'PHONE': cleanedValue = cleanPhone(rawValue); break;
            case 'FINGERPRINT': {
                cleanedValue = cleanGenericString(rawValue);
                let payload;
                try {
                    payload = typeof rawValue === 'string' ? JSON.parse(rawValue) : rawValue;
                } catch {
                    payload = rawValue;
                }
                biometricAssessment = assessFingerprintQuality(payload);
                break;
            }
            case 'STRING': 
            case 'ID':
                cleanedValue = cleanGenericString(rawValue); 
                break;
        }

        suggested[col] = cleanedValue;

        if ((type === 'ID' || type === 'EMAIL') && cleanedValue) {
            uniqueKeyParts.push(cleanedValue);
        }
    }

    // De-duplication check: if no ID or EMAIL, stringify the whole row
    const uniqueKey = uniqueKeyParts.length > 0 ? uniqueKeyParts.join('|') : Object.values(suggested).join('|');
    let isDuplicate = false;
    if (uniqueKey) {
        if (seenIds.has(uniqueKey)) {
            isDuplicate = true;
        } else {
            seenIds.add(uniqueKey);
        }
    }

    const result = dynamicSchema.safeParse(suggested);
    const errors = !result.success ? result.error.issues.map((i: any) => `${i.path.join('.')}: ${i.message}`) : [];

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
      isDuplicate,
      errors,
      biometricAssessment
    };
  });
};
