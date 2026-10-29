import { z } from "zod";

// ==========================================
// 1. PRIMITIVES & CONDITION SCHEMA (BR13 - BR19, AC27)
// ==========================================

export const DisplayAsEnum = z.enum(["dropdown", "list", "text"]);
export const AnswerTypeEnum = z.enum(["single", "multi", "bool", "text"]);

export const VisibilityConditionSchema = z
  .object({
    questionId: z.number().int().positive(),
    expectedValue: z.string().trim().optional(),
    anyAnswerIds: z.array(z.number().int().positive()).optional(),
  })
  .superRefine((cond, ctx) => {
    const hasExpectedValue =
      typeof cond.expectedValue === "string" &&
      cond.expectedValue.trim().length > 0;
    const hasAnswerIds =
      Array.isArray(cond.anyAnswerIds) && cond.anyAnswerIds.length > 0;

    // BR19 / AC27: Saving is blocked while a condition is incomplete
    if (!hasExpectedValue && !hasAnswerIds) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["anyAnswerIds"],
        message: "Select at least one answer that triggers this condition.",
      });
    }
  })
  .nullable()
  .optional();

export type VisibilityCondition = z.infer<typeof VisibilityConditionSchema>;

// ==========================================
// 2. SECTION DTOs (BR09, AC10 - AC12)
// ==========================================

export const UpsertSectionSchema = z.object({
  id: z.number().int().positive().optional(),
  countryCode: z.string().trim().min(2).max(5).toUpperCase(),
  name: z.string().trim().min(1, "Enter a section name."),
});

// ==========================================
// 3. ANSWER & QUESTION DTOs (BR10 - BR29)
// ==========================================

export const ConfigAnswerInputSchema = z.object({
  id: z.number().int().positive().optional(),
  label: z.string().trim().min(1, "Fill in or remove the empty answers."),
  isPreFilled: z.boolean().default(false),
  isLocked: z.boolean().default(false),
  isArchived: z.boolean().default(false),
  conditionJson: VisibilityConditionSchema,
});

export const UpsertQuestionSchema = z
  .object({
    id: z.number().int().positive().optional(),
    sectionId: z.number().int().positive(),
    label: z.string().trim().min(1, "Enter the question."),
    displayAs: DisplayAsEnum,
    answerType: AnswerTypeEnum,
    isRequired: z.boolean().default(true),
    confirmAiValue: z.boolean().default(false),
    preFilledText: z.string().trim().optional().nullable(),
    conditionJson: VisibilityConditionSchema,
    answers: z.array(ConfigAnswerInputSchema).default([]),
    updatedBy: z.string().trim().default("Hugo Azevedo"),
  })
  .superRefine((data, ctx) => {
    const activeAnswers = data.answers.filter((a) => !a.isArchived);

    // BR17 / AC22: Text questions have no answers and answerType must be 'text'
    if (data.displayAs === "text" || data.answerType === "text") {
      return;
    }

    // BR16 / AC21: Yes/No answers cannot have their own conditions
    if (data.answerType === "bool") {
      const hasConditionOnBoolAnswer = activeAnswers.some((a) =>
        Boolean(a.conditionJson?.questionId),
      );
      if (hasConditionOnBoolAnswer) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["answers"],
          message: "Yes/No answers cannot have their own conditions.",
        });
      }
    }

    // BR15 / AC19: Single choice & Multi-select require at least 2 active answers
    if (data.answerType === "single" || data.answerType === "multi") {
      if (activeAnswers.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["answers"],
          message: "Add at least two answers.",
        });
      }

      // Case-insensitive uniqueness check across active answers
      const seen = new Set<string>();
      for (const ans of activeAnswers) {
        const normalized = ans.label.trim().toLowerCase();
        if (seen.has(normalized)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["answers"],
            message:
              "Answers must be different from each other (case-insensitive).",
          });
          break;
        }
        seen.add(normalized);
      }
    }

    // BR29 / AC41: Single choice & Yes/No allow at most 1 pre-filled answer
    if (data.answerType === "single" || data.answerType === "bool") {
      const preFilledCount = activeAnswers.filter((a) => a.isPreFilled).length;
      if (preFilledCount > 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["answers"],
          message:
            "At most one answer can be marked as pre-filled for this question type.",
        });
      }
    }
  });

// ==========================================
// 4. DAG & DEPENDENCY GRAPH VALIDATORS (BR12, BR19, BR20, BR22, BR26)
// ==========================================

export interface SectionQuestionNode {
  id: number;
  label: string;
  answerType: string;
  sortOrder: number;
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
 * Helper: Checks if a condition references a specific answer on the controlling question,
 * supporting both `anyAnswerIds` (ID array) and `expectedValue` (label string).
 */
function conditionReferencesAnswer(
  cond: VisibilityCondition | null | undefined,
  targetAnswerId: number,
  targetAnswerLabel?: string,
): boolean {
  if (!cond) return false;

  if (
    Array.isArray(cond.anyAnswerIds) &&
    cond.anyAnswerIds.includes(targetAnswerId)
  ) {
    return true;
  }

  if (
    cond.expectedValue &&
    targetAnswerLabel &&
    cond.expectedValue.trim().toLowerCase() ===
      targetAnswerLabel.trim().toLowerCase()
  ) {
    return true;
  }

  return false;
}

/**
 * BR19 & AC28: Ensures a question or its answers only depend on an EARLIER active
 * non-Text question within the exact same section.
 */
export function validateConditionPrecedence(
  sectionQuestions: SectionQuestionNode[],
  currentQuestionId: number | undefined,
  targetSortOrder: number,
  questionCondition: VisibilityCondition | null | undefined,
  answerConditions: (VisibilityCondition | null | undefined)[],
): { valid: boolean; error?: string } {
  const allConditions = [questionCondition, ...answerConditions].filter(
    (c): c is NonNullable<VisibilityCondition> => Boolean(c && c.questionId),
  );

  if (allConditions.length === 0) return { valid: true };

  const activeQuestions = sectionQuestions.filter((q) => !q.isArchived);

  for (const cond of allConditions) {
    if (currentQuestionId && cond.questionId === currentQuestionId) {
      return { valid: false, error: "A question cannot depend on itself." };
    }

    const controllingQ = activeQuestions.find((q) => q.id === cond.questionId);
    if (!controllingQ) {
      return {
        valid: false,
        error:
          "The controlling question does not exist or is currently archived.",
      };
    }

    // BR17 / AC23: Text questions cannot control conditions
    if (controllingQ.answerType === "text") {
      return {
        valid: false,
        error: `“${controllingQ.label}” is a Text question and cannot be used as a condition.`,
      };
    }

    // BR12 / BR19 / AC28: Controlling question must appear BEFORE this question
    if (controllingQ.sortOrder >= targetSortOrder) {
      return {
        valid: false,
        error: `This item must stay after “${controllingQ.label}”, which controls it.`,
      };
    }
  }

  return { valid: true };
}

/**
 * BR20, BR22, AC29, AC32: Finds all active questions or answers that depend on a given
 * questionId (or specific answerId). Used to block archiving or switching to Text.
 */
export function findDependentItems(
  sectionQuestions: SectionQuestionNode[],
  targetQuestionId: number,
  targetAnswerId?: number,
): string[] {
  const dependents: string[] = [];

  const targetQuestion = sectionQuestions.find(
    (q) => q.id === targetQuestionId,
  );
  const targetAnswerLabel =
    targetAnswerId !== undefined
      ? targetQuestion?.answers.find((a) => a.id === targetAnswerId)?.label
      : undefined;

  for (const q of sectionQuestions) {
    if (q.isArchived) continue;

    // Check question-level condition
    if (q.conditionJson?.questionId === targetQuestionId) {
      if (
        !targetAnswerId ||
        conditionReferencesAnswer(
          q.conditionJson,
          targetAnswerId,
          targetAnswerLabel,
        )
      ) {
        dependents.push(q.label);
      }
    }

    // Check answer-level conditions
    for (const ans of q.answers) {
      if (ans.isArchived) continue;
      if (ans.conditionJson?.questionId === targetQuestionId) {
        if (
          !targetAnswerId ||
          conditionReferencesAnswer(
            ans.conditionJson,
            targetAnswerId,
            targetAnswerLabel,
          )
        ) {
          dependents.push(`${q.label} › ${ans.label}`);
        }
      }
    }
  }

  return Array.from(new Set(dependents));
}

/**
 * BR12 & AC15: Validates a Drag-and-Drop question reorder array before committing.
 */
export function validateQuestionReorder(
  sectionQuestions: SectionQuestionNode[],
  orderedQuestionIds: number[],
): { valid: boolean; error?: string } {
  const posMap = new Map<number, number>();
  orderedQuestionIds.forEach((id, index) => posMap.set(id, index));

  for (const q of sectionQuestions) {
    if (q.isArchived) continue;
    const myPos = posMap.get(q.id);
    if (myPos === undefined) continue;

    const refs = [
      q.conditionJson?.questionId,
      ...q.answers
        .filter((a) => !a.isArchived)
        .map((a) => a.conditionJson?.questionId),
    ].filter((id): id is number => Boolean(id));

    for (const ctrlId of refs) {
      const ctrlPos = posMap.get(ctrlId);
      if (ctrlPos !== undefined && ctrlPos > myPos) {
        const ctrlQ = sectionQuestions.find((x) => x.id === ctrlId);
        return {
          valid: false,
          error: `“${q.label}” must stay after “${ctrlQ?.label || "its controlling question"}”, which controls it.`,
        };
      }
    }
  }

  return { valid: true };
}

/**
 * BR26 & AC37: Validates whether an archived question can be restored.
 * Refuses if its controlling question is still archived.
 */
export function validateQuestionRestore(
  sectionQuestions: SectionQuestionNode[],
  questionToRestore: SectionQuestionNode,
): { valid: boolean; error?: string } {
  const ctrlId = questionToRestore.conditionJson?.questionId;
  if (!ctrlId) return { valid: true };

  const ctrlQ = sectionQuestions.find((q) => q.id === ctrlId);
  if (!ctrlQ || ctrlQ.isArchived) {
    return {
      valid: false,
      error: `Restore “${ctrlQ?.label || "the controlling question"}” first, as “${questionToRestore.label}” depends on it.`,
    };
  }

  return { valid: true };
}
