import { z } from 'zod';
import type { FieldType } from '../src/lib/SchemaInferencer';

const FORBIDDEN_TITLES = ["Mr", "Mrs", "Ms", "Dr", "Prof", "Miss", "Mister", "Doctor", "Mx"];

export const NameSchema = z.string()
    .min(2, { message: "Name is too short (min 2 chars)" })
    .refine(val => !/\d/.test(val), { message: "Name contains digits" })
    .refine(val => {
        const titleRegex = new RegExp(`^(${FORBIDDEN_TITLES.join("|")})\\b`, "i");
        return !titleRegex.test(val);
    }, { message: "Starts with a title" });

export const generateDynamicSchema = (schemaMap: Record<string, FieldType>) => {
    const shape: any = {};
    
    for (const [col, type] of Object.entries(schemaMap)) {
        if (type === 'IGNORE') continue;
        
        let colSchema: any = z.string().optional().or(z.literal(""));
        
        if (type === 'EMAIL') {
            colSchema = z.string().email({ message: "Invalid email structure" }).optional().or(z.literal(""));
        } else if (type === 'NAME') {
            colSchema = NameSchema.optional().or(z.literal(""));
        } else if (type === 'DATE') {
            colSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Format must be YYYY-MM-DD" }).optional().or(z.literal(""));
        } else if (type === 'NUMBER') {
            colSchema = z.string().regex(/^-?\d+(\.\d+)?$/, { message: "Must be a valid number" }).optional().or(z.literal(""));
        } else if (type === 'PHONE') {
            colSchema = z.string().regex(/^[\d\+\s\-\(\)]+$/, { message: "Invalid phone number format" }).optional().or(z.literal(""));
        } else if (type === 'FINGERPRINT') {
            colSchema = z.string().optional().or(z.literal(""));
        }
        
        shape[col] = colSchema;
    }
    
    return z.object(shape);
};