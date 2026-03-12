import {
  DECK_COMPARE_REPORT_SCHEMA,
  isRecord,
  safeJsonParse,
  type DeckCompareConversationPrompt,
  type DeckCompareReport,
  type DeckCompareReportInsight,
  type DeckCompareReportSection,
  type DeckCompareReportUnresolvedArea,
  type DeckId,
} from '@/types/domain';

import type { DeckCompareReportContext } from './buildCompareReportPrompt';

const DISALLOWED_COMPARE_PHRASES = [
  /compatibility score/i,
  /perfect match/i,
  /soulmate/i,
  /meant to be/i,
  /should you keep dating/i,
  /red flag/i,
  /destined/i,
  /meant for each other/i,
] as const;

const MAX_INSIGHTS = 4;
const MAX_CONVERSATION_STARTERS = 4;

export const DECK_COMPARE_REPORT_RESPONSE_SCHEMA = {
  name: 'datedeck_compare_report',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: [
      'comparison_confidence_label',
      'comparison_confidence_note',
      'summary_headline',
      'summary_body',
      'alignments',
      'contrasts',
      'unresolved_areas',
      'conversation_starters',
      'guardrails',
    ],
    properties: {
      comparison_confidence_label: {
        type: 'string',
        enum: ['low', 'medium', 'high'],
      },
      comparison_confidence_note: { type: 'string' },
      summary_headline: { type: 'string' },
      summary_body: { type: 'string' },
      alignments: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['title', 'detail', 'tag', 'facet', 'evidence'],
          properties: {
            title: { type: 'string' },
            detail: { type: 'string' },
            tag: { type: 'string' },
            facet: { type: 'string' },
            evidence: {
              type: 'array',
              items: { type: 'string' },
            },
          },
        },
      },
      contrasts: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['title', 'detail', 'tag', 'facet', 'evidence'],
          properties: {
            title: { type: 'string' },
            detail: { type: 'string' },
            tag: { type: 'string' },
            facet: { type: 'string' },
            evidence: {
              type: 'array',
              items: { type: 'string' },
            },
          },
        },
      },
      unresolved_areas: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['title', 'detail', 'tag', 'facet', 'confidence_note'],
          properties: {
            title: { type: 'string' },
            detail: { type: 'string' },
            tag: { type: 'string' },
            facet: { type: 'string' },
            confidence_note: { type: 'string' },
          },
        },
      },
      conversation_starters: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['title', 'prompt', 'rationale', 'related_tags'],
          properties: {
            title: { type: 'string' },
            prompt: { type: 'string' },
            rationale: { type: 'string' },
            related_tags: {
              type: 'array',
              items: { type: 'string' },
            },
          },
        },
      },
      guardrails: {
        type: 'array',
        items: { type: 'string' },
      },
    },
  },
} as const;

interface ParsedCompareReportModelOutput {
  comparisonConfidenceLabel: 'low' | 'medium' | 'high';
  comparisonConfidenceNote: string;
  summaryHeadline: string;
  summaryBody: string;
  alignments: DeckCompareReportInsight[];
  contrasts: DeckCompareReportInsight[];
  unresolvedAreas: DeckCompareReportUnresolvedArea[];
  conversationStarters: DeckCompareConversationPrompt[];
  guardrails: string[];
}

function stripCodeFence(value: string): string {
  const trimmed = value.trim();

  if (!trimmed.startsWith('```')) {
    return trimmed;
  }

  return trimmed
    .replace(/^```[a-zA-Z0-9_-]*\s*/, '')
    .replace(/\s*```$/, '')
    .trim();
}

function ensureAllowedText(value: string, label: string): string {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    throw new Error(`Compare report field "${label}" cannot be empty.`);
  }

  for (const pattern of DISALLOWED_COMPARE_PHRASES) {
    if (pattern.test(trimmed)) {
      throw new Error(
        `Compare report field "${label}" used language outside the DateDeck product boundary.`,
      );
    }
  }

  return trimmed;
}

function parseInsightArray(
  value: unknown,
  label: string,
): DeckCompareReportInsight[] {
  if (!Array.isArray(value)) {
    throw new Error(`Compare report field "${label}" must be an array.`);
  }

  return value.slice(0, MAX_INSIGHTS).map((item, index) => {
    if (!isRecord(item)) {
      throw new Error(`Compare report ${label}[${index}] is invalid.`);
    }

    return {
      title: ensureAllowedText(
        String(item.title ?? ''),
        `${label}[${index}].title`,
      ),
      detail: ensureAllowedText(
        String(item.detail ?? ''),
        `${label}[${index}].detail`,
      ),
      tag: ensureAllowedText(String(item.tag ?? ''), `${label}[${index}].tag`),
      facet: ensureAllowedText(
        String(item.facet ?? 'General'),
        `${label}[${index}].facet`,
      ),
      evidence: Array.isArray(item.evidence)
        ? item.evidence
            .filter((entry): entry is string => typeof entry === 'string')
            .slice(0, 4)
            .map((entry) =>
              ensureAllowedText(entry, `${label}[${index}].evidence`),
            )
        : [],
    };
  });
}

