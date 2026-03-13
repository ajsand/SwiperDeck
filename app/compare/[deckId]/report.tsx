import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useDeckCompareReadiness } from '@/hooks/useDeckCompareReadiness';
import { generateCompareReport } from '@/lib/ai/compareReportClient';
import {
  buildDeckCompareConsentApprovalBasis,
  hasDeckCompareConsentApproval,
} from '@/lib/compare/compareConsentSession';
import { parseComparePayloadInput } from '@/lib/compare/parseComparePayloadInput';
import {
  getCompareConsentRoute,
  getDeckBrowserRoute,
  getDeckCompareRoute,
} from '@/lib/navigation/appShell';
import {
  asDeckId,
  type ComparePayloadV1,
  type DeckCompareReport,
} from '@/types/domain';

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export default function CompareReportScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    deckId?: string | string[];
    approval?: string | string[];
  }>();
  const routeDeckId = Array.isArray(params.deckId)
    ? params.deckId[0]
    : params.deckId;
  const routeApprovalId = Array.isArray(params.approval)
    ? params.approval[0]
    : params.approval;
  const deckId = routeDeckId ? asDeckId(routeDeckId) : null;
  const {
    deck,
    readiness,
    payload,
    payloadPreview,
    loading,
    error,
    payloadLoading,
    payloadError,
    refetch,
  } = useDeckCompareReadiness(deckId);
  const [partnerPayloadText, setPartnerPayloadText] = useState('');
  const [showLocalPayload, setShowLocalPayload] = useState(false);
  const [report, setReport] = useState<DeckCompareReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const activeReportRequestRef = useRef(0);
  const isMountedRef = useRef(true);
  const consentApprovalBasis = useMemo(
    () => buildDeckCompareConsentApprovalBasis(payload),
    [payload],
  );

  const consentApproved = useMemo(() => {
    if (!deckId) {
      return false;
    }

    return hasDeckCompareConsentApproval({
      deckId,
      approvalId: routeApprovalId ?? null,
      basis: consentApprovalBasis,
    });
  }, [consentApprovalBasis, deckId, routeApprovalId]);

  const localPayloadText = useMemo(
    () => (payload ? JSON.stringify(payload, null, 2) : ''),
    [payload],
  );

  const partnerPayloadPreview = useMemo(() => {
    if (partnerPayloadText.trim().length === 0) {
      return {
        payload: null as ComparePayloadV1 | null,
        error: null as string | null,
      };
    }

    try {
      return {
        payload: parseComparePayloadInput(partnerPayloadText),
        error: null,
      };
    } catch (parseError) {
      return {
        payload: null,
        error:
          parseError instanceof Error
            ? parseError.message
            : 'Unable to parse the pasted compare payload.',
      };
    }
  }, [partnerPayloadText]);

  const partnerPayloadIssue = useMemo(() => {
    if (!payload || !partnerPayloadPreview.payload) {
      return null;
    }

    if (!partnerPayloadPreview.payload.readiness.ready) {
      return 'The pasted payload is not compare-ready yet. Both people need a compare-ready deck profile before generating a report.';
    }

    if (partnerPayloadPreview.payload.deck.deckId !== payload.deck.deckId) {
      return 'The pasted payload is for a different deck. Compare must stay scoped to the same deck on both devices.';
    }

    if (
      partnerPayloadPreview.payload.deck.contentVersion !==
      payload.deck.contentVersion
    ) {
      return 'The pasted payload was built from a different deck version. Re-export both payloads from the same bundled deck version first.';
    }

    return null;
  }, [partnerPayloadPreview.payload, payload]);

  useEffect(() => {
    setPartnerPayloadText('');
    setShowLocalPayload(false);
  }, [deckId, routeDeckId]);

  useEffect(() => {
    activeReportRequestRef.current += 1;
    setReport(null);
    setReportError(null);
    setReportLoading(false);
  }, [
    deckId,
    consentApproved,
    deck?.id,
    payload?.generatedAt,
    payload?.profileGeneratedAt,
    routeApprovalId,
  ]);

  useEffect(() => {
    activeReportRequestRef.current += 1;
    setReport(null);
    setReportError(null);
    setReportLoading(false);
  }, [partnerPayloadText]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      activeReportRequestRef.current += 1;
    };
  }, []);

  const handleGenerateReport = async () => {
    if (!payload || !deck) {
      setReport(null);
      setReportError('Your local compare payload is not ready yet.');
      return;
    }

    if (!consentApproved) {
      setReport(null);
      setReportError(
        'Review compare consent first so this deck-scoped report stays explicit and local-first.',
      );
      return;
    }

    if (!partnerPayloadText.trim()) {
      setReport(null);
      setReportError(
        "Paste the other person's deck-scoped compare payload first.",
      );
      return;
    }

    if (
      partnerPayloadPreview.error ||
      partnerPayloadIssue ||
      !partnerPayloadPreview.payload
    ) {
      setReport(null);
      setReportError(
        partnerPayloadIssue ??
          partnerPayloadPreview.error ??
          'The pasted compare payload could not be parsed.',
      );
      return;
    }

    setReportLoading(true);
    setReport(null);
    setReportError(null);
    const requestId = activeReportRequestRef.current + 1;
    activeReportRequestRef.current = requestId;

    try {
      const nextReport = await generateCompareReport({
        selfPayload: payload,
        otherPayload: partnerPayloadPreview.payload,
      });

      if (
        !isMountedRef.current ||
        activeReportRequestRef.current !== requestId
      ) {
        return;
      }

      setReport(nextReport);
    } catch (nextError) {
      if (
        !isMountedRef.current ||
        activeReportRequestRef.current !== requestId
      ) {
        return;
      }

      setReport(null);
      setReportError(
        nextError instanceof Error
          ? nextError.message
          : 'Unable to generate the compare report.',
      );
    } finally {
      if (
        !isMountedRef.current ||
        activeReportRequestRef.current !== requestId
      ) {
        return;
      }

      setReportLoading(false);
    }
  };

  if (!routeDeckId) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Compare Report' }} />
        <View style={styles.stateContainer}>
          <Text style={styles.stateTitle}>No deck selected</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace(getDeckBrowserRoute() as never)}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed ? styles.buttonPressed : null,
            ]}
          >
            <Text style={styles.primaryButtonText}>Back to Decks</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (loading || payloadLoading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Compare Report' }} />
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.stateTitle}>Preparing compare report...</Text>
        </View>
      </View>
    );
  }

  const combinedError = error ?? payloadError;

  if (combinedError) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Compare Report' }} />
        <View style={styles.stateContainer}>
          <Text style={styles.stateTitle}>
            Unable to prepare compare report
          </Text>
          <Text style={styles.stateMessage}>{combinedError}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void refetch()}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed ? styles.buttonPressed : null,
            ]}
          >
            <Text style={styles.primaryButtonText}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!deck || !readiness || !payload) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Compare Report' }} />
        <View style={styles.stateContainer}>
          <Text style={styles.stateTitle}>Compare report is not ready yet</Text>
          <Text style={styles.stateMessage}>
            This deck still needs a compare-ready local payload before a report
            can be generated.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              router.replace(getDeckCompareRoute(routeDeckId) as never)
            }
            style={({ pressed }) => [
              styles.primaryButton,
              pressed ? styles.buttonPressed : null,
            ]}
          >
            <Text style={styles.primaryButtonText}>Back to Readiness</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!consentApproved) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Compare Report' }} />
        <View style={styles.stateContainer}>
          <Text style={styles.stateTitle}>Consent approval is required</Text>
          <Text style={styles.stateMessage}>
            Review the deck-scoped export disclosure first. The report flow only
            continues when consent is explicit for this deck and this compare
            attempt.
          </Text>
          <Pressable
            testID="compare-report-back-to-consent"
            accessibilityRole="button"
            onPress={() =>
              router.replace(getCompareConsentRoute(routeDeckId) as never)
            }
            style={({ pressed }) => [
              styles.primaryButton,
              pressed ? styles.buttonPressed : null,
            ]}
          >
            <Text style={styles.primaryButtonText}>Back to Consent</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Compare Report' }} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerCard}>
          <Text style={styles.eyebrow}>{deck.title}</Text>
          <Text style={styles.headerTitle}>One-to-one compare report</Text>
          <Text style={styles.headerBody}>
            This report stays scoped to one deck. Start by sharing your local
            export, then paste the other person&apos;s export for this same
            deck.
          </Text>
          <View style={styles.metricRow}>
            <View style={styles.metricChip}>
              <Text style={styles.metricChipLabel}>
                {payloadPreview?.debugSummary.summaryLine ??
                  'Local payload ready'}
              </Text>
            </View>
            <View style={styles.metricChip}>
              <Text style={styles.metricChipLabel}>
                {formatPercent(payload.confidence.value)} confidence
              </Text>
            </View>
          </View>
        </View>

        {payload.policy.safetyWarnings.length > 0 ? (
          <View style={styles.noticeCard}>
            <Text style={styles.noticeTitle}>Extra-care safeguards</Text>
            <Text style={styles.noticeBody}>
              {payload.policy.safetyWarnings[0]}
            </Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your deck export</Text>
          <Text style={styles.sectionBody}>
            Share only this deck-scoped bundle with someone who intentionally
            chose the same deck. The report uses this minimized payload, not
            your full swipe history.
          </Text>
          <Pressable
            testID="compare-report-toggle-local-payload"
            accessibilityRole="button"
            onPress={() => setShowLocalPayload((current) => !current)}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed ? styles.buttonPressed : null,
            ]}
          >
            <Text style={styles.secondaryButtonText}>
              {showLocalPayload ? 'Hide Local Export' : 'Show Local Export'}
            </Text>
          </Pressable>
          {showLocalPayload ? (
            <View style={styles.codeCard}>
              <Text selectable style={styles.codeText}>
                {localPayloadText}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Paste the other person&apos;s export
          </Text>
          <Text style={styles.sectionBody}>
            The pasted payload must come from the same deck after that person
            reviewed consent on their own device.
          </Text>
          <TextInput
            testID="compare-report-partner-payload-input"
            accessibilityLabel="Other person compare payload"
            multiline
            numberOfLines={10}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Paste a DateDeck compare payload JSON export here."
            placeholderTextColor="rgba(255,255,255,0.35)"
            style={styles.input}
            value={partnerPayloadText}
            onChangeText={setPartnerPayloadText}
          />
          {partnerPayloadPreview.error || partnerPayloadIssue ? (
            <Text style={styles.inlineError}>
              {partnerPayloadIssue ?? partnerPayloadPreview.error}
            </Text>
          ) : partnerPayloadPreview.payload ? (
            <View style={styles.previewCard}>
              <Text style={styles.previewTitle}>
                Pasted payload looks valid
              </Text>
              <Text style={styles.previewBody}>
                {partnerPayloadPreview.payload.deck.title} with{' '}
                {formatPercent(partnerPayloadPreview.payload.confidence.value)}{' '}
                confidence and {partnerPayloadPreview.payload.affinities.length}{' '}
                affinity themes.
              </Text>
            </View>
          ) : null}
        </View>

        <Pressable
          testID="compare-report-generate"
          accessibilityRole="button"
          accessibilityLabel="Generate compare report"
          onPress={() => void handleGenerateReport()}
          style={({ pressed }) => [
            styles.primaryButton,
            reportLoading ? styles.primaryButtonDisabled : null,
            pressed ? styles.buttonPressed : null,
          ]}
        >
          <Text style={styles.primaryButtonText}>
            {reportLoading ? 'Generating Report...' : 'Generate Compare Report'}
          </Text>
        </Pressable>

        {reportError ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Compare report blocked</Text>
            <Text style={styles.errorBody}>{reportError}</Text>
          </View>
        ) : null}

        {report ? (
          <View testID="compare-report-output" style={styles.reportCard}>
            <Text style={styles.reportEyebrow}>
              {report.source.kind === 'ai'
                ? `AI summary via ${report.source.model}`
                : 'Local fallback summary'}
            </Text>
            <Text style={styles.reportTitle}>{report.summary.title}</Text>
            <Text style={styles.reportBody}>{report.summary.summary}</Text>
            <Text style={styles.reportConfidence}>
              {formatPercent(report.confidence.value)} compare confidence |{' '}
              {report.confidence.note}
            </Text>

            {report.source.fallbackReason ? (
              <View style={styles.noticeCard}>
                <Text style={styles.noticeTitle}>Why fallback was used</Text>
                <Text style={styles.noticeBody}>
                  {report.source.fallbackReason}
                </Text>
              </View>
            ) : null}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Strongest alignments</Text>
              {report.alignments.map((item) => (
                <View
                  key={`${item.title}-${item.tag}`}
                  style={styles.detailCard}
                >
                  <Text style={styles.detailTitle}>{item.title}</Text>
                  <Text style={styles.detailMeta}>
                    {item.tag} | {item.facet}
                  </Text>
                  <Text style={styles.detailBody}>{item.detail}</Text>
                </View>
              ))}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Interesting contrasts</Text>
              {report.contrasts.length > 0 ? (
                report.contrasts.map((item) => (
                  <View
                    key={`${item.title}-${item.tag}`}
                    style={styles.detailCard}
                  >
                    <Text style={styles.detailTitle}>{item.title}</Text>
                    <Text style={styles.detailMeta}>
                      {item.tag} | {item.facet}
                    </Text>
                    <Text style={styles.detailBody}>{item.detail}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.sectionBody}>
                  No single contrast dominates this deck yet.
                </Text>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Unresolved areas</Text>
              {report.unresolvedAreas.length > 0 ? (
                report.unresolvedAreas.map((item) => (
                  <View
                    key={`${item.title}-${item.tag}`}
                    style={styles.detailCard}
                  >
                    <Text style={styles.detailTitle}>{item.title}</Text>
                    <Text style={styles.detailMeta}>
                      {item.tag} | {item.facet}
                    </Text>
                    <Text style={styles.detailBody}>{item.detail}</Text>
                    <Text style={styles.detailNote}>{item.confidenceNote}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.sectionBody}>
                  No major unresolved area surfaced in the exported deck
                  summaries.
                </Text>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Conversation starters</Text>
              {report.conversationStarters.length > 0 ? (
                report.conversationStarters.map((item) => (
                  <View
                    key={`${item.title}-${item.prompt}`}
                    style={styles.detailCard}
                  >
                    <Text style={styles.detailTitle}>{item.title}</Text>
                    <Text style={styles.detailBody}>{item.prompt}</Text>
                    <Text style={styles.detailNote}>{item.rationale}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.sectionBody}>
                  This deck is staying cautious, so it is better to compare real
                  examples together than to force a prompt here.
                </Text>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Guardrails</Text>
              {report.guardrails.map((item) => (
                <View key={item} style={styles.inlineRow}>
                  <View style={styles.dot} />
                  <Text style={styles.inlineText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to compare consent"
          onPress={() =>
            router.replace(getCompareConsentRoute(deck.id as string) as never)
          }
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed ? styles.buttonPressed : null,
          ]}
        >
          <Text style={styles.secondaryButtonText}>Back to Consent</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0B10',
  },
  stateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  stateTitle: {
    marginTop: 14,
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  stateMessage: {
    marginTop: 10,
    color: 'rgba(255,255,255,0.72)',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  headerCard: {
    borderRadius: 20,
    padding: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  eyebrow: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 14,
  },
  headerTitle: {
    marginTop: 8,
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
  },
  headerBody: {
    marginTop: 10,
    color: 'rgba(255,255,255,0.78)',
    fontSize: 15,
    lineHeight: 22,
  },
  metricRow: {
    marginTop: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  metricChipLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    marginTop: 18,
  },
  sectionTitle: {
    marginBottom: 10,
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  sectionBody: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 14,
    lineHeight: 20,
  },
  primaryButton: {
    marginTop: 18,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  primaryButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  secondaryButton: {
    marginTop: 12,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  primaryButtonText: {
    color: '#0B0B10',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  input: {
    minHeight: 220,
    marginTop: 12,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: '#FFFFFF',
    fontSize: 13,
    textAlignVertical: 'top',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  codeCard: {
    marginTop: 12,
    borderRadius: 16,
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  codeText: {
    color: '#E2E8F0',
    fontSize: 12,
    lineHeight: 18,
    fontFamily: 'SpaceMono',
  },
  previewCard: {
    marginTop: 12,
    borderRadius: 14,
    padding: 14,
    backgroundColor: 'rgba(34,197,94,0.14)',
  },
  previewTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  previewBody: {
    marginTop: 6,
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    lineHeight: 20,
  },
  inlineError: {
    marginTop: 10,
    color: '#FCA5A5',
    fontSize: 13,
    lineHeight: 18,
  },
  errorCard: {
    marginTop: 16,
    borderRadius: 16,
    padding: 14,
    backgroundColor: 'rgba(239,68,68,0.14)',
  },
  errorTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  errorBody: {
    marginTop: 6,
    color: 'rgba(255,255,255,0.82)',
    fontSize: 14,
    lineHeight: 20,
  },
  reportCard: {
    marginTop: 20,
    borderRadius: 20,
    padding: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  reportEyebrow: {
    color: 'rgba(255,255,255,0.62)',
    fontSize: 13,
  },
  reportTitle: {
    marginTop: 8,
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
  },
  reportBody: {
    marginTop: 10,
    color: 'rgba(255,255,255,0.8)',
    fontSize: 15,
    lineHeight: 22,
  },
  reportConfidence: {
    marginTop: 12,
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
  },
  noticeCard: {
    marginTop: 14,
    borderRadius: 14,
    padding: 14,
    backgroundColor: 'rgba(234,179,8,0.14)',
  },
  noticeTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  noticeBody: {
    marginTop: 6,
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    lineHeight: 20,
  },
  detailCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  detailTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  detailMeta: {
    marginTop: 6,
    color: 'rgba(255,255,255,0.62)',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  detailBody: {
    marginTop: 8,
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    lineHeight: 20,
  },
  detailNote: {
    marginTop: 8,
    color: 'rgba(255,255,255,0.66)',
    fontSize: 13,
    lineHeight: 18,
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  dot: {
    width: 8,
    height: 8,
    marginTop: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  inlineText: {
    flex: 1,
    color: 'rgba(255,255,255,0.78)',
    fontSize: 14,
    lineHeight: 20,
  },
  buttonPressed: {
    opacity: 0.82,
  },
});
