import {
  COMPARE_PAYLOAD_SCHEMA,
  type ComparePayloadThemeSummaryItem,
  type ComparePayloadUnresolvedArea,
  type ComparePayloadV1,
  type DeckCompareReportConfidence,
  type DeckSafetyCautionLevel,
  type DeckTagId,
} from '@/types/domain';
import {
  getDeckSafetyPolicy,
  shouldHideConversationPromptForTag,
} from '@/lib/policy/deckSafetyPolicy';

interface CompareReportParticipantContext {
  label: string;
  confidenceLabel: 'low' | 'medium' | 'high';
  confidenceValue: number;
  swipeCount: number;
  tagCoverage: number;
  facetCoverage: number;
  stabilityScore: number;
  ambiguityRatio: number;
  topAffinities: string[];
  topAversions: string[];
  unresolvedAreas: string[];
}

export interface CompareReportInsightContext {
  tagId: DeckTagId | null;
  tag: string;
  facet: string;
  title: string;
  detail: string;
  evidence: string[];
}

export interface CompareReportUnresolvedContext {
  tagId: DeckTagId | null;
  tag: string;
  facet: string;
  title: string;
  detail: string;
  confidenceNote: string;
}

export interface DeckCompareReportContext {
  deckId: ComparePayloadV1['deck']['deckId'];
  deckTitle: string;
  deckCategory: ComparePayloadV1['deck']['category'];
  deckSensitivity: ComparePayloadV1['deck']['sensitivity'];
  comparisonConfidence: DeckCompareReportConfidence;
  participants: {
    self: CompareReportParticipantContext;
    other: CompareReportParticipantContext;
  };
  sharedAlignments: CompareReportInsightContext[];
  contrasts: CompareReportInsightContext[];
  unresolvedAreas: CompareReportUnresolvedContext[];
  safety: {
    cautionLevel: DeckSafetyCautionLevel;
    warnings: string[];
    guardedConversationTags: string[];
  };
  guardrails: string[];
}