function parseUnresolvedAreaArray(
  value: unknown,
): DeckCompareReportUnresolvedArea[] {
  if (!Array.isArray(value)) {
    throw new Error(
      'Compare report field "unresolved_areas" must be an array.',
    );
  }

  return value.slice(0, MAX_INSIGHTS).map((item, index) => {
    if (!isRecord(item)) {
      throw new Error(`Compare report unresolved_areas[${index}] is invalid.`);
    }

    return {
      title: ensureAllowedText(
        String(item.title ?? ''),
        `unresolved_areas[${index}].title`,
      ),
      detail: ensureAllowedText(
        String(item.detail ?? ''),
        `unresolved_areas[${index}].detail`,
      ),
      tag: ensureAllowedText(
        String(item.tag ?? ''),
        `unresolved_areas[${index}].tag`,
      ),
      facet: ensureAllowedText(
        String(item.facet ?? 'General'),
        `unresolved_areas[${index}].facet`,
      ),
      confidenceNote: ensureAllowedText(
        String(item.confidence_note ?? ''),
        `unresolved_areas[${index}].confidence_note`,
      ),
    };
  });
}

function parseConversationStarterArray(
  value: unknown,
): DeckCompareConversationPrompt[] {
  if (!Array.isArray(value)) {
    throw new Error(
      'Compare report field "conversation_starters" must be an array.',
    );
  }

  return value.slice(0, MAX_CONVERSATION_STARTERS).map((item, index) => {
    if (!isRecord(item)) {
      throw new Error(
        `Compare report conversation_starters[${index}] is invalid.`,
      );
    }

    return {
      title: ensureAllowedText(
        String(item.title ?? ''),
        `conversation_starters[${index}].title`,
      ),
      prompt: ensureAllowedText(
        String(item.prompt ?? ''),
        `conversation_starters[${index}].prompt`,
      ),
      rationale: ensureAllowedText(
        String(item.rationale ?? ''),
        `conversation_starters[${index}].rationale`,
      ),
      relatedTags: Array.isArray(item.related_tags)
        ? item.related_tags
            .filter((entry): entry is string => typeof entry === 'string')
            .slice(0, 4)
            .map((entry) =>
              ensureAllowedText(
                entry,
                `conversation_starters[${index}].related_tags`,
              ),
            )
        : [],
    };
  });
}

function filterGuardedConversationStarters(args: {
  prompts: DeckCompareConversationPrompt[];
  context: DeckCompareReportContext;
}): DeckCompareConversationPrompt[] {
  const guardedTags = new Set(args.context.safety.guardedConversationTags);

  if (guardedTags.size === 0) {
    return args.prompts;
  }

  const filtered = args.prompts.filter(
    (prompt) =>
      !prompt.relatedTags.some((tag) => guardedTags.has(tag)) &&
      !guardedTags.has(prompt.title) &&
      !guardedTags.has(prompt.prompt),
  );

  if (filtered.length > 0) {
    return filtered;
  }

  return [
    {
      title: 'Compare examples before conclusions',
      prompt:
        'Which examples in this deck felt most accurate for each of you, and which ones still feel too context-dependent to lock in yet?',
      rationale:
        'Guarded themes are in play, so the report should stay anchored in examples and uncertainty rather than strong prompts.',
      relatedTags: [],
    },
  ];
}

function buildSections(
  parsed: ParsedCompareReportModelOutput,
): DeckCompareReportSection[] {
  return [
    {
      id: 'summary',
      title: 'Deck summary',
      summary: parsed.summaryBody,
      tone:
        parsed.comparisonConfidenceLabel === 'high'
          ? 'primary'
          : parsed.comparisonConfidenceLabel === 'medium'
            ? 'supporting'
            : 'caution',
    },
    {
      id: 'alignments',
      title: 'Strongest alignments',
      summary:
        parsed.alignments[0]?.detail ??
        'No major alignment was strong enough to summarize confidently.',
      tone: parsed.alignments.length > 0 ? 'primary' : 'supporting',
    },
    {
      id: 'contrasts',
      title: 'Interesting contrasts',
      summary:
        parsed.contrasts[0]?.detail ??
        'No single contrast dominated the compare input strongly enough to headline.',
      tone: parsed.contrasts.length > 0 ? 'supporting' : 'supporting',
    },
    {
      id: 'unresolved_areas',
      title: 'Unresolved areas',
      summary:
        parsed.unresolvedAreas[0]?.detail ??
        'The payload did not surface a major unresolved area.',
      tone: parsed.unresolvedAreas.length > 0 ? 'caution' : 'supporting',
    },
    {
      id: 'conversation_starters',
      title: 'Conversation starters',
      summary:
        parsed.conversationStarters[0]?.prompt ??
        'Use the clearest alignment or contrast as the next topic to unpack together.',
      tone: 'primary',
    },
  ];
}

