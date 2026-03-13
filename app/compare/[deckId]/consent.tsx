import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useDeckCompareReadiness } from '@/hooks/useDeckCompareReadiness';
import {
  getDeckBrowserRoute,
  getDeckCompareRoute,
} from '@/lib/navigation/appShell';
import {
  buildDeckCompareConsentApprovalBasis,
  clearDeckCompareConsentApproval,
  createDeckCompareConsentApproval,
} from '@/lib/compare/compareConsentSession';
import {
  DECK_COMPARE_CONSENT_CONFIRMATION_IDS,
  asDeckId,
  type DeckCompareConsentConfirmationId,
} from '@/types/domain';

function createInitialConsentState(): Record<
  DeckCompareConsentConfirmationId,
  boolean
> {
  return {
    same_deck: false,
    explicit_consent: false,
    export_preview: false,
  };
}

interface LocalConsentUiState {
  key: string;
  confirmed: Record<DeckCompareConsentConfirmationId, boolean>;
  approved: boolean;
  approvalId: string | null;
}

function createInitialLocalConsentUiState(key: string): LocalConsentUiState {
  return {
    key,
    confirmed: createInitialConsentState(),
    approved: false,
    approvalId: null,
  };
}

export default function CompareConsentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ deckId?: string | string[] }>();
  const routeDeckId = Array.isArray(params.deckId)
    ? params.deckId[0]
    : params.deckId;
  const deckId = routeDeckId ? asDeckId(routeDeckId) : null;
  const {
    deck,
    readiness,
    consentDraft,
    payload,
    payloadPreview,
    loading,
    error,
    payloadLoading,
    payloadError,
    refetch,
  } = useDeckCompareReadiness(deckId);
  const consentApprovalBasis = useMemo(
    () => buildDeckCompareConsentApprovalBasis(payload),
    [payload],
  );
  const localConsentStateKey = `${deckId ?? 'none'}|${consentApprovalBasis ?? 'none'}`;
  const [localConsentUiState, setLocalConsentUiState] = useState(() =>
    createInitialLocalConsentUiState(localConsentStateKey),
  );
  const currentLocalConsentUiState =
    localConsentUiState.key === localConsentStateKey
      ? localConsentUiState
      : createInitialLocalConsentUiState(localConsentStateKey);
  const { confirmed, approved, approvalId } = currentLocalConsentUiState;

  const allConfirmed = useMemo(
    () => DECK_COMPARE_CONSENT_CONFIRMATION_IDS.every((id) => confirmed[id]),
    [confirmed],
  );

  useEffect(() => {
    setLocalConsentUiState(
      createInitialLocalConsentUiState(localConsentStateKey),
    );

    if (deckId) {
      clearDeckCompareConsentApproval(deckId);
    }
  }, [deckId, localConsentStateKey, routeDeckId]);

  const handleToggleConfirmation = (
    confirmationId: DeckCompareConsentConfirmationId,
  ) => {
    const shouldClearApproval = currentLocalConsentUiState.approved;

    if (shouldClearApproval && deckId) {
      clearDeckCompareConsentApproval(deckId);
    }

    setLocalConsentUiState((current) => {
      const nextState =
        current.key === localConsentStateKey
          ? current
          : createInitialLocalConsentUiState(localConsentStateKey);

      return {
        ...nextState,
        approved: false,
        approvalId: null,
        confirmed: {
          ...nextState.confirmed,
          [confirmationId]: !nextState.confirmed[confirmationId],
        },
      };
    });
  };

  if (!routeDeckId) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Compare Consent' }} />
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
        <Stack.Screen options={{ title: 'Compare Consent' }} />
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.stateTitle}>Loading compare consent...</Text>
        </View>
      </View>
    );
  }

  const combinedError = error ?? payloadError;

  if (combinedError) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Compare Consent' }} />
        <View style={styles.stateContainer}>
          <Text style={styles.stateTitle}>Unable to load compare consent</Text>
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

  if (!deck || !readiness || !consentDraft) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Compare Consent' }} />
        <View style={styles.stateContainer}>
          <Text style={styles.stateTitle}>
            Compare consent is not ready yet
          </Text>
          <Text style={styles.stateMessage}>
            This deck must be locally compare-ready before you can review export
            disclosure.
          </Text>
          <Pressable
            testID="compare-consent-back-to-readiness"
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

  const exportPreview =
    payloadPreview?.categories ?? consentDraft.exportPreview;
  const handleApprove = () => {
    if (!allConfirmed || !deckId || !consentApprovalBasis) {
      return;
    }

    const nextApprovalId = createDeckCompareConsentApproval({
      deckId,
      basis: consentApprovalBasis,
    });
    setLocalConsentUiState({
      key: localConsentStateKey,
      confirmed,
      approved: true,
      approvalId: nextApprovalId,
    });
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Compare Consent' }} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerCard}>
          <Text style={styles.eyebrow}>{deck.title}</Text>
          <Text style={styles.title}>Review deck-scoped compare consent</Text>
          <Text style={styles.body}>{consentDraft.disclosure}</Text>
          {consentDraft.caution ? (
            <View style={styles.cautionCard}>
              <Text style={styles.cautionTitle}>Extra care for this deck</Text>
              <Text style={styles.cautionBody}>{consentDraft.caution}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What would leave this device</Text>
          {exportPreview.map((item) => (
            <View key={item.category} style={styles.detailCard}>
              <Text style={styles.detailTitle}>{item.title}</Text>
              <Text style={styles.detailBody}>{item.detail}</Text>
            </View>
          ))}
          {payloadPreview ? (
            <View style={styles.previewSummaryCard}>
              <Text style={styles.previewSummaryTitle}>
                Local payload preview
              </Text>
              <Text style={styles.previewSummaryBody}>
                {payloadPreview.debugSummary.summaryLine}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What stays local</Text>
          {consentDraft.keepsLocal.map((item) => (
            <View key={item} style={styles.inlineRow}>
              <View style={styles.dot} />
              <Text style={styles.inlineText}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Required confirmations</Text>
          {consentDraft.confirmations.map((item) => {
            const isChecked = confirmed[item.id];

            return (
              <Pressable
                key={item.id}
                testID={`compare-consent-check-${item.id}`}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isChecked }}
                onPress={() => handleToggleConfirmation(item.id)}
                style={({ pressed }) => [
                  styles.confirmationCard,
                  isChecked ? styles.confirmationCardChecked : null,
                  pressed ? styles.buttonPressed : null,
                ]}
              >
                <View
                  style={[
                    styles.checkbox,
                    isChecked ? styles.checkboxChecked : null,
                  ]}
                />
                <View style={styles.confirmationCopy}>
                  <Text style={styles.confirmationTitle}>{item.label}</Text>
                  <Text style={styles.confirmationBody}>{item.detail}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          testID="compare-consent-approve"
          accessibilityRole="button"
          accessibilityLabel="Approve deck compare consent"
          disabled={!allConfirmed}
          onPress={handleApprove}
          style={({ pressed }) => [
            styles.primaryButton,
            !allConfirmed ? styles.primaryButtonDisabled : null,
            pressed ? styles.buttonPressed : null,
          ]}
        >
          <Text style={styles.primaryButtonText}>
            Approve Deck Compare Consent
          </Text>
        </Pressable>

        {approved ? (
          <View testID="compare-consent-approved" style={styles.successCard}>
            <Text style={styles.successTitle}>Consent captured locally</Text>
            <Text style={styles.successBody}>
              The deck-scoped disclosure has been acknowledged for this compare
              attempt. The next step is to collect the other person&apos;s
              export for this same deck and generate a bounded report.
            </Text>
            <Pressable
              testID="compare-consent-open-report"
              accessibilityRole="button"
              accessibilityLabel="Continue to compare report"
              onPress={() =>
                router.push(
                  `/compare/${deck.id as string}/report?approval=${approvalId ?? ''}` as never,
                )
              }
              style={({ pressed }) => [
                styles.successButton,
                pressed ? styles.buttonPressed : null,
              ]}
            >
              <Text style={styles.successButtonText}>Continue to Report</Text>
            </Pressable>
          </View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to compare readiness"
          onPress={() =>
            router.replace(getDeckCompareRoute(deck.id as string) as never)
          }
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed ? styles.buttonPressed : null,
          ]}
        >
          <Text style={styles.secondaryButtonText}>Back to Readiness</Text>
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
  title: {
    marginTop: 8,
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
  },
  body: {
    marginTop: 10,
    color: 'rgba(255,255,255,0.78)',
    fontSize: 15,
    lineHeight: 22,
  },
  cautionCard: {
    marginTop: 14,
    borderRadius: 16,
    padding: 14,
    backgroundColor: 'rgba(234,179,8,0.14)',
  },
  cautionTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  cautionBody: {
    marginTop: 6,
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    lineHeight: 20,
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
  detailBody: {
    marginTop: 6,
    color: 'rgba(255,255,255,0.74)',
    fontSize: 14,
    lineHeight: 20,
  },
  previewSummaryCard: {
    marginTop: 6,
    borderRadius: 14,
    padding: 14,
    backgroundColor: 'rgba(14,165,233,0.12)',
  },
  previewSummaryTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  previewSummaryBody: {
    marginTop: 6,
    color: 'rgba(255,255,255,0.78)',
    fontSize: 14,
    lineHeight: 20,
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
  confirmationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  confirmationCardChecked: {
    backgroundColor: 'rgba(34,197,94,0.16)',
  },
  checkbox: {
    width: 22,
    height: 22,
    marginTop: 2,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.42)',
  },
  checkboxChecked: {
    borderColor: '#22C55E',
    backgroundColor: '#22C55E',
  },
  confirmationCopy: {
    flex: 1,
  },
  confirmationTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  confirmationBody: {
    marginTop: 6,
    color: 'rgba(255,255,255,0.74)',
    fontSize: 14,
    lineHeight: 20,
  },
  primaryButton: {
    marginTop: 10,
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
  successCard: {
    marginTop: 14,
    borderRadius: 16,
    padding: 14,
    backgroundColor: 'rgba(34,197,94,0.16)',
  },
  successTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  successBody: {
    marginTop: 6,
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    lineHeight: 20,
  },
  successButton: {
    marginTop: 12,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  successButtonText: {
    color: '#0B0B10',
    fontSize: 14,
    fontWeight: '700',
  },
  buttonPressed: {
    opacity: 0.82,
  },
});
