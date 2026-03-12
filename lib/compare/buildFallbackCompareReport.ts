import {
  DECK_COMPARE_REPORT_SCHEMA,
  type ComparePayloadV1,
  type DeckCompareConversationPrompt,
  type DeckCompareReport,
  type DeckCompareReportInsight,
  type DeckCompareReportSection,
  type DeckCompareReportUnresolvedArea,
} from '@/types/domain';

import { buildDeckCompareReportContext } from './buildCompareReportPrompt';

function buildSummarySection(args: {
  deckTitle: string;
  alignmentCount: number;
  contrastCount: number;
  unresolvedCount: number;
}): DeckCompareReportSection {
  const { deckTitle, alignmentCount, contrastCount, unresolvedCount } = args;
  const emphasis =
    unresolvedCount > 0
      ? 'caution'
      : alignmentCount > 0
        ? 'primary'
        : 'supporting';

  return {
    id: 'summary',
    title: 'Deck summary',
    summary:
      alignmentCount > 0
        ? `This ${deckTitle} comparison has a few grounded overlap areas plus ${contrastCount > 0 ? 'some meaningful differences' : 'room to go deeper'}.`
        : `This ${deckTitle} comparison is still more exploratory than settled, so the unresolved areas matter as much as the alignments.`,
    tone: emphasis,
  };
}

function buildConversationPrompts(
  alignments: DeckCompareReportInsight[],
  contrasts: DeckCompareReportInsight[],
  unresolvedAreas: DeckCompareReportUnresolvedArea[],
  guardedConversationTags: string[],
): DeckCompareConversationPrompt[] {
  const prompts: DeckCompareConversationPrompt[] = [];
  const isGuarded = (tag: string) => guardedConversationTags.includes(tag);

  for (const alignment of alignments.slice(0, 2)) {
    if (isGuarded(alignment.tag)) {
      continue;
    }

    prompts.push({
      title: `Trade examples about ${alignment.tag}`,
      prompt: `What is a recent example of ${alignment.tag.toLowerCase()} that each of you genuinely enjoyed or appreciated?`,
      rationale:
        'A shared theme is easiest to deepen when both people can anchor it in a real example instead of speaking abstractly.',
      relatedTags: [alignment.tag],
    });
  }

  for (const contrast of contrasts.slice(0, 1)) {
    if (isGuarded(contrast.tag)) {
      continue;
    }

    prompts.push({
      title: `Unpack the difference around ${contrast.tag}`,
      prompt: `What makes ${contrast.tag.toLowerCase()} land well for one of you and miss for the other?`,
      rationale:
        'Contrasts are most useful when they become explanation, context, and tradeoff rather than a winner-versus-loser debate.',
      relatedTags: [contrast.tag],
    });
  }

  for (const unresolved of unresolvedAreas.slice(0, 1)) {
    if (isGuarded(unresolved.tag)) {
      continue;
    }

    prompts.push({
      title: `Probe the uncertainty in ${unresolved.tag}`,
      prompt: `Is ${unresolved.tag.toLowerCase()} actually a real preference, or does it depend on context, mood, or specific examples?`,
      rationale:
        'Low-confidence areas are better handled as open questions than as fixed traits.',
      relatedTags: [unresolved.tag],
    });
  }

  if (prompts.length === 0) {
    prompts.push({
      title: 'Compare examples before conclusions',
      prompt:
        'Which examples in this deck felt most accurate for each of you, and which ones still feel too context-dependent to lock in yet?',
      rationale:
        'When guarded themes are in play, the safest conversation move is to compare examples and context rather than pushing for a verdict.',
      relatedTags: [],
    });
  }

  return prompts.slice(0, 4);
}

export function buildFallbackCompareReport(args: {
  selfPayload: ComparePayloadV1;
  otherPayload: ComparePayloadV1;
  fallbackReason: string;
}): DeckCompareReport {
  const { selfPayload, otherPayload, fallbackReason } = args;
  const context = buildDeckCompareReportContext({
    selfPayload,
    otherPayload,
  });
  const alignments = context.sharedAlignments.slice(0, 4);
  const contrasts = context.contrasts.slice(0, 4);
  const unresolvedAreas = context.unresolvedAreas.slice(0, 4);
  const summary = buildSummarySection({
    deckTitle: context.deckTitle,
    alignmentCount: alignments.length,
    contrastCount: contrasts.length,
    unresolvedCount: unresolvedAreas.length,
  });
  const sections: DeckCompareReportSection[] = [
    summary,
    {
      id: 'alignments',
      title: 'Strongest alignments',
      summary:
        alignments.length > 0
          ? `${alignments.length} grounded alignment area${alignments.length === 1 ? '' : 's'} stand out in the minimized payloads.`
          : 'No strong shared lane stands out yet from the current deck payloads.',
      tone: alignments.length > 0 ? 'primary' : 'supporting',
    },
    {
      id: 'contrasts',
      title: 'Interesting contrasts',
      summary:
        contrasts.length > 0
          ? `${contrasts.length} contrast area${contrasts.length === 1 ? '' : 's'} look worth unpacking in conversation.`
          : 'No major contrast dominates the exported deck signal yet.',
      tone: contrasts.length > 0 ? 'supporting' : 'supporting',
    },
    {
      id: 'unresolved_areas',
      title: 'Unresolved areas',
      summary:
        unresolvedAreas.length > 0
          ? `${unresolvedAreas.length} area${unresolvedAreas.length === 1 ? '' : 's'} still need more caution or follow-up examples.`
          : 'The exported deck summaries do not surface major unresolved areas right now.',
      tone: unresolvedAreas.length > 0 ? 'caution' : 'supporting',
    },
    {
      id: 'conversation_starters',
      title: 'Conversation starters',
      summary:
        'Use the strongest alignment, clearest difference, and biggest open question as your next conversation threads.',
      tone: 'primary',
    },
  ];

  return {
    schema: DECK_COMPARE_REPORT_SCHEMA,
    generatedAt: Date.now(),
    deckId: context.deckId,
    deckTitle: context.deckTitle,
    source: {
      kind: 'local_fallback',
      model: null,
      fallbackReason,
    },
    confidence: context.comparisonConfidence,
    sections,
    summary,
    alignments,
    contrasts,
    unresolvedAreas,
    conversationStarters: buildConversationPrompts(
      alignments,
      contrasts,
      unresolvedAreas,
      context.safety.guardedConversationTags,
    ),
    guardrails: context.guardrails,
  };
}
