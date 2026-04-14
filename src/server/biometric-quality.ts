import { z } from 'zod';

export const OpenBqResultSchema = z.object({
  score: z.number().min(0).max(100),
  modality: z.string().optional(),
  warnings: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

export type OpenBqResult = z.infer<typeof OpenBqResultSchema>;

/**
 * TypeScript Client Snippet for DataCleanse
 * This remains 100% pure TypeScript. It calls the sealed Docker microservice.
 */
export const assessBiometricQuality = async (imageFile: File | Blob, modality: string): Promise<OpenBqResult> => {
  const formData = new FormData();
  formData.append('file', imageFile); 
  formData.append('modality', modality);
  
  // Route through Vite's dev proxy — same origin, zero CORS issues
  const response = await fetch('/api/assess', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    let errorDetail = "Unknown Error";
    try {
      const errJson = await response.json();
      errorDetail = errJson.error || errJson.stderr || JSON.stringify(errJson);
    } catch {
      errorDetail = await response.text();
    }
    throw new Error(`Biometric microservice failed (HTTP ${response.status}): ${errorDetail}`);
  }

  const data = await response.json();
  
  // Guarantee the black-box responded cleanly with our typed schema validation
  const parsedResult = OpenBqResultSchema.parse(data);
  return parsedResult;
};
