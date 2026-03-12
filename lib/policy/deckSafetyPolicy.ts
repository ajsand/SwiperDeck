import prebuiltDeckPolicySource from '@/assets/data/prebuilt-deck-policy.json';
import type { DeckCompareReadinessReason } from '@/types/domain/compare';
import type {
  ComparePayloadThemeSummaryItem,
  ComparePayloadUnresolvedArea,
  ComparePayloadV1,
} from '@/types/domain/comparePayload';
import type {
  DeckProfileSummary,
  DeckProfileThemeScore,
  DeckProfileUnresolvedArea,
} from '@/types/domain/deckProfile';
import type {
  DeckSafetyAiMode,
  DeckSafetyCautionLevel,
  DeckSafetyPolicy,
  DeckSafetyPolicySource,
  SensitiveTagRule,
} from '@/types/domain/deckSafetyPolicy';
import type { Deck, DeckSensitivity } from '@/types/domain/decks';
import {
  asDeckId,
  asDeckTagId,
  type DeckId,
  type DeckTagId,
} from '@/types/domain/ids';

const deckSafetyPolicySource =
  prebuiltDeckPolicySource as DeckSafetyPolicySource;

const CAUTION_LEVEL_ORDER: Record<DeckSafetyCautionLevel, number> = {
  standard: 0,
  heightened: 1,
  strict: 2,
};

function maxCautionLevel(
  left: DeckSafetyCautionLevel,
  right: DeckSafetyCautionLevel,
): DeckSafetyCautionLevel {
  return CAUTION_LEVEL_ORDER[left] >= CAUTION_LEVEL_ORDER[right] ? left : right;
}

function baseCautionLevelFromSensitivity(
  sensitivity: DeckSensitivity,
): DeckSafetyCautionLevel {
  if (sensitivity === 'gated') {
    return 'strict';
  }

  if (sensitivity === 'sensitive') {
    return 'heightened';
  }

  return 'standard';
}

function defaultAiModeFromSensitivity(
  sensitivity: DeckSensitivity,
): DeckSafetyAiMode {
  if (sensitivity === 'gated') {
    return 'local_only';
  }

  if (sensitivity === 'sensitive') {
    return 'prefer_local_fallback';
  }

  return deckSafetyPolicySource.default_policy.report.aiMode;
}

function defaultShowdownReason(sensitivity: DeckSensitivity): string | null {
  if (sensitivity === 'gated') {
    return 'Gated decks are not eligible for showdown.';
  }

  if (sensitivity === 'sensitive') {
    return 'Sensitive decks are not eligible for showdown.';
  }

  return null;
}

function normalizeTagRules(
  tagRules: DeckSafetyPolicySource['decks'][number]['tag_rules'],
): SensitiveTagRule[] {
  return tagRules.map((rule) => ({
    tagId: asDeckTagId(rule.tag_id),
    cautionLevel: rule.caution_level,
    minExposureCount: rule.min_exposure_count,
    requireStable: rule.require_stable,
    allowUnresolvedExport: rule.allow_unresolved_export,
    allowConversationPrompt: rule.allow_conversation_prompt,
    note: rule.note,
  }));
}

function getDeckSourcePolicy(deckId: DeckId) {
  return (
    deckSafetyPolicySource.decks.find((entry) => entry.deck_id === deckId) ??
    null
  );
}

