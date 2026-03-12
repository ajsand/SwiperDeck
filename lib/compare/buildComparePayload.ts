import type { SQLiteDatabase } from 'expo-sqlite';

import { PREBUILT_DECK_VERSION } from '@/lib/content';
import {
  getDeckCardById,
  getDeckCardTagLinksByCardId,
  getDeckTagsByDeckId,
} from '@/lib/db';
import { createComparePayloadPolicy } from '@/lib/compare/comparePayloadPolicy';
import {
  canExportSupportingTag,
  createDeckSafetyRedactions,
  filterSensitiveThemeSummaryItems,
  filterSensitiveUnresolvedAreas,
  getDeckSafetyPolicy,
} from '@/lib/policy/deckSafetyPolicy';
import type {
  ComparePayloadEvidenceCard,
  ComparePayloadThemeSummaryItem,
  ComparePayloadUnresolvedArea,
  ComparePayloadV1,
  Deck,
  DeckCardId,
  DeckCompareReadiness,
  DeckProfileSummary,
  DeckTag,
  DeckTagId,
} from '@/types/domain';

type ComparePayloadDb = Pick<
  SQLiteDatabase,
  'runAsync' | 'getFirstAsync' | 'getAllAsync'
>;

interface BuildComparePayloadArgs {
  db: ComparePayloadDb;
  deck: Deck;
  summary: DeckProfileSummary;
  readiness: DeckCompareReadiness;
}

function toThemeSummaryItem(
  item: ComparePayloadThemeSummaryItem,
): ComparePayloadThemeSummaryItem {
  return {
    tagId: item.tagId,
    tag: item.tag,
    facet: item.facet,
    score: item.score,
    exposureCount: item.exposureCount,
    stability: item.stability,
  };
}

function interleaveCardIds(
  topLiked: DeckCardId[],
  topDisliked: DeckCardId[],
): Array<{ cardId: DeckCardId; leaning: 'affinity' | 'aversion' }> {
  const result: Array<{
    cardId: DeckCardId;
    leaning: 'affinity' | 'aversion';
  }> = [];
  const maxLength = Math.max(topLiked.length, topDisliked.length);

  for (let index = 0; index < maxLength; index += 1) {
    const likedCardId = topLiked[index];
    const dislikedCardId = topDisliked[index];

    if (likedCardId) {
      result.push({ cardId: likedCardId, leaning: 'affinity' });
    }

    if (dislikedCardId) {
      result.push({ cardId: dislikedCardId, leaning: 'aversion' });
    }
  }

  return result;
}

function selectSupportingTags(args: {
  cardTagIds: DeckTagId[];
  preferredTagIds: Set<DeckTagId>;
  tagById: Map<DeckTagId, DeckTag>;
}): { supportingTagIds: DeckTagId[]; supportingTags: string[] } {
  const preferred = args.cardTagIds.filter((tagId) =>
    args.preferredTagIds.has(tagId),
  );
  const selectedIds = (
    preferred.length > 0 ? preferred : args.cardTagIds
  ).slice(0, 2);

  return {
    supportingTagIds: selectedIds,
    supportingTags: selectedIds.map(
      (tagId) => args.tagById.get(tagId)?.label ?? (tagId as string),
    ),
  };
}

async function buildEvidenceCards(
  args: BuildComparePayloadArgs & {
    affinityItems: ComparePayloadThemeSummaryItem[];
    aversionItems: ComparePayloadThemeSummaryItem[];
    maxEvidenceCards: number;
    allowedSensitiveTagIds: ReadonlySet<DeckTagId>;
    deckSafetyPolicy: ReturnType<typeof getDeckSafetyPolicy>;
  },
): Promise<ComparePayloadEvidenceCard[]> {
  if (args.maxEvidenceCards <= 0) {
    return [];
  }

  const candidates = interleaveCardIds(
    args.summary.topCardsLiked,
    args.summary.topCardsDisliked,
  ).slice(0, args.maxEvidenceCards * 2);

  if (candidates.length === 0) {
    return [];
  }

  const deckTags = await getDeckTagsByDeckId(args.db, args.deck.id);
  const tagById = new Map(deckTags.map((tag) => [tag.id, tag] as const));
  const affinityTagIds = new Set(args.affinityItems.map((item) => item.tagId));
  const aversionTagIds = new Set(args.aversionItems.map((item) => item.tagId));

  const cards: ComparePayloadEvidenceCard[] = [];

  for (const candidate of candidates) {
    if (cards.length >= args.maxEvidenceCards) {
      break;
    }

    const [card, links] = await Promise.all([
      getDeckCardById(args.db, candidate.cardId),
      getDeckCardTagLinksByCardId(args.db, candidate.cardId),
    ]);

    if (!card || card.deckId !== args.deck.id) {
      continue;
    }

    const supporting = selectSupportingTags({
      cardTagIds: links
        .map((link) => link.tagId)
        .filter((tagId) =>
          canExportSupportingTag({
            policy: args.deckSafetyPolicy,
            tagId,
            allowedSensitiveTagIds: args.allowedSensitiveTagIds,
          }),
        ),
      preferredTagIds:
        candidate.leaning === 'affinity' ? affinityTagIds : aversionTagIds,
      tagById,
    });

    if (supporting.supportingTagIds.length === 0) {
      continue;
    }

    cards.push({
      cardId: card.id,
      kind: card.kind,
      title: card.title,
      subtitle: card.subtitle,
      leaning: candidate.leaning,
      reason:
        candidate.leaning === 'affinity'
          ? 'Grounds a strong positive theme summary.'
          : 'Grounds a contrast or aversion summary without exporting full swipe history.',
      supportingTagIds: supporting.supportingTagIds,
      supportingTags: supporting.supportingTags,
    });
  }

  return cards;
}

