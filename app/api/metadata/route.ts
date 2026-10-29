import { NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";
import { Prisma } from "@prisma/client";
import {
  RawMetadataRequestBody,
  userMetadataDtoSchema,
  CustomDataDictionary,
} from "../../lib/dtos/metadata.dto";

export async function POST(request: Request) {
  try {
    const body: RawMetadataRequestBody = await request.json();

    // 1. Validate incoming payload against the strict UserMetadata DTO
    const validation = userMetadataDtoSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      );
    }

    const { email, customData } = validation.data;
    const now = new Date();

    // 2. Execute ACID transaction: Upsert Parent User + Insert/Update JSONB UserMetadata
    try {
      const result = await prisma.$transaction(async (tx) => {
        // Step A: Upsert parent User (createdAt on first insert, updatedAt on subsequent touch)
        const user = await tx.user.upsert({
          where: { email },
          create: {
            email,
            updatedAt: null,
          },
          update: {
            updatedAt: now,
          },
        });

        // Step B: Check if UserMetadata row already exists for this userId
        const existingMetadata = await tx.userMetadata.findUnique({
          where: { userId: user.id },
        });

        // Clean helper: remove keys explicitly set to null so users can delete custom attributes
        const sanitizeDictionary = (dict: Record<string, unknown>) => {
          const cleaned: Record<string, Prisma.InputJsonValue> = {};
          for (const [key, val] of Object.entries(dict)) {
            if (val !== null && val !== undefined) {
              cleaned[key] = val as Prisma.InputJsonValue;
            }
          }
          return cleaned;
        };

        if (!existingMetadata) {
          // First-time creation: updatedAt remains strictly NULL
          const initialPayload = sanitizeDictionary(customData);

          const created = await tx.userMetadata.create({
            data: {
              userId: user.id,
              customData: initialPayload,
              updatedAt: null,
            },
          });

          return {
            action: "created" as const,
            userId: user.id,
            email: user.email,
            metadata: created,
          };
        } else {
          // Update existing row: merge existing JSONB attributes with incoming updates and set updatedAt
          const currentJson =
            existingMetadata.customData &&
            typeof existingMetadata.customData === "object" &&
            !Array.isArray(existingMetadata.customData)
              ? (existingMetadata.customData as CustomDataDictionary)
              : {};

          const mergedPayload = sanitizeDictionary({
            ...currentJson,
            ...customData,
          });

          const updated = await tx.userMetadata.update({
            where: { id: existingMetadata.id },
            data: {
              customData: mergedPayload,
              updatedAt: now,
            },
          });

          return {
            action: "updated" as const,
            userId: user.id,
            email: user.email,
            metadata: updated,
          };
        }
      });

      return NextResponse.json({
        message:
          result.action === "created"
            ? "Custom metadata created successfully."
            : "Custom metadata updated successfully.",
        data: {
          metadataId: result.metadata.id,
          userId: result.userId,
          email: result.email,
          customData: result.metadata.customData,
          createdAt: result.metadata.createdAt,
          updatedAt: result.metadata.updatedAt,
        },
      });
    } catch (dbError) {
      console.error(
        "CRITICAL: Failed to write metadata JSONB to database:",
        dbError,
      );
      return NextResponse.json(
        {
          error:
            "Error: Error writing metadata to database. Please call the developer.",
        },
        { status: 500 },
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to process metadata request." },
      { status: 500 },
    );
  }
}