function createBasePolicy(
  deck: Pick<Deck, 'id' | 'sensitivity' | 'showdownEligible'>,
): DeckSafetyPolicy {
  const defaultPolicy = deckSafetyPolicySource.default_policy;
  const cautionLevel = baseCautionLevelFromSensitivity(deck.sensitivity);
  const showdownAllowed =
    deck.showdownEligible && deck.sensitivity === 'standard';

  return {
    deckId: deck.id,
    deckSensitivity: deck.sensitivity,
    cautionLevel,
    compare: {
      ...defaultPolicy.compare,
    },
    payload: {
      ...defaultPolicy.payload,
    },
    report: {
      ...defaultPolicy.report,
      aiMode: defaultAiModeFromSensitivity(deck.sensitivity),
      preferLocalFallbackBelowConfidence:
        deck.sensitivity === 'standard'
          ? defaultPolicy.report.preferLocalFallbackBelowConfidence
          : 0.74,
    },
    showdown: {
      allowed: showdownAllowed,
      reason: showdownAllowed ? null : defaultShowdownReason(deck.sensitivity),
    },
    warnings: {
      ...defaultPolicy.warnings,
    },
    tagRules: [],
  };
}

export function getDeckSafetyPolicy(
  deck: Pick<Deck, 'id' | 'sensitivity' | 'showdownEligible' | 'isCustom'>,
): DeckSafetyPolicy {
  if (deck.isCustom) {
    return {
      ...createBasePolicy(deck),
      showdown: {
        allowed: false,
        reason:
          'Custom decks are not eligible for showdown under the current product scope.',
      },
    };
  }

  const basePolicy = createBasePolicy(deck);
  const sourcePolicy = getDeckSourcePolicy(deck.id);

  if (!sourcePolicy) {
    return basePolicy;
  }

  const cautionLevel = maxCautionLevel(
    basePolicy.cautionLevel,
    sourcePolicy.caution_level,
  );
  const showdownAllowed =
    basePolicy.showdown.allowed && sourcePolicy.showdown.allowed;

  return {
    ...basePolicy,
    cautionLevel,
    compare: {
      ...sourcePolicy.compare,
    },
    payload: {
      ...sourcePolicy.payload,
    },
    report: {
      ...sourcePolicy.report,
    },
    showdown: {
      allowed: showdownAllowed,
      reason: showdownAllowed
        ? null
        : (sourcePolicy.showdown.reason ?? basePolicy.showdown.reason),
    },
    warnings: {
      ...basePolicy.warnings,
      ...sourcePolicy.warnings,
    },
    tagRules: normalizeTagRules(sourcePolicy.tag_rules),
  };
}

export function getSensitiveTagRule(
  policy: Pick<DeckSafetyPolicy, 'tagRules'>,
  tagId: DeckTagId,
): SensitiveTagRule | null {
  return policy.tagRules.find((rule) => rule.tagId === tagId) ?? null;
}

function stabilityMeetsRule(
  rule: SensitiveTagRule,
  stability: string,
): boolean {
  if (!rule.requireStable) {
    return stability !== 'emerging';
  }

  return stability === 'stable';
}

function collectSummarySensitiveTagIds(
  policy: Pick<DeckSafetyPolicy, 'tagRules'>,
  summary: DeckProfileSummary,
): DeckTagId[] {
  const tagIds = new Set<DeckTagId>();

  for (const item of [
    ...summary.affinities,
    ...summary.aversions,
    ...summary.unresolved,
  ]) {
    if (getSensitiveTagRule(policy, item.tagId)) {
      tagIds.add(item.tagId);
    }
  }

  return Array.from(tagIds);
}

export function getSummarySensitiveTagIds(
  policy: Pick<DeckSafetyPolicy, 'tagRules'>,
  summary: DeckProfileSummary,
): DeckTagId[] {
  return collectSummarySensitiveTagIds(policy, summary);
}

export function getPayloadSensitiveTagIds(
  policy: Pick<DeckSafetyPolicy, 'tagRules'>,
  payload: Pick<
    ComparePayloadV1,
    'affinities' | 'aversions' | 'unresolvedAreas'
  >,
): DeckTagId[] {
  const tagIds = new Set<DeckTagId>();

  for (const item of [
    ...payload.affinities,
    ...payload.aversions,
    ...payload.unresolvedAreas,
  ]) {
    if (getSensitiveTagRule(policy, item.tagId)) {
      tagIds.add(item.tagId);
    }
  }

  return Array.from(tagIds);
}

