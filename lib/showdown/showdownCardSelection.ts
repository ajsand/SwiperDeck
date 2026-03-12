import { getSensitiveTagRule } from '@/lib/policy/deckSafetyPolicy';
import type { DeckSafetyPolicy } from '@/types/domain/deckSafetyPolicy';
import type { Deck, DeckCard } from '@/types/domain/decks';
import type { DeckCardTagLink, DeckTag, DeckTagFacet } from '@/types/domain';
import type { DeckTagFacetId, DeckTagId } from '@/types/domain/ids';
import {
  createShowdownSelectedCard,
  type ShowdownSelectedCard,
} from '@/types/domain/showdown';

export interface ShowdownCardSelectionResult {
  available: boolean;
  reason: string | null;
  selectedCards: ShowdownSelectedCard[];
  excludedCardCount: number;
}

interface ShowdownCandidate {
  card: DeckCard;
  primaryTagId: DeckTagId | null;
  primaryTagLabel: string | null;
  facetId: DeckTagFacetId | null;
  facetLabel: string | null;
}

function sortCardsByEditorialFallback(cards: DeckCard[]): DeckCard[] {
  return [...cards].sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder;
    }

    if (left.popularity !== right.popularity) {
      return right.popularity - left.popularity;
    }

    return String(left.id).localeCompare(String(right.id));
  });
}

function getPrimaryTagId(links: DeckCardTagLink[]): DeckTagId | null {
  const primary = links.find((link) => link.role === 'primary');
  return primary?.tagId ?? links[0]?.tagId ?? null;
}

function buildCandidates(args: {
  cards: DeckCard[];
  tags: DeckTag[];
  facets: DeckTagFacet[];
  cardTagLinksByCardId: Map<string, DeckCardTagLink[]>;
  policy: DeckSafetyPolicy;
}): {
  candidates: ShowdownCandidate[];
  excludedCardCount: number;
} {
  const tagsById = new Map(
    args.tags.map((tag) => [tag.id as string, tag] as const),
  );
  const facetsById = new Map(
    args.facets.map((facet) => [facet.id as string, facet] as const),
  );

  const candidates: ShowdownCandidate[] = [];
  let excludedCardCount = 0;

  for (const card of sortCardsByEditorialFallback(args.cards)) {
    const links = args.cardTagLinksByCardId.get(card.id as string) ?? [];
    const hasSensitiveTag = links.some(
      (link) => getSensitiveTagRule(args.policy, link.tagId) !== null,
    );

    if (hasSensitiveTag) {
      excludedCardCount += 1;
      continue;
    }

    const primaryTagId = getPrimaryTagId(links);
    const primaryTag = primaryTagId
      ? (tagsById.get(primaryTagId as string) ?? null)
      : null;
    const facet = primaryTag
      ? (facetsById.get(primaryTag.facetId as string) ?? null)
      : null;

    candidates.push({
      card,
      primaryTagId,
      primaryTagLabel: primaryTag?.label ?? null,
      facetId: facet?.id ?? null,
      facetLabel: facet?.label ?? null,
    });
  }

  return {
    candidates,
    excludedCardCount,
  };
}

function calculateEditorialScore(card: DeckCard, maxSortOrder: number): number {
  const sortOrderScore =
    maxSortOrder >= 0 ? (1 - card.sortOrder / (maxSortOrder + 1)) * 5 : 5;

  return card.popularity * 8 + sortOrderScore;
}

function calculateCandidateScore(args: {
  candidate: ShowdownCandidate;
  maxSortOrder: number;
  selectedTagCounts: Map<string, number>;
  selectedFacetCounts: Map<string, number>;
  recentTagIds: string[];
  recentFacetIds: string[];
}): {
  score: number;
  reason: string;
} {
  const editorialScore = calculateEditorialScore(
    args.candidate.card,
    args.maxSortOrder,
  );
  const tagCount = args.candidate.primaryTagId
    ? (args.selectedTagCounts.get(args.candidate.primaryTagId as string) ?? 0)
    : 0;
  const facetCount = args.candidate.facetId
    ? (args.selectedFacetCounts.get(args.candidate.facetId as string) ?? 0)
    : 0;
  const facetCoverageBoost = args.candidate.facetId
    ? facetCount === 0
      ? 22
      : 6 / (1 + facetCount)
    : 4;
  const tagCoverageBoost = args.candidate.primaryTagId
    ? tagCount === 0
      ? 14
      : 4 / (1 + tagCount)
    : 2;
  const recentTagPenalty =
    args.candidate.primaryTagId &&
    args.recentTagIds.includes(args.candidate.primaryTagId as string)
      ? 12
      : 0;
  const recentFacetPenalty =
    args.candidate.facetId &&
    args.recentFacetIds.includes(args.candidate.facetId as string)
      ? 8
      : 0;
  const totalScore =
    editorialScore +
    facetCoverageBoost +
    tagCoverageBoost -
    recentTagPenalty -
    recentFacetPenalty;

  if (facetCount === 0 && args.candidate.facetLabel) {
    return {
      score: totalScore,
      reason: `facet_coverage:${args.candidate.facetLabel}`,
    };
  }

  if (tagCount === 0 && args.candidate.primaryTagLabel) {
    return {
      score: totalScore,
      reason: `tag_variety:${args.candidate.primaryTagLabel}`,
    };
  }

  return {
    score: totalScore,
    reason: 'editorial_anchor',
  };
}