function parseModelOutput(
  raw: string | unknown,
): ParsedCompareReportModelOutput {
  const parsedValue =
    typeof raw === 'string'
      ? safeJsonParse<unknown>(stripCodeFence(raw), null)
      : raw;

  if (!isRecord(parsedValue)) {
    throw new Error('Compare report response was not valid JSON.');
  }

  return {
    comparisonConfidenceLabel:
      parsedValue.comparison_confidence_label === 'low' ||
      parsedValue.comparison_confidence_label === 'medium' ||
      parsedValue.comparison_confidence_label === 'high'
        ? parsedValue.comparison_confidence_label
        : (() => {
            throw new Error(
              'Compare report response had an invalid confidence label.',
            );
          })(),
    comparisonConfidenceNote: ensureAllowedText(
      String(parsedValue.comparison_confidence_note ?? ''),
      'comparison_confidence_note',
    ),
    summaryHeadline: ensureAllowedText(
      String(parsedValue.summary_headline ?? ''),
      'summary_headline',
    ),
    summaryBody: ensureAllowedText(
      String(parsedValue.summary_body ?? ''),
      'summary_body',
    ),
    alignments: parseInsightArray(parsedValue.alignments, 'alignments'),
    contrasts: parseInsightArray(parsedValue.contrasts, 'contrasts'),
    unresolvedAreas: parseUnresolvedAreaArray(parsedValue.unresolved_areas),
    conversationStarters: parseConversationStarterArray(
      parsedValue.conversation_starters,
    ),
    guardrails: Array.isArray(parsedValue.guardrails)
      ? parsedValue.guardrails
          .filter((item): item is string => typeof item === 'string')
          .slice(0, 6)
          .map((item) => ensureAllowedText(item, 'guardrails'))
      : [],
  };
}

export function parseCompareReport(args: {
  raw: string | unknown;
  context: DeckCompareReportContext;
  deckId: DeckId;
  deckTitle: string;
  sourceKind: 'ai' | 'local_fallback';
  model: string | null;
  fallbackReason?: string | null;
}): DeckCompareReport {
  const parsed = parseModelOutput(args.raw);
  const conversationStarters = filterGuardedConversationStarters({
    prompts: parsed.conversationStarters,
    context: args.context,
  });

  if (
    args.context.unresolvedAreas.length > 0 &&
    parsed.unresolvedAreas.length === 0
  ) {
    throw new Error(
      'Compare report omitted unresolved areas even though the payload still contains uncertainty.',
    );
  }

  if (
    args.context.sharedAlignments.length > 0 &&
    parsed.alignments.length === 0
  ) {
    throw new Error(
      'Compare report omitted strong alignments that were present in the local compare context.',
    );
  }

  const summarySection: DeckCompareReportSection = {
    id: 'summary',
    title: parsed.summaryHeadline,
    summary: parsed.summaryBody,
    tone:
      parsed.comparisonConfidenceLabel === 'high'
        ? 'primary'
        : parsed.comparisonConfidenceLabel === 'medium'
          ? 'supporting'
          : 'caution',
  };

  return {
    schema: DECK_COMPARE_REPORT_SCHEMA,
    generatedAt: Date.now(),
    deckId: args.deckId,
    deckTitle: args.deckTitle,
    source: {
      kind: args.sourceKind,
      model: args.model,
      fallbackReason: args.fallbackReason ?? null,
    },
    confidence: {
      value: args.context.comparisonConfidence.value,
      label: parsed.comparisonConfidenceLabel,
      note: parsed.comparisonConfidenceNote,
    },
    sections: [summarySection, ...buildSections(parsed).slice(1)],
    summary: summarySection,
    alignments: parsed.alignments,
    contrasts: parsed.contrasts,
    unresolvedAreas: parsed.unresolvedAreas,
    conversationStarters,
    guardrails:
      parsed.guardrails.length > 0
        ? parsed.guardrails
        : args.context.guardrails,
  };
}