function getAmbiguityRatio(summary: DeckProfileSummary): number {
  return summary.coverage.tags.totalTagCount > 0
    ? summary.coverage.tags.uncertainTagCount /
        summary.coverage.tags.totalTagCount
    : 0;
}

function meetsDeckSafetyThresholds(
  policy: DeckSafetyPolicy,
  summary: DeckProfileSummary,
): boolean {
  return (
    summary.confidence.value >= policy.compare.minConfidence &&
    summary.coverage.tags.coverageRatio >= policy.compare.minTagCoverage &&
    summary.coverage.facets.coverageRatio >= policy.compare.minFacetCoverage &&
    getAmbiguityRatio(summary) <= policy.compare.maxAmbiguityRatio &&
    (!policy.compare.requireRetestSettled ||
      summary.stability.retestPendingCount === 0)
  );
}

export function evaluateDeckSafetyReadiness(args: {
  deck: Pick<Deck, 'id' | 'sensitivity' | 'showdownEligible' | 'isCustom'>;
  summary: DeckProfileSummary | null;
}): {
  policy: DeckSafetyPolicy;
  caution: boolean;
  sensitiveTagIds: DeckTagId[];
  additionalReasons: DeckCompareReadinessReason[];
  blockedByDeckPolicy: boolean;
} {
  const policy = getDeckSafetyPolicy(args.deck);

  if (!args.summary) {
    return {
      policy,
      caution: policy.cautionLevel !== 'standard',
      sensitiveTagIds: [],
      additionalReasons: [],
      blockedByDeckPolicy: false,
    };
  }

  const sensitiveTagIds = collectSummarySensitiveTagIds(policy, args.summary);
  const blockedByDeckPolicy =
    policy.cautionLevel !== 'standard' &&
    !meetsDeckSafetyThresholds(policy, args.summary);
  const additionalReasons: DeckCompareReadinessReason[] = [];

  if (blockedByDeckPolicy) {
    additionalReasons.push('sensitive_threshold_not_met');
  }

  if (sensitiveTagIds.length > 0) {
    additionalReasons.push('sensitive_tag_caution');
  }

  return {
    policy,
    caution: policy.cautionLevel !== 'standard' || sensitiveTagIds.length > 0,
    sensitiveTagIds,
    additionalReasons,
    blockedByDeckPolicy,
  };
}

function uniqueReasonList(reasons: string[]): string[] {
  return Array.from(new Set(reasons.filter((reason) => reason.length > 0)));
}

export function createDeckSafetyRedactions(args: {
  policy: DeckSafetyPolicy;
  suppressedAffinityCount: number;
  suppressedAversionCount: number;
  suppressedUnresolvedCount: number;
  evidenceSuppressed: boolean;
}): string[] {
  const redactions: string[] = [];

  if (args.suppressedAffinityCount + args.suppressedAversionCount > 0) {
    redactions.push('sensitive_low_confidence_theme_summaries');
  }

  if (args.suppressedUnresolvedCount > 0) {
    redactions.push('sensitive_unresolved_areas');
  }

  if (args.evidenceSuppressed || args.policy.payload.maxEvidenceCards === 0) {
    redactions.push('sensitive_card_evidence_omitted');
  }

  return uniqueReasonList(redactions);
}

export function filterSensitiveThemeSummaryItems<
  T extends DeckProfileThemeScore | ComparePayloadThemeSummaryItem,
