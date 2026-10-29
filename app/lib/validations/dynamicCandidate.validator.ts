import { z } from "zod";
import { VisibilityCondition } from "./adminConfig.schema";

// ==========================================
// 1. CANDIDATE JSONB ANSWER ENVELOPE (BR27, AC38)
// ==========================================

export const CandidateQuestionAnswerSchema = z.object({
  value: z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.array(z.number().int()),
    z.array(z.string()),
    z.null(),
  ]),
  source: z.enum(["recruiter", "ai"]).default("recruiter"),
  aiStatus: z
    .enum(["confirmed", "pending_validation", "disregarded"])
    .default("confirmed"),
  updatedAt: z.string().optional(),
});

export type CandidateQuestionAnswer = z.infer<
  typeof CandidateQuestionAnswerSchema
>;

// Base payload for /api/metadata supporting both flat customData & country additionalInfo
export const DynamicMetadataPayloadSchema = z.object({
  email: z.string().trim().email("Invalid email format."),
  countryCode: z.string().trim().min(2).max(5).toUpperCase().optional(),
  customData: z.record(z.string(), z.unknown()).optional(),
  additionalInfo: z
    .record(z.string(), CandidateQuestionAnswerSchema)
    .optional(),
});

// ==========================================
// 2. RUNTIME CONFIG EVALUATION ENGINE (BR21, BR27, BR28)
// ==========================================

export interface RuntimeQuestionConfig {
  id: number;
  label: string;
  displayAs: string;
  answerType: string;
  isRequired: boolean;
  confirmAiValue: boolean;
  isArchived: boolean;
  conditionJson: VisibilityCondition | null;
  answers: {
    id: number;
    label: string;
    isArchived: boolean;
    conditionJson: VisibilityCondition | null;
  }[];
}

/**
 * Helper: Retrieves a candidate's stored answer entry by question ID or question label.
 */
function getCandidateAnswerEntry(
  qConfig: RuntimeQuestionConfig,
  mergedAnswers: Record<string, CandidateQuestionAnswer>,
): CandidateQuestionAnswer | undefined {
  return mergedAnswers[String(qConfig.id)] ?? mergedAnswers[qConfig.label];
}

/**
 * Helper: Extracts selected answer IDs from a candidate's stored answer value.
 */
function extractSelectedAnswerIds(
  qConfig: RuntimeQuestionConfig,
  rawEntry: CandidateQuestionAnswer | undefined,
): number[] {
  if (!rawEntry || rawEntry.value === null || rawEntry.value === undefined) {
    return [];
  }
  if (rawEntry.aiStatus === "disregarded") return [];

  const val = rawEntry.value;

  if (typeof val === "number") return [val];

  if (Array.isArray(val)) {
    return val
      .map((item) => {
        if (typeof item === "number") return item;
        const found = qConfig.answers.find(
          (a) =>
            a.label.trim().toLowerCase() === String(item).trim().toLowerCase(),
        );
        return found ? found.id : -1;
      })
      .filter((id) => id > 0);
  }

  if (typeof val === "string" || typeof val === "boolean") {
    const strVal = typeof val === "boolean" ? (val ? "Yes" : "No") : val;
    const found = qConfig.answers.find(
      (a) => a.label.trim().toLowerCase() === strVal.trim().toLowerCase(),
    );
    return found ? [found.id] : [];
  }

  return [];
}

/**
 * Helper: Extracts normalized lowercase string labels/values from a candidate's stored answer.
 */
function extractSelectedNormalizedStrings(
  qConfig: RuntimeQuestionConfig,
  rawEntry: CandidateQuestionAnswer | undefined,
): string[] {
  if (!rawEntry || rawEntry.value === null || rawEntry.value === undefined) {
    return [];
  }
  if (rawEntry.aiStatus === "disregarded") return [];

  const val = rawEntry.value;

  if (typeof val === "boolean") {
    return [val ? "yes" : "no"];
  }

  if (typeof val === "number") {
    const found = qConfig.answers.find((a) => a.id === val);
    return found ? [found.label.trim().toLowerCase()] : [String(val)];
  }

  if (typeof val === "string") {
    return [val.trim().toLowerCase()];
  }

  if (Array.isArray(val)) {
    return val.map((item) => {
      if (typeof item === "number") {
        const found = qConfig.answers.find((a) => a.id === item);
        return found ? found.label.trim().toLowerCase() : String(item);
      }
      return String(item).trim().toLowerCase();
    });
  }

  return [];
}

/**
 * BR19 & BR21: Evaluates whether a question's visibility condition is currently met.
 * Supports both `anyAnswerIds` (ID array) and `expectedValue` (label string).
 */
export function isConditionMet(
  condition: VisibilityCondition | null | undefined,
  allQuestionsMap: Map<number, RuntimeQuestionConfig>,
  mergedAnswers: Record<string, CandidateQuestionAnswer>,
): boolean {
  if (!condition || !condition.questionId) return true;

  const controllingQ = allQuestionsMap.get(condition.questionId);
  if (!controllingQ) return false;

  // Recursively check if the controlling question itself is currently visible
  if (
    !isConditionMet(controllingQ.conditionJson, allQuestionsMap, mergedAnswers)
  ) {
    return false;
  }

  const ctrlEntry = getCandidateAnswerEntry(controllingQ, mergedAnswers);

  // 1. Evaluate by Answer IDs if `anyAnswerIds` is populated
  if (
    Array.isArray(condition.anyAnswerIds) &&
    condition.anyAnswerIds.length > 0
  ) {
    const selectedIds = extractSelectedAnswerIds(controllingQ, ctrlEntry);
    if (condition.anyAnswerIds.some((reqId) => selectedIds.includes(reqId))) {
      return true;
    }
  }

  // 2. Evaluate by `expectedValue` if populated
  if (
    typeof condition.expectedValue === "string" &&
    condition.expectedValue.trim().length > 0
  ) {
    const expectedNorm = condition.expectedValue.trim().toLowerCase();
    const selectedStrings = extractSelectedNormalizedStrings(
      controllingQ,
      ctrlEntry,
    );
    if (selectedStrings.includes(expectedNorm)) {
      return true;
    }
  }

  return false;
}

