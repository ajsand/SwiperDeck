import type { DeckId } from '@/types/domain';

interface DeckCompareConsentApproval {
  approvalId: string;
  approvedAt: number;
  basis: string;
}

const approvalsByDeckId = new Map<DeckId, DeckCompareConsentApproval>();
let approvalSequence = 0;

export function buildDeckCompareConsentApprovalBasis(
  payload: {
    profileGeneratedAt: number;
    deck: {
      deckId: DeckId;
      contentVersion: number;
    };
  } | null,
): string | null {
  if (!payload) {
    return null;
  }

  return [
    payload.deck.deckId as string,
    payload.deck.contentVersion,
    payload.profileGeneratedAt,
  ].join('|');
}

export function createDeckCompareConsentApproval(args: {
  deckId: DeckId;
  basis: string;
}): string {
  approvalSequence += 1;
  const approvalId = `${Date.now()}-${approvalSequence}`;

  approvalsByDeckId.set(args.deckId, {
    approvalId,
    approvedAt: Date.now(),
    basis: args.basis,
  });

  return approvalId;
}

export function hasDeckCompareConsentApproval(args: {
  deckId: DeckId;
  approvalId: string | null;
  basis: string | null;
}): boolean {
  if (!args.approvalId || !args.basis) {
    return false;
  }

  const approval = approvalsByDeckId.get(args.deckId);

  return (
    approval?.approvalId === args.approvalId && approval.basis === args.basis
  );
}

export function clearDeckCompareConsentApproval(deckId: DeckId): void {
  approvalsByDeckId.delete(deckId);
}

export function getDeckCompareConsentApprovalTimestamp(
  deckId: DeckId,
): number | null {
  return approvalsByDeckId.get(deckId)?.approvedAt ?? null;
}
