import type {
  ComparePayloadPreview,
  ComparePayloadV1,
  DeckCompareExportPreviewItem,
} from '@/types/domain';

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function buildPreviewCategories(
  payload: ComparePayloadV1,
): DeckCompareExportPreviewItem[] {
  const sensitiveThemeSuppressed = payload.policy.redactions.includes(
    'sensitive_low_confidence_theme_summaries',
  );
  const sensitiveUnresolvedSuppressed = payload.policy.redactions.includes(
    'sensitive_unresolved_areas',
  );
  const evidenceSuppressed = payload.policy.redactions.includes(
    'sensitive_card_evidence_omitted',
  );

  return [
    {
      category: 'deck_metadata',
      title: 'Deck scope and version context',
      detail: `${payload.deck.title} only. Category ${payload.deck.category}, tier ${payload.deck.tier}, content v${payload.deck.contentVersion}.`,
    },
    {
      category: 'confidence_summary',
      title: 'Confidence and readiness metadata',
      detail: `${payload.readiness.state} with ${formatPercent(payload.confidence.value)} confidence, ${payload.confidence.swipeCount} swipes, ${formatPercent(payload.confidence.tagCoverage)} tag coverage, and ${formatPercent(payload.confidence.facetCoverage)} facet coverage.`,
    },
    {
      category: 'theme_summary',
      title: 'Theme and tag summaries',
      detail: sensitiveThemeSuppressed
        ? `${payload.affinities.length} affinities and ${payload.aversions.length} aversions exported, with some guarded low-confidence themes withheld for safety.`
        : `${payload.affinities.length} affinities and ${payload.aversions.length} aversions exported as canonical tag summaries instead of raw card dumps.`,
    },
    {
      category: 'unresolved_areas',
      title: 'Low-confidence and unresolved areas',
      detail: sensitiveUnresolvedSuppressed
        ? `${payload.unresolvedAreas.length} unresolved areas included, while some sensitive uncertain areas stay local until the signal is stronger.`
        : payload.unresolvedAreas.length > 0
          ? `${payload.unresolvedAreas.length} unresolved areas included so later compare output can admit uncertainty.`
          : 'No unresolved areas included for this export.',
    },
    {
      category: 'minimal_card_examples',
      title: 'Minimal raw card anchors',
      detail:
        payload.evidence.mode === 'summary_only'
          ? evidenceSuppressed
            ? 'No raw card examples included. This deck uses stricter safeguards, so sensitive card-level anchors stay local.'
            : 'No raw card examples included. Local summaries were strong enough to avoid shipping card-level detail.'
          : evidenceSuppressed
            ? `${payload.evidence.cards.length} guarded evidence card example${payload.evidence.cards.length === 1 ? '' : 's'} included after suppressing more sensitive card-level detail.`
            : `${payload.evidence.cards.length} minimal evidence card example${payload.evidence.cards.length === 1 ? '' : 's'} included while omitting ${payload.evidence.omittedRawCardCount} other swiped card details.`,
    },
  ];
}

export function buildComparePayloadPreview(
  payload: ComparePayloadV1,
): ComparePayloadPreview {
  return {
    deckId: payload.deck.deckId,
    generatedAt: payload.generatedAt,
    categories: buildPreviewCategories(payload),
    debugSummary: {
      summaryLine:
        payload.policy.safetyWarnings.length > 0
          ? `${payload.affinities.length} affinities, ${payload.aversions.length} aversions, ${payload.unresolvedAreas.length} unresolved areas, ${payload.evidence.cards.length} evidence cards. Extra-care safeguards are active.`
          : `${payload.affinities.length} affinities, ${payload.aversions.length} aversions, ${payload.unresolvedAreas.length} unresolved areas, ${payload.evidence.cards.length} evidence cards.`,
      affinityCount: payload.affinities.length,
      aversionCount: payload.aversions.length,
      unresolvedCount: payload.unresolvedAreas.length,
      evidenceCardCount: payload.evidence.cards.length,
      evidenceMode: payload.evidence.mode,
    },
  };
}
