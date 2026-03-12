import type {
  Deck,
  DeckCompareReadiness,
  DeckProfileSummary,
  ComparePayloadPolicy,
} from '@/types/domain';
import { getDeckSafetyPolicy } from '@/lib/policy/deckSafetyPolicy';

export function createComparePayloadPolicy(args: {
  deck: Deck;
  summary: DeckProfileSummary;
  readiness: DeckCompareReadiness;
}): ComparePayloadPolicy {
  const { deck, summary, readiness } = args;
  const deckSafetyPolicy = getDeckSafetyPolicy(deck);
  const includeEvidenceCards =
    deckSafetyPolicy.payload.maxEvidenceCards > 0 &&
    (readiness.caution ||
      summary.stage !== 'high_confidence' ||
      summary.unresolved.length > 0);
  const maxEvidenceCards = includeEvidenceCards
    ? deckSafetyPolicy.payload.maxEvidenceCards
    : 0;

  return {
    cautionLevel: deckSafetyPolicy.cautionLevel,
    maxAffinityThemes: deckSafetyPolicy.payload.maxAffinityThemes,
    maxAversionThemes: deckSafetyPolicy.payload.maxAversionThemes,
    maxUnresolvedAreas: deckSafetyPolicy.payload.maxUnresolvedAreas,
    maxEvidenceCards,
    includeEvidenceCards,
    evidenceMode: includeEvidenceCards
      ? 'summary_with_minimal_evidence'
      : 'summary_only',
    aiMode: deckSafetyPolicy.report.aiMode,
    showdownAllowed: deckSafetyPolicy.showdown.allowed,
    safetyWarnings: [
      deckSafetyPolicy.warnings.consent,
      deckSafetyPolicy.warnings.report,
    ].filter((warning) => warning.length > 0),
    redactions: [
      'full_swipe_history',
      'full_card_catalog',
      'other_deck_state',
      'custom_or_imported_decks',
    ],
  };
}
