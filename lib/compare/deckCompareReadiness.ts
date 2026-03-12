import type {
  Deck,
  DeckCompareConsentDraft,
  DeckCompareReadiness,
  DeckCompareReadinessReason,
  DeckCompareReasonDetail,
  DeckProfileSummary,
} from '@/types/domain';
import { evaluateDeckSafetyReadiness } from '@/lib/policy/deckSafetyPolicy';

interface EvaluateDeckCompareReadinessInput {
  deck: Deck;
  summary: DeckProfileSummary | null;
}

function reasonDetail(
  reason: DeckCompareReadinessReason,
): DeckCompareReasonDetail {
  switch (reason) {
    case 'deck_policy_blocked':
      return {
        reason,
        title: 'Deck policy blocks compare',
        detail:
          'This deck is not currently eligible for a compare flow under the current product rules.',
      };
    case 'custom_deck_not_supported':
      return {
        reason,
        title: 'Custom deck compare is not supported yet',
        detail:
          'Advanced compare support is currently limited to shipped prebuilt decks with richer structure and safeguards.',
      };
    case 'no_profile_signal':
      return {
        reason,
        title: 'No local profile signal yet',
        detail:
          'You need to swipe cards in this deck before the app can judge compare readiness.',
      };
    case 'not_enough_swipes':
      return {
        reason,
        title: 'More swipes needed',
        detail:
          'This deck does not yet have enough deck-specific signal to support a trustworthy compare.',
      };
    case 'not_enough_card_coverage':
      return {
        reason,
        title: 'Card coverage is too narrow',
        detail:
          'The profile needs broader card coverage so the compare result is not built from a small slice of the deck.',
      };
    case 'not_enough_tag_coverage':
      return {
        reason,
        title: 'Theme coverage is too narrow',
        detail:
          'The app has not seen enough themes inside this deck to compare it confidently.',
      };
    case 'not_enough_facet_coverage':
      return {
        reason,
        title: 'Deck sub-areas are undercovered',
        detail:
          'More breadth is needed across the main facets of this deck before compare should unlock.',
      };
    case 'high_ambiguity':
      return {
        reason,
        title: 'Too much ambiguity remains',
        detail:
          'The current profile still has enough mixed or low-confidence signal that compare output would overclaim certainty.',
      };
    case 'retest_needed':
      return {
        reason,
        title: 'Stability checks are still pending',
        detail:
          'Some important areas still need reaffirmation before the compare result is stable enough to trust.',
      };
    case 'sensitive_threshold_not_met':
      return {
        reason,
        title: 'Sensitive deck thresholds are not met yet',
        detail:
          'This deck needs stronger confidence, broader coverage, or less ambiguity before compare should unlock safely.',
      };
    case 'sensitive_tag_caution':
      return {
        reason,
        title: 'Some themes need extra care',
        detail:
          'This deck includes guarded themes that may stay partially hidden or more tentative until the signal is stronger.',
      };
    case 'sensitive_deck':
      return {
        reason,
        title: 'Sensitive deck caution',
        detail:
          'This deck can still be compared, but the flow should emphasize consent, care, and uncertainty.',
      };
    case 'gated_deck':
      return {
        reason,
        title: 'Gated deck caution',
        detail:
          'This deck requires an extra-care compare flow because the category is more sensitive than the standard launch decks.',
      };
    default:
      return {
        reason,
        title: reason,
        detail: reason,
      };
  }
}

function stateTitle(state: DeckCompareReadiness['state']): string {
  switch (state) {
    case 'not_started':
      return 'Compare not started';
    case 'early_profile':
      return 'Compare is still early';
    case 'needs_more_breadth':
      return 'More breadth is needed';
    case 'needs_more_stability':
      return 'More stability is needed';
    case 'compare_ready':
      return 'Compare ready';
    case 'compare_ready_with_caution':
      return 'Compare ready with caution';
    case 'unavailable':
      return 'Compare unavailable';
    default:
      return 'Compare status';
  }
}