export interface DeckCompareReportPrompt {
  developerInstruction: string;
  userPrompt: string;
  context: DeckCompareReportContext;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function confidenceLabel(value: number): 'low' | 'medium' | 'high' {
  if (value >= 0.72) {
    return 'high';
  }

  if (value >= 0.45) {
    return 'medium';
  }

  return 'low';
}

function summarizeThemeItems(
  items: ComparePayloadThemeSummaryItem[],
  fallback: string,
): string[] {
  if (items.length === 0) {
    return [fallback];
  }

  return items.slice(0, 3).map((item) => item.tag);
}

function summarizeUnresolvedAreas(
  items: ComparePayloadUnresolvedArea[],
): string[] {
  if (items.length === 0) {
    return ['No major unresolved areas in the exported deck summary.'];
  }

  return items
    .slice(0, 3)
    .map((item) => `${item.tag} (${item.reason.replaceAll('_', ' ')})`);
}

function buildParticipantContext(
  label: string,
  payload: ComparePayloadV1,
): CompareReportParticipantContext {
  return {
    label,
    confidenceLabel: payload.confidence.label,
    confidenceValue: payload.confidence.value,
    swipeCount: payload.confidence.swipeCount,
    tagCoverage: payload.confidence.tagCoverage,
    facetCoverage: payload.confidence.facetCoverage,
    stabilityScore: payload.confidence.stabilityScore,
    ambiguityRatio: payload.confidence.ambiguityRatio,
    topAffinities: summarizeThemeItems(
      payload.affinities,
      'No clear positive theme stood out in the exported payload.',
    ),
    topAversions: summarizeThemeItems(
      payload.aversions,
      'No clear aversion theme stood out in the exported payload.',
    ),
    unresolvedAreas: summarizeUnresolvedAreas(payload.unresolvedAreas),
  };
}

function buildEvidenceIndex(
  payload: ComparePayloadV1,
): Map<DeckTagId, string[]> {
  const evidenceByTagId = new Map<DeckTagId, string[]>();

  for (const card of payload.evidence.cards) {
    const evidenceLabel = `${card.title} (${card.leaning === 'affinity' ? 'positive anchor' : 'contrast anchor'})`;

    for (const tagId of card.supportingTagIds) {
      const current = evidenceByTagId.get(tagId) ?? [];
      if (!current.includes(evidenceLabel)) {
        current.push(evidenceLabel);
      }
      evidenceByTagId.set(tagId, current);
    }
  }

  return evidenceByTagId;
}

function buildThemeIndex(
  items: ComparePayloadThemeSummaryItem[],
): Map<DeckTagId, ComparePayloadThemeSummaryItem> {
  return new Map(items.map((item) => [item.tagId, item] as const));
}

function insightSortValue(
  left: ComparePayloadThemeSummaryItem,
  right: ComparePayloadThemeSummaryItem,
): number {
  return (
    Math.abs(right.score) +
    right.exposureCount * 0.15 -
    (Math.abs(left.score) + left.exposureCount * 0.15)
  );
}

function getInsightStrength(args: {
  tagId: DeckTagId | null;
  affinityByTagId: Map<DeckTagId, ComparePayloadThemeSummaryItem>;
  otherAffinityByTagId: Map<DeckTagId, ComparePayloadThemeSummaryItem>;
  aversionByTagId: Map<DeckTagId, ComparePayloadThemeSummaryItem>;
  otherAversionByTagId: Map<DeckTagId, ComparePayloadThemeSummaryItem>;
}): number {
  if (!args.tagId) {
    return 0;
  }

  return (
    (args.affinityByTagId.get(args.tagId)?.score ?? 0) +
    (args.otherAffinityByTagId.get(args.tagId)?.score ?? 0) +
    Math.abs(args.aversionByTagId.get(args.tagId)?.score ?? 0) +
    Math.abs(args.otherAversionByTagId.get(args.tagId)?.score ?? 0)
  );
}

function buildSharedAlignments(
  selfPayload: ComparePayloadV1,
  otherPayload: ComparePayloadV1,
): CompareReportInsightContext[] {
  const selfAffinityByTagId = buildThemeIndex(selfPayload.affinities);
  const otherAffinityByTagId = buildThemeIndex(otherPayload.affinities);
  const selfAversionByTagId = buildThemeIndex(selfPayload.aversions);
  const otherAversionByTagId = buildThemeIndex(otherPayload.aversions);
  const selfEvidence = buildEvidenceIndex(selfPayload);
  const otherEvidence = buildEvidenceIndex(otherPayload);
  const insights: CompareReportInsightContext[] = [];

  for (const [tagId, selfTheme] of selfAffinityByTagId.entries()) {
    const otherTheme = otherAffinityByTagId.get(tagId);

    if (!otherTheme) {
      continue;
    }

    insights.push({
      tagId,
      tag: selfTheme.tag,
      facet: selfTheme.facet ?? 'General',
      title: `Shared pull toward ${selfTheme.tag}`,
      detail:
        'Both people show positive signal in this theme, so it is a strong candidate for easy alignment and shared examples.',
      evidence: [
        ...(selfEvidence.get(tagId) ?? []),
        ...(otherEvidence.get(tagId) ?? []),
      ].slice(0, 3),
    });
  }

  for (const [tagId, selfTheme] of selfAversionByTagId.entries()) {
    const otherTheme = otherAversionByTagId.get(tagId);

    if (!otherTheme) {
      continue;
    }

    insights.push({
      tagId,
      tag: selfTheme.tag,
      facet: selfTheme.facet ?? 'General',
      title: `Shared caution around ${selfTheme.tag}`,
      detail:
        'Both people lean away from this theme, which can be just as useful for planning and conversation as a shared positive.',
      evidence: [
        ...(selfEvidence.get(tagId) ?? []),
        ...(otherEvidence.get(tagId) ?? []),
      ].slice(0, 3),
    });
  }

  return insights
    .sort((left, right) => {
      const leftStrength = getInsightStrength({
        tagId: left.tagId,
        affinityByTagId: selfAffinityByTagId,
        otherAffinityByTagId,
        aversionByTagId: selfAversionByTagId,
        otherAversionByTagId,
      });
      const rightStrength = getInsightStrength({
        tagId: right.tagId,
        affinityByTagId: selfAffinityByTagId,
        otherAffinityByTagId,
        aversionByTagId: selfAversionByTagId,
        otherAversionByTagId,
      });

      return rightStrength - leftStrength;
    })
    .slice(0, 4);
}

function buildDirectContrasts(
  selfPayload: ComparePayloadV1,
  otherPayload: ComparePayloadV1,
): CompareReportInsightContext[] {
  const selfAffinityByTagId = buildThemeIndex(selfPayload.affinities);
  const otherAffinityByTagId = buildThemeIndex(otherPayload.affinities);
  const selfAversionByTagId = buildThemeIndex(selfPayload.aversions);
  const otherAversionByTagId = buildThemeIndex(otherPayload.aversions);
  const selfEvidence = buildEvidenceIndex(selfPayload);
  const otherEvidence = buildEvidenceIndex(otherPayload);
  const contrasts: CompareReportInsightContext[] = [];

  for (const [tagId, selfTheme] of selfAffinityByTagId.entries()) {
    const otherTheme = otherAversionByTagId.get(tagId);

    if (!otherTheme) {
      continue;
    }

    contrasts.push({
      tagId,
      tag: selfTheme.tag,
      facet: selfTheme.facet ?? otherTheme.facet ?? 'General',
      title: `${selfTheme.tag} looks like a real contrast`,
      detail:
        'One person leans toward this theme while the other person leans away from it, which makes it a grounded topic to unpack carefully.',
      evidence: [
        ...(selfEvidence.get(tagId) ?? []),
        ...(otherEvidence.get(tagId) ?? []),
      ].slice(0, 4),
    });
  }

  for (const [tagId, otherTheme] of otherAffinityByTagId.entries()) {
    const selfTheme = selfAversionByTagId.get(tagId);

    if (!selfTheme) {
      continue;
    }

    if (contrasts.some((item) => item.tagId === tagId)) {
      continue;
    }

    contrasts.push({
      tagId,
      tag: otherTheme.tag,
      facet: otherTheme.facet ?? selfTheme.facet ?? 'General',
      title: `${otherTheme.tag} splits the two profiles`,
      detail:
        'The minimized payloads show opposite direction on this theme, so it should be framed as a conversation difference rather than a verdict.',
      evidence: [
        ...(selfEvidence.get(tagId) ?? []),
        ...(otherEvidence.get(tagId) ?? []),
      ].slice(0, 4),
    });
  }

  if (contrasts.length > 0) {
    return contrasts.slice(0, 4);
  }

  const selfUniqueAffinity = selfPayload.affinities
    .filter((item) => !otherAffinityByTagId.has(item.tagId))
    .sort(insightSortValue)
    .slice(0, 2);
  const otherUniqueAffinity = otherPayload.affinities
    .filter((item) => !selfAffinityByTagId.has(item.tagId))
    .sort(insightSortValue)
    .slice(0, 2);

  for (
    let index = 0;
    index < Math.min(selfUniqueAffinity.length, otherUniqueAffinity.length);
    index += 1
  ) {
    const selfTheme = selfUniqueAffinity[index];
    const otherTheme = otherUniqueAffinity[index];

    contrasts.push({
      tagId: null,
      tag: `${selfTheme.tag} vs ${otherTheme.tag}`,
      facet:
        selfTheme.facet === otherTheme.facet
          ? (selfTheme.facet ?? 'General')
          : 'Cross-theme',
      title: `${selfTheme.tag} and ${otherTheme.tag} point in different directions`,
      detail:
        'The exported deck summaries do not show a direct opposite tag, but the strongest positive lanes differ enough to be worth discussing.',
      evidence: [
        ...(selfEvidence.get(selfTheme.tagId) ?? []),
        ...(otherEvidence.get(otherTheme.tagId) ?? []),
      ].slice(0, 4),
    });
  }

  return contrasts.slice(0, 3);
}

function buildUnresolvedAreas(
  selfPayload: ComparePayloadV1,
  otherPayload: ComparePayloadV1,
): CompareReportUnresolvedContext[] {
  const unresolvedByTagId = new Map<
    DeckTagId,
    {
      self?: ComparePayloadUnresolvedArea;
      other?: ComparePayloadUnresolvedArea;
    }
  >();

  for (const item of selfPayload.unresolvedAreas) {
    unresolvedByTagId.set(item.tagId, {
      ...(unresolvedByTagId.get(item.tagId) ?? {}),
      self: item,
    });
  }

  for (const item of otherPayload.unresolvedAreas) {
    unresolvedByTagId.set(item.tagId, {
      ...(unresolvedByTagId.get(item.tagId) ?? {}),
      other: item,
    });
  }

  const unresolved = Array.from(unresolvedByTagId.values())
    .map((entry) => {
      const base = entry.self ?? entry.other;

      if (!base) {
        return null;
      }

      const bothSidesUnresolved = Boolean(entry.self && entry.other);
      const uncertainty = Math.max(
        entry.self?.uncertainty ?? 0,
        entry.other?.uncertainty ?? 0,
      );

      return {
        tagId: base.tagId,
        tag: base.tag,
        facet: base.facet ?? 'General',
        uncertainty,
        title: bothSidesUnresolved
          ? `${base.tag} is still unresolved for both people`
          : `${base.tag} still needs more signal`,
        detail: bothSidesUnresolved
          ? 'Both minimized payloads still mark this theme as uncertain, so the report should treat it as a question rather than a claim.'
          : 'One person still has unresolved signal here, so any comparison claim should stay tentative.',
        confidenceNote:
          uncertainty >= 0.7
            ? 'High uncertainty remains here.'
            : 'This area is still moderately unresolved.',
      };
    })
    .filter((item) => item !== null) as Array<
    CompareReportUnresolvedContext & { uncertainty: number }
  >;

  unresolved.sort((left, right) => right.uncertainty - left.uncertainty);

  return unresolved
    .slice(0, 4)
    .map(({ uncertainty: _uncertainty, ...item }) => item);
}

function buildComparisonConfidence(
  selfPayload: ComparePayloadV1,
  otherPayload: ComparePayloadV1,
  unresolvedAreaCount: number,
): DeckCompareReportConfidence {
  const baseSignal = Math.min(
    selfPayload.confidence.value,
    otherPayload.confidence.value,
  );
  const coverageFloor = Math.min(
    selfPayload.confidence.tagCoverage,
    otherPayload.confidence.tagCoverage,
    selfPayload.confidence.facetCoverage,
    otherPayload.confidence.facetCoverage,
  );
  const stabilityFloor = Math.min(
    selfPayload.confidence.stabilityScore,
    otherPayload.confidence.stabilityScore,
  );
  const ambiguityPenalty =
    Math.max(
      selfPayload.confidence.ambiguityRatio,
      otherPayload.confidence.ambiguityRatio,
    ) * 0.2;
  const unresolvedPenalty = unresolvedAreaCount > 0 ? 0.06 : 0;
  const value = clamp(
    baseSignal * 0.55 +
      coverageFloor * 0.25 +
      stabilityFloor * 0.2 -
      ambiguityPenalty -
      unresolvedPenalty,
    0,
    1,
  );
  const label = confidenceLabel(value);
  const note =
    label === 'high'
      ? 'Both exported deck profiles have enough breadth and stability for a confident deck-scoped comparison.'
      : label === 'medium'
        ? 'This comparison has meaningful structure, but some areas should still be framed with caution.'
        : 'This comparison is still useful as a conversation aid, but the unresolved areas matter more than any strong verdict.';

  return {
    value,
    label,
    note,
  };
}

function buildGuardrails(
  selfPayload: ComparePayloadV1,
  otherPayload: ComparePayloadV1,
  guardedConversationTags: string[],
): string[] {
  const deckSafetyPolicy = getDeckSafetyPolicy({
    id: selfPayload.deck.deckId,
    sensitivity: selfPayload.deck.sensitivity,
    showdownEligible: true,
    isCustom: false,
  });
  const guardrails = [
    `Stay inside ${selfPayload.deck.title}. Do not generalize beyond this deck.`,
    'Treat the output as a conversation map, not a compatibility verdict.',
    'Call out uncertainty wherever the payload still shows ambiguity or low coverage.',
  ];

  if (selfPayload.deck.contentVersion !== otherPayload.deck.contentVersion) {
    guardrails.push(
      'The two payloads use different prebuilt deck content versions, so avoid over-reading fine-grained differences.',
    );
  }

  if (
    selfPayload.deck.sensitivity !== 'standard' ||
    otherPayload.deck.sensitivity !== 'standard'
  ) {
    guardrails.push(
      'This deck is more sensitive than the standard launch decks, so keep the tone especially careful and non-judgmental.',
    );
  } else if (deckSafetyPolicy.cautionLevel !== 'standard') {
    guardrails.push(
      'This deck uses extra-care compare safeguards, so keep the tone cautious, specific, and non-judgmental.',
    );
  }

  for (const warning of deckSafetyPolicy.report.additionalGuardrails) {
    guardrails.push(warning);
  }

  if (
    selfPayload.policy.redactions.includes(
      'sensitive_low_confidence_theme_summaries',
    ) ||
    otherPayload.policy.redactions.includes(
      'sensitive_low_confidence_theme_summaries',
    )
  ) {
    guardrails.push(
      'Some sensitive low-confidence themes were intentionally withheld. Do not speculate about what was omitted.',
    );
  }

  if (
    selfPayload.policy.redactions.includes('sensitive_unresolved_areas') ||
    otherPayload.policy.redactions.includes('sensitive_unresolved_areas')
  ) {
    guardrails.push(
      'Some sensitive uncertain areas stay local until the signal is stronger. Do not invent them in the report.',
    );
  }

  if (guardedConversationTags.length > 0) {
    guardrails.push(
      `Do not turn ${guardedConversationTags.join(', ')} into direct conversation starters unless the context already frames them cautiously.`,
    );
  }

  return guardrails;
}

function buildGuardedConversationTags(
  selfPayload: ComparePayloadV1,
  otherPayload: ComparePayloadV1,
): string[] {
  const deckSafetyPolicy = getDeckSafetyPolicy({
    id: selfPayload.deck.deckId,
    sensitivity: selfPayload.deck.sensitivity,
    showdownEligible: true,
    isCustom: false,
  });
  const guardedTags = new Set<string>();

  for (const item of [
    ...selfPayload.affinities,
    ...selfPayload.aversions,
    ...selfPayload.unresolvedAreas,
    ...otherPayload.affinities,
    ...otherPayload.aversions,
    ...otherPayload.unresolvedAreas,
  ]) {
    if (shouldHideConversationPromptForTag(deckSafetyPolicy, item.tagId)) {
      guardedTags.add(item.tag);
    }
  }

  return Array.from(guardedTags);
}

function buildDeveloperInstruction(): string {
  return [
    'You are writing a DateDeck one-to-one compare report for a single deck.',
    'Use only the provided JSON context. Do not invent facts or infer anything beyond this deck.',
    'AI is a summarizer, not an oracle. Do not produce whole-person compatibility scores, diagnoses, romantic predictions, or manipulative advice.',
    'Prioritize theme/tag structure, confidence, uncertainty, and minimal evidence anchors.',
    'Keep the tone warm, grounded, non-clinical, non-judgmental, and useful for an in-person conversation.',
    'If the context is uncertain, say so clearly.',
    'Return strict JSON only.',
  ].join(' ');
}

function buildUserPrompt(context: DeckCompareReportContext): string {
  return JSON.stringify(
    {
      task: 'Generate a deck-scoped compare report with summary, alignments, contrasts, unresolved areas, and conversation starters.',
      context,
    },
    null,
    2,
  );
}

function assertPayloadCompatibility(
  selfPayload: ComparePayloadV1,
  otherPayload: ComparePayloadV1,
): void {
  if (selfPayload.schema !== COMPARE_PAYLOAD_SCHEMA) {
    throw new Error(
      'The local compare payload does not match the supported schema.',
    );
  }

  if (otherPayload.schema !== COMPARE_PAYLOAD_SCHEMA) {
    throw new Error(
      'The pasted compare payload does not match the supported schema.',
    );
  }

  if (selfPayload.deck.deckId !== otherPayload.deck.deckId) {
    throw new Error('Both compare payloads must belong to the same deck.');
  }

  if (selfPayload.deck.contentVersion !== otherPayload.deck.contentVersion) {
    throw new Error(
      'Both compare payloads must use the same deck content version.',
    );
  }

  if (!selfPayload.readiness.ready || !otherPayload.readiness.ready) {
    throw new Error(
      'Both compare payloads must be compare-ready before generating a report.',
    );
  }
}

export function buildDeckCompareReportContext(args: {
  selfPayload: ComparePayloadV1;
  otherPayload: ComparePayloadV1;
}): DeckCompareReportContext {
  const { selfPayload, otherPayload } = args;
  assertPayloadCompatibility(selfPayload, otherPayload);
  const deckSafetyPolicy = getDeckSafetyPolicy({
    id: selfPayload.deck.deckId,
    sensitivity: selfPayload.deck.sensitivity,
    showdownEligible: true,
    isCustom: false,
  });

  const unresolvedAreas = buildUnresolvedAreas(selfPayload, otherPayload);
  const comparisonConfidence = buildComparisonConfidence(
    selfPayload,
    otherPayload,
    unresolvedAreas.length,
  );
  const guardedConversationTags = buildGuardedConversationTags(
    selfPayload,
    otherPayload,
  );

  return {
    deckId: selfPayload.deck.deckId,
    deckTitle: selfPayload.deck.title,
    deckCategory: selfPayload.deck.category,
    deckSensitivity: selfPayload.deck.sensitivity,
    comparisonConfidence,
    participants: {
      self: buildParticipantContext('You', selfPayload),
      other: buildParticipantContext('Other person', otherPayload),
    },
    sharedAlignments: buildSharedAlignments(selfPayload, otherPayload),
    contrasts: buildDirectContrasts(selfPayload, otherPayload),
    unresolvedAreas,
    safety: {
      cautionLevel: deckSafetyPolicy.cautionLevel,
      warnings: [
        deckSafetyPolicy.warnings.report,
        ...selfPayload.policy.safetyWarnings,
        ...otherPayload.policy.safetyWarnings,
      ].filter((warning) => warning.length > 0),
      guardedConversationTags,
    },
    guardrails: buildGuardrails(
      selfPayload,
      otherPayload,
      guardedConversationTags,
    ),
  };
}

export function buildCompareReportPrompt(args: {
  selfPayload: ComparePayloadV1;
  otherPayload: ComparePayloadV1;
}): DeckCompareReportPrompt {
  const context = buildDeckCompareReportContext(args);

  return {
    developerInstruction: buildDeveloperInstruction(),
    userPrompt: buildUserPrompt(context),
    context,
  };
}