>(
  policy: DeckSafetyPolicy,
  items: T[],
): {
  kept: T[];
  suppressed: T[];
  allowedSensitiveTagIds: Set<DeckTagId>;
} {
  const kept: T[] = [];
  const suppressed: T[] = [];
  const allowedSensitiveTagIds = new Set<DeckTagId>();

  for (const item of items) {
    const rule = getSensitiveTagRule(policy, item.tagId);

    if (!rule) {
      kept.push(item);
      continue;
    }

    const allowed =
      item.exposureCount >= rule.minExposureCount &&
      stabilityMeetsRule(rule, item.stability);

    if (allowed) {
      kept.push(item);
      allowedSensitiveTagIds.add(item.tagId);
    } else {
      suppressed.push(item);
    }
  }

  return {
    kept,
    suppressed,
    allowedSensitiveTagIds,
  };
}

export function filterSensitiveUnresolvedAreas<
  T extends DeckProfileUnresolvedArea | ComparePayloadUnresolvedArea,
>(
  policy: DeckSafetyPolicy,
  items: T[],
): {
  kept: T[];
  suppressed: T[];
} {
  const kept: T[] = [];
  const suppressed: T[] = [];

  for (const item of items) {
    const rule = getSensitiveTagRule(policy, item.tagId);

    if (!rule || rule.allowUnresolvedExport) {
      kept.push(item);
      continue;
    }

    suppressed.push(item);
  }

  return {
    kept,
    suppressed,
  };
}

export function canExportSupportingTag(args: {
  policy: DeckSafetyPolicy;
  tagId: DeckTagId;
  allowedSensitiveTagIds: ReadonlySet<DeckTagId>;
}): boolean {
  const rule = getSensitiveTagRule(args.policy, args.tagId);

  if (!rule) {
    return true;
  }

  return args.allowedSensitiveTagIds.has(args.tagId);
}

export function shouldHideConversationPromptForTag(
  policy: DeckSafetyPolicy,
  tagId: DeckTagId | null,
): boolean {
  if (!tagId) {
    return false;
  }

  const rule = getSensitiveTagRule(policy, tagId);

  if (!rule) {
    return false;
  }

  return (
    policy.report.hideSensitiveConversationPrompts ||
    !rule.allowConversationPrompt
  );
}

export function getDeckSafetyBadgeLabel(
  deck: Pick<Deck, 'id' | 'sensitivity' | 'showdownEligible' | 'isCustom'>,
): string | null {
  const policy = getDeckSafetyPolicy(deck);

  if (deck.sensitivity === 'gated' || policy.cautionLevel === 'strict') {
    return 'Sensitive compare';
  }

  if (
    deck.sensitivity === 'sensitive' ||
    policy.cautionLevel === 'heightened'
  ) {
    return 'Extra-care compare';
  }

  return null;
}

export function getDeckShowdownPolicy(
  deck: Pick<Deck, 'id' | 'sensitivity' | 'showdownEligible' | 'isCustom'>,
): DeckSafetyPolicy['showdown'] {
  return getDeckSafetyPolicy(deck).showdown;
}

export function shouldPreferLocalCompareFallback(args: {
  selfPayload: ComparePayloadV1;
  otherPayload: ComparePayloadV1;
}): {
  preferLocalFallback: boolean;
  reason: string | null;
} {
  const policy = getDeckSafetyPolicy({
    id: asDeckId(args.selfPayload.deck.deckId),
    sensitivity: args.selfPayload.deck.sensitivity,
    showdownEligible: true,
    isCustom: false,
  });
  const comparisonConfidence = Math.min(
    args.selfPayload.confidence.value,
    args.otherPayload.confidence.value,
  );

  if (policy.report.aiMode === 'local_only') {
    return {
      preferLocalFallback: true,
      reason:
        policy.warnings.report ||
        'This deck uses local-only reporting because the topic needs stricter safeguards.',
    };
  }

  if (
    policy.report.aiMode === 'prefer_local_fallback' &&
    comparisonConfidence < policy.report.preferLocalFallbackBelowConfidence
  ) {
    return {
      preferLocalFallback: true,
      reason:
        policy.warnings.report ||
        'This deck stays on a local fallback report until confidence is stronger.',
    };
  }

  return {
    preferLocalFallback: false,
    reason: null,
  };
}