function stateDetail(state: DeckCompareReadiness['state'], deck: Deck): string {
  switch (state) {
    case 'not_started':
      return 'Start swiping this deck first. The app keeps compare local and deck-scoped until there is real signal to work with.';
    case 'early_profile':
      return `This deck has some signal, but it is still below the level needed for a comparison that feels fair and useful. ${deck.minCardsForCompare} swipes is only the baseline.`;
    case 'needs_more_breadth':
      return 'This deck has a profile, but it still needs broader coverage across cards, tags, or facets before compare should unlock.';
    case 'needs_more_stability':
      return 'This deck has enough breadth to be interesting, but it still needs more stability or less ambiguity before compare should unlock.';
    case 'compare_ready':
      return 'This deck has enough breadth, confidence, and stability for a deck-scoped compare flow.';
    case 'compare_ready_with_caution':
      return 'This deck is locally ready, but the compare flow should use stronger disclosure and care because the deck is more sensitive.';
    case 'unavailable':
      return 'This deck is not eligible for compare under the current product scope.';
    default:
      return 'Compare readiness could not be determined.';
  }
}

export function evaluateDeckCompareReadiness(
  input: EvaluateDeckCompareReadinessInput,
): DeckCompareReadiness {
  const { deck, summary } = input;
  const safety = evaluateDeckSafetyReadiness({
    deck,
    summary,
  });

  if (deck.isCustom) {
    const reasons = [reasonDetail('custom_deck_not_supported')];
    return {
      deckId: deck.id,
      state: 'unavailable',
      ready: false,
      caution: false,
      title: stateTitle('unavailable'),
      detail: stateDetail('unavailable', deck),
      reasons,
      recommendedAction:
        'Use a shipped prebuilt deck for compare until custom-deck compare support lands.',
    };
  }

  if (!deck.compareEligible) {
    const reasons = [reasonDetail('deck_policy_blocked')];
    return {
      deckId: deck.id,
      state: 'unavailable',
      ready: false,
      caution: false,
      title: stateTitle('unavailable'),
      detail: stateDetail('unavailable', deck),
      reasons,
      recommendedAction: 'Choose a different compare-eligible deck.',
    };
  }

  if (!summary || summary.confidence.swipeCount === 0) {
    const reasons = [reasonDetail('no_profile_signal')];
    return {
      deckId: deck.id,
      state: 'not_started',
      ready: false,
      caution: false,
      title: stateTitle('not_started'),
      detail: stateDetail('not_started', deck),
      reasons,
      recommendedAction:
        'Swipe through this deck first so a local profile can form.',
    };
  }

  const reasons = summary.readiness.blockers.map((blocker) =>
    reasonDetail(blocker),
  );
  const ambiguityRatio =
    summary.coverage.tags.totalTagCount > 0
      ? summary.coverage.tags.uncertainTagCount /
        summary.coverage.tags.totalTagCount
      : 0;

  const needsBreadth = summary.readiness.blockers.some((blocker) =>
    [
      'not_enough_card_coverage',
      'not_enough_tag_coverage',
      'not_enough_facet_coverage',
    ].includes(blocker),
  );
  const needsStability = summary.readiness.blockers.some((blocker) =>
    ['high_ambiguity', 'retest_needed'].includes(blocker),
  );
  const policyNeedsBreadth =
    summary.coverage.tags.coverageRatio <
      safety.policy.compare.minTagCoverage ||
    summary.coverage.facets.coverageRatio <
      safety.policy.compare.minFacetCoverage;
  const policyNeedsStability =
    summary.confidence.value < safety.policy.compare.minConfidence ||
    ambiguityRatio > safety.policy.compare.maxAmbiguityRatio ||
    (safety.policy.compare.requireRetestSettled &&
      summary.stability.retestPendingCount > 0);

  let state: DeckCompareReadiness['state'];
  if (summary.readiness.compareReady && !safety.blockedByDeckPolicy) {
    state = safety.caution ? 'compare_ready_with_caution' : 'compare_ready';
  } else if (safety.blockedByDeckPolicy && policyNeedsBreadth) {
    state = 'needs_more_breadth';
  } else if (safety.blockedByDeckPolicy && policyNeedsStability) {
    state = 'needs_more_stability';
  } else if (summary.stage === 'lightweight') {
    state = 'early_profile';
  } else if (needsBreadth) {
    state = 'needs_more_breadth';
  } else if (needsStability) {
    state = 'needs_more_stability';
  } else {
    state = 'early_profile';
  }

  if (deck.sensitivity === 'sensitive') {
    reasons.push(reasonDetail('sensitive_deck'));
  } else if (deck.sensitivity === 'gated') {
    reasons.push(reasonDetail('gated_deck'));
  } else if (safety.policy.cautionLevel !== 'standard') {
    reasons.push(reasonDetail('sensitive_deck'));
  }

  for (const reason of safety.additionalReasons) {
    reasons.push(reasonDetail(reason));
  }

  const primaryHint =
    safety.blockedByDeckPolicy && safety.policy.warnings.readiness
      ? safety.policy.warnings.readiness
      : (summary.nextSteps[0]?.detail ??
        (state === 'needs_more_breadth'
          ? 'Cover more themes inside this deck before comparing.'
          : state === 'needs_more_stability'
            ? 'Revisit uncertain areas before comparing.'
            : 'Keep building this deck profile first.'));

  return {
    deckId: deck.id,
    state,
    ready: state === 'compare_ready' || state === 'compare_ready_with_caution',
    caution: state === 'compare_ready_with_caution',
    title: stateTitle(state),
    detail: stateDetail(state, deck),
    reasons: reasons.filter(
      (reason, index, allReasons) =>
        allReasons.findIndex((item) => item.reason === reason.reason) === index,
    ),
    recommendedAction: primaryHint,
  };
}

