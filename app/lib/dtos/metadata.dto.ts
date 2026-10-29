import { z } from "zod";

/**
 * 1. Raw defensive interface for incoming unvalidated JSON payloads (.NET style)
 */
export interface RawMetadataRequestBody {
  id?: unknown;
  userId?: unknown;
  email?: unknown;
  customData?: unknown;
}

/**
 * 2. Strict JSONB Value Schema (Zod v4 native)
 * Supports all UI form controls while blocking nested objects:
 * - string: Text inputs, Dropdowns (Select), Radio buttons, ISO Dates
 * - number: Numeric inputs, sliders, years, ratings (finite by default in Zod v4)
 * - boolean: Toggle switches, Yes/No checkboxes
 * - string[]: Multi-select dropdowns, checkbox groups, skill tags (max 20 items)
 * - null: Explicitly cleared attributes
 */
export const jsonbAttributeValueSchema = z.union([
  z.string().trim().max(500, "Text value cannot exceed 500 characters."),
  z.number(),
  z.boolean(),
  z
    .array(z.string().trim().min(1).max(100))
    .max(20, "Tag list cannot exceed 20 items."),
  z.null(),
]);

/**
 * 3. Custom Data Dictionary Schema (Record<string, AllowedValue>)
 */
export const customDataDictionarySchema = z
  .record(
    z
      .string()
      .trim()
      .min(1, "Attribute key cannot be empty.")
      .max(50, "Attribute key cannot exceed 50 characters.")
      .regex(
        /^[a-zA-Z0-9_ -]+$/,
        "Attribute key can only contain letters, numbers, spaces, hyphens, and underscores.",
      ),
    jsonbAttributeValueSchema,
  )
  .refine((obj) => Object.keys(obj).length > 0, {
    message: "customData must contain at least one attribute.",
  });

/**
 * 4. Master UserMetadata DTO Schema
 */
export const userMetadataDtoSchema = z.object({
  id: z.number().int().positive().optional(),
  userId: z.number().int().positive().optional(),
  email: z.string().trim().toLowerCase().pipe(z.email("Invalid email format.")),
  customData: customDataDictionarySchema,
});

/**
 * 5. Exported TypeScript Types inferred directly from Zod
 */
export type JsonbAttributeValue = z.infer<typeof jsonbAttributeValueSchema>;
export type CustomDataDictionary = z.infer<typeof customDataDictionarySchema>;
export type UserMetadataDto = z.infer<typeof userMetadataDtoSchema>;