function toUnresolvedArea(
  item: ComparePayloadUnresolvedArea,
): ComparePayloadUnresolvedArea {
  return {
    tagId: item.tagId,
    tag: item.tag,
    facet: item.facet,
    reason: item.reason,
    uncertainty: item.uncertainty,
    exposureCount: item.exposureCount,
  };
}

export async function buildComparePayload(
  args: BuildComparePayloadArgs,
): Promise<ComparePayloadV1> {
  const { db, deck, summary, readiness } = args;
  const deckSafetyPolicy = getDeckSafetyPolicy(deck);

  if (deck.isCustom) {
    throw new Error(
      'Compare payload export is currently limited to shipped prebuilt decks.',
    );
  }

  if (!deck.compareEligible) {
    throw new Error('This deck is not eligible for compare export.');
  }

  if (!readiness.ready) {
    throw new Error('Compare payload export requires a compare-ready deck.');
  }

  const policy = createComparePayloadPolicy({
    deck,
    summary,
    readiness,
  });
  const filteredAffinities = filterSensitiveThemeSummaryItems(
    deckSafetyPolicy,
    summary.affinities,
  );
  const filteredAversions = filterSensitiveThemeSummaryItems(
    deckSafetyPolicy,
    summary.aversions,
  );
  const filteredUnresolved = filterSensitiveUnresolvedAreas(
    deckSafetyPolicy,
    summary.unresolved,
  );
  const allowedSensitiveTagIds = new Set<DeckTagId>([
    ...filteredAffinities.allowedSensitiveTagIds,
    ...filteredAversions.allowedSensitiveTagIds,
  ]);
  const affinities = filteredAffinities.kept
    .slice(0, policy.maxAffinityThemes)
    .map(toThemeSummaryItem);
  const aversions = filteredAversions.kept
    .slice(0, policy.maxAversionThemes)
    .map(toThemeSummaryItem);
  const unresolvedAreas = filteredUnresolved.kept
    .slice(0, policy.maxUnresolvedAreas)
    .map(toUnresolvedArea);
  const evidenceCards = await buildEvidenceCards({
    db,
    deck,
    summary,
    readiness,
    affinityItems: affinities,
    aversionItems: aversions,
    maxEvidenceCards: policy.maxEvidenceCards,
    allowedSensitiveTagIds,
    deckSafetyPolicy,
  });
  const redactions = [
    ...policy.redactions,
    ...createDeckSafetyRedactions({
      policy: deckSafetyPolicy,
      suppressedAffinityCount: filteredAffinities.suppressed.length,
      suppressedAversionCount: filteredAversions.suppressed.length,
      suppressedUnresolvedCount: filteredUnresolved.suppressed.length,
      evidenceSuppressed:
        policy.maxEvidenceCards === 0 &&
        summary.topCardsLiked.length + summary.topCardsDisliked.length > 0,
    }),
  ];
  const ambiguityRatio =
    summary.coverage.tags.totalTagCount > 0
      ? summary.coverage.tags.uncertainTagCount /
        summary.coverage.tags.totalTagCount
      : 0;

  return {
    schema: 'datedeck.compare_payload.v1',
    generatedAt: Date.now(),
    profileGeneratedAt: summary.generatedAt,
    deck: {
      deckId: deck.id,
      title: deck.title,
      category: deck.category,
      tier: deck.tier,
      sensitivity: deck.sensitivity,
      contentVersion: PREBUILT_DECK_VERSION,
    },
    readiness: {
      state: readiness.state,
      ready: readiness.ready,
      caution: readiness.caution,
      reasons: readiness.reasons.map((reason) => reason.reason),
      recommendedAction: readiness.recommendedAction,
    },
    confidence: {
      stage: summary.stage,
      value: summary.confidence.value,
      label: summary.confidence.label,
      swipeCount: summary.confidence.swipeCount,
      cardCoverage: summary.coverage.cardCoverage,
      tagCoverage: summary.coverage.tags.coverageRatio,
      facetCoverage: summary.coverage.facets.coverageRatio,
      stabilityScore: summary.stability.stabilityScore,
      ambiguityRatio,
    },
    coverage: {
      cardsSeen: summary.coverage.cardsSeen,
      totalCards: summary.coverage.totalCards,
      seenTagCount: summary.coverage.tags.seenTagCount,
      totalTagCount: summary.coverage.tags.totalTagCount,
      seenFacetCount: summary.coverage.facets.seenFacetCount,
      totalFacetCount: summary.coverage.facets.totalFacetCount,
    },
    affinities,
    aversions,
    unresolvedAreas,
    evidence: {
      mode: policy.evidenceMode,
      includedCardCount: evidenceCards.length,
      omittedRawCardCount: Math.max(
        0,
        summary.coverage.cardsSeen - evidenceCards.length,
      ),
      cards: evidenceCards,
    },
    policy: {
      ...policy,
      redactions: Array.from(new Set(redactions)),
    },
  };
}
