import { z } from 'zod';

/**
 * Zod schema to strictly type-check incoming fingerprint payloads.
 * Validates biometric compliance, base-64 integrity, datetimes, and rigid OpenBQ exception paths.
 */
export const BiometricSegmentSchema = z.object({
  type: z.literal('fingerprint', {
    message: "Type must be strictly set to 'fingerprint'."
  }),
  data: z.string()
    .regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/, "Must be a valid base64 encoded template (ISO/IEC 19794 compliant)"),
  timestamp: z.string()
    .datetime({ message: "Must be a valid ISO 8601 datetime string." }),
  qualityScore: z.number({ message: "Quality score is required." } as any),
  EXCEPTION: z.boolean().optional().default(false),
  reasonCode: z.string().optional(),
  operatorOverride: z.object({
    operatorId: z.string(),
    overrideTimestamp: z.string().datetime(),
    notes: z.string().optional()
  }).optional()
}).refine(payload => {
  // Exception Handling Inclusion
  if (payload.EXCEPTION) {
    return payload.qualityScore === 0 && Boolean(payload.reasonCode) && payload.operatorOverride !== undefined;
  }
  return true;
}, {
  message: "Exception overrides require qualityScore of 0, a valid reason code (e.g. 'Physically unable to provide'), and operator override metadata.",
  path: ["EXCEPTION"]
});

export type BiometricSegment = z.infer<typeof BiometricSegmentSchema>;

export type AssessmentResult = {
  status: 'passed' | 'failed' | 'flagged';
  uiIndicator: 'Green' | 'Red' | 'Yellow';
  errors?: string[];
  message: string;
};

/**
 * Validates and assesses an incoming biometric fingerprint payload according to NFIQ2 Standards.
 */
export const assessFingerprintQuality = (payload: unknown): AssessmentResult => {
  // 1. Data Modeling & Format Validation
  const result = BiometricSegmentSchema.safeParse(payload);
  
  if (!result.success) {
    return {
      status: 'failed',
      uiIndicator: 'Red',
      message: "Invalid data format",
      errors: result.error.issues.map((e: any) => `${e.path.join('.') || 'payload'}: ${e.message}`)
    };
  }

  const data = result.data;

  // 2. Exception Handling (Legitimate Biometric Failures like worn ridges)
  if (data.EXCEPTION) {
    return {
      status: 'passed',
      uiIndicator: 'Yellow', // Distinctly accepted but visibly noted as an exception
      message: `Accepted under exception protocol. Override applied for operator: ${data.operatorOverride?.operatorId}. Reason: ${data.reasonCode}`
    };
  }

  // 3. NFIQ2 Quality Constraints (Enforce hard > 60 score requirement)
  if (data.qualityScore <= 60) {
    return {
      status: 'flagged',
      uiIndicator: 'Red', // Hard mandate to prompt visual recapture trigger
      message: `Quality score of ${data.qualityScore} is too low. Immediate recapture required.`
    };
  }

  // 4. Clean Validation Success
  return {
    status: 'passed',
    uiIndicator: 'Green',
    message: "Biometric segment passed NFIQ2 validation."
  };
};