/**
 * Validates and merges incoming candidate `additionalInfo` answers against
 * the active DB configuration for that country at runtime.
 */
export function validateAndMergeCandidateAdditionalInfo(
  activeQuestions: RuntimeQuestionConfig[],
  existingAdditionalInfo: Record<string, CandidateQuestionAnswer>,
  incomingAdditionalInfo: Record<string, CandidateQuestionAnswer>,
): {
  valid: boolean;
  errors: { questionId: number; label: string; message: string }[];
  mergedAdditionalInfo: Record<string, CandidateQuestionAnswer>;
} {
  const errors: { questionId: number; label: string; message: string }[] = [];

  // BR21: Start with existing stored values so hidden questions keep their historical values
  const merged: Record<string, CandidateQuestionAnswer> = {
    ...existingAdditionalInfo,
  };

  const questionsMap = new Map<number, RuntimeQuestionConfig>();
  activeQuestions.forEach((q) => questionsMap.set(q.id, q));

  // Merge incoming updates and apply BR27 (AI Value confirmation state)
  for (const [qIdStr, incomingEntry] of Object.entries(
    incomingAdditionalInfo,
  )) {
    const qId = Number(qIdStr);
    const qConfig = !Number.isNaN(qId)
      ? questionsMap.get(qId)
      : activeQuestions.find((q) => q.label === qIdStr);

    // BR24 / AC35: If question is archived, AI collects in background or past values stay read-only
    if (!qConfig || qConfig.isArchived) {
      continue;
    }

    let finalAiStatus = incomingEntry.aiStatus || "confirmed";
    if (incomingEntry.source === "ai") {
      // BR27 / AC38: If "Recruiter must confirm AI value" is ON, force pending_validation unless already confirmed
      finalAiStatus = qConfig.confirmAiValue
        ? "pending_validation"
        : "confirmed";
    }

    merged[String(qConfig.id)] = {
      ...incomingEntry,
      aiStatus: finalAiStatus,
      updatedAt: new Date().toISOString(),
    };
  }

  // Validate active questions based on live visibility and answer types
  for (const qConfig of activeQuestions) {
    if (qConfig.isArchived) continue;

    const visible = isConditionMet(qConfig.conditionJson, questionsMap, merged);

    // BR21 & BR28: Hidden questions are NEVER required, and their stored value is kept untouched
    if (!visible) continue;

    const currentEntry = getCandidateAnswerEntry(qConfig, merged);
    const val = currentEntry?.value;
    const isEmpty =
      val === undefined ||
      val === null ||
      (typeof val === "string" && val.trim() === "") ||
      (Array.isArray(val) && val.length === 0) ||
      currentEntry?.aiStatus === "disregarded";

    // BR28 / AC39: Required when shown
    if (qConfig.isRequired && isEmpty) {
      errors.push({
        questionId: qConfig.id,
        label: qConfig.label,
        message: `“${qConfig.label}” is required.`,
      });
      continue;
    }

    // BR27 / AC38: Cannot finalize save if a required question has an unconfirmed AI value
    if (qConfig.isRequired && currentEntry?.aiStatus === "pending_validation") {
      errors.push({
        questionId: qConfig.id,
        label: qConfig.label,
        message: `Recruiter must confirm or disregard the AI value for “${qConfig.label}”.`,
      });
      continue;
    }

    if (isEmpty) continue;

    // Validate option membership for Single / Multi / Bool questions
    if (qConfig.displayAs !== "text" && qConfig.answerType !== "text") {
      const selectedIds = extractSelectedAnswerIds(qConfig, currentEntry);
      if (selectedIds.length === 0) {
        errors.push({
          questionId: qConfig.id,
          label: qConfig.label,
          message: `Invalid answer selected for “${qConfig.label}”.`,
        });
        continue;
      }

      if (
        (qConfig.answerType === "single" || qConfig.answerType === "bool") &&
        selectedIds.length > 1
      ) {
        errors.push({
          questionId: qConfig.id,
          label: qConfig.label,
          message: `Only one answer is allowed for “${qConfig.label}”.`,
        });
      }

      // BR18 / AC24: Check if each chosen answer satisfies its own answer-level condition
      for (const ansId of selectedIds) {
        const ansObj = qConfig.answers.find(
          (a) => a.id === ansId && !a.isArchived,
        );
        if (!ansObj) {
          errors.push({
            questionId: qConfig.id,
            label: qConfig.label,
            message: `Selected answer is no longer active for “${qConfig.label}”.`,
          });
        } else if (
          !isConditionMet(ansObj.conditionJson, questionsMap, merged)
        ) {
          errors.push({
            questionId: qConfig.id,
            label: qConfig.label,
            message: `Answer “${ansObj.label}” is not available under current conditions.`,
          });
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    mergedAdditionalInfo: merged,
  };
}