export function selectShowdownCards(args: {
  deck: Deck;
  cards: DeckCard[];
  tags: DeckTag[];
  facets: DeckTagFacet[];
  cardTagLinksByCardId: Map<string, DeckCardTagLink[]>;
  policy: DeckSafetyPolicy;
  desiredCardCount: number;
}): ShowdownCardSelectionResult {
  if (!args.policy.showdown.allowed) {
    return {
      available: false,
      reason:
        args.policy.showdown.reason ??
        'This deck is not eligible for showdown under the current policy.',
      selectedCards: [],
      excludedCardCount: 0,
    };
  }

  if (args.deck.isCustom) {
    return {
      available: false,
      reason:
        'Custom decks are not eligible for showdown under the current product scope.',
      selectedCards: [],
      excludedCardCount: 0,
    };
  }

  const { candidates, excludedCardCount } = buildCandidates(args);

  if (candidates.length === 0) {
    return {
      available: false,
      reason:
        'No showdown-safe cards remain after deck policy exclusions for this deck.',
      selectedCards: [],
      excludedCardCount,
    };
  }

  const maxSortOrder = candidates.reduce(
    (maxValue, candidate) => Math.max(maxValue, candidate.card.sortOrder),
    0,
  );
  const selectedTagCounts = new Map<string, number>();
  const selectedFacetCounts = new Map<string, number>();
  const selectedCards: ShowdownSelectedCard[] = [];
  const remaining = [...candidates];

  while (selectedCards.length < args.desiredCardCount && remaining.length > 0) {
    const recentSelections = selectedCards.slice(-2);
    const recentTagIds = recentSelections
      .map((entry) => entry.primaryTagId)
      .filter(Boolean) as string[];
    const recentFacetIds = recentSelections
      .map((entry) => entry.facetId)
      .filter(Boolean) as string[];
    const ranked = remaining
      .map((candidate) => {
        const score = calculateCandidateScore({
          candidate,
          maxSortOrder,
          selectedTagCounts,
          selectedFacetCounts,
          recentTagIds,
          recentFacetIds,
        });

        return {
          candidate,
          ...score,
        };
      })
      .sort((left, right) => {
        if (left.score !== right.score) {
          return right.score - left.score;
        }

        if (left.candidate.card.sortOrder !== right.candidate.card.sortOrder) {
          return left.candidate.card.sortOrder - right.candidate.card.sortOrder;
        }

        return String(left.candidate.card.id).localeCompare(
          String(right.candidate.card.id),
        );
      });

    const winner = ranked[0];

    if (!winner) {
      break;
    }

    selectedCards.push(
      createShowdownSelectedCard({
        card: winner.candidate.card,
        primaryTagId: winner.candidate.primaryTagId,
        primaryTagLabel: winner.candidate.primaryTagLabel,
        facetId: winner.candidate.facetId,
        facetLabel: winner.candidate.facetLabel,
        selectionScore: winner.score,
        selectionReason: winner.reason,
      }),
    );

    if (winner.candidate.primaryTagId) {
      const key = winner.candidate.primaryTagId as string;
      selectedTagCounts.set(key, (selectedTagCounts.get(key) ?? 0) + 1);
    }

    if (winner.candidate.facetId) {
      const key = winner.candidate.facetId as string;
      selectedFacetCounts.set(key, (selectedFacetCounts.get(key) ?? 0) + 1);
    }

    remaining.splice(
      remaining.findIndex(
        (candidate) => candidate.card.id === winner.candidate.card.id,
      ),
      1,
    );
  }

  return {
    available: selectedCards.length > 0,
    reason: selectedCards.length > 0 ? null : 'No showdown cards available.',
    selectedCards,
    excludedCardCount,
  };
}