export function buildDeckCompareConsentDraft(args: {
  deck: Deck;
  summary: DeckProfileSummary;
  readiness: DeckCompareReadiness;
}): DeckCompareConsentDraft {
  const { deck, summary, readiness } = args;
  const safety = evaluateDeckSafetyReadiness({
    deck,
    summary,
  });

  const caution =
    readiness.state === 'compare_ready_with_caution'
      ? safety.policy.warnings.consent ||
        (deck.sensitivity === 'gated'
          ? 'This is a gated deck. Keep the compare in person, scoped to this deck, and avoid overclaiming certainty from sensitive areas.'
          : 'This deck uses extra-care compare safeguards. Keep the compare warm, uncertainty-aware, and clearly scoped.')
      : null;

  return {
    deckId: deck.id,
    readinessState: readiness.state,
    disclosure:
      'No data leaves the device until both people intentionally use this deck-scoped compare flow. This screen is the disclosure preview before any later export or report step.',
    caution,
    exportPreview: [
      {
        category: 'deck_metadata',
        title: 'Deck scope and version context',
        detail:
          'The deck identity, category, and bundled version context for this one deck only.',
      },
      {
        category: 'confidence_summary',
        title: 'Confidence and readiness metadata',
        detail:
          'Local confidence, coverage, ambiguity, and readiness signals that explain how trustworthy the compare would be.',
      },
      {
        category: 'theme_summary',
        title: 'Theme and tag summaries',
        detail:
          safety.sensitiveTagIds.length > 0
            ? 'Structured affinities, aversions, and within-deck theme summaries derived from local tag-aware profile state, with guarded themes withheld until the signal is stronger.'
            : 'Structured affinities, aversions, and within-deck theme summaries derived from local tag-aware profile state.',
      },
      {
        category: 'unresolved_areas',
        title: 'Low-confidence and unresolved areas',
        detail:
          'Any ambiguous or undercovered zones that the later compare report should treat cautiously.',
      },
      {
        category: 'minimal_card_examples',
        title: 'Minimal raw card anchors',
        detail:
          safety.policy.payload.maxEvidenceCards === 0
            ? 'No raw card anchors should leave the device for this deck unless a later policy explicitly allows them.'
            : 'Only small grounded card examples when needed so later compare/report output stays tied to real deck evidence.',
      },
    ],
    keepsLocal: [
      'Full swipe history and event timeline',
      'Other decks and unrelated profile state',
      'Custom decks and imported decks',
      'Any future notes or metadata outside this deck',
    ],
    confirmations: [
      {
        id: 'same_deck',
        label: 'I am intentionally comparing this exact deck.',
        detail:
          'Compare stays scoped to one deck at a time. It is not a whole-person compatibility verdict.',
      },
      {
        id: 'explicit_consent',
        label:
          'Both people must explicitly consent before any external compare step.',
        detail:
          'This app does not support hidden comparison, passive lookup, or public sharing.',
      },
      {
        id: 'export_preview',
        label: 'I reviewed what would leave the device.',
        detail:
          'The compare flow should export only deck-scoped summaries and minimal grounding detail.',
      },
    ],
  };
}
