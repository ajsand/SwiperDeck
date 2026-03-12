import type { DeckId } from '@/types/domain';

interface DeckCompareConsentApproval {
  approvalId: string;
  approvedAt: number;
}

const approvalsByDeckId = new Map<DeckId, DeckCompareConsentApproval>();
let approvalSequence = 0;

export function createDeckCompareConsentApproval(deckId: DeckId): string {
  approvalSequence += 1;
  const approvalId = `${Date.now()}-${approvalSequence}`;

  approvalsByDeckId.set(deckId, {
    approvalId,
    approvedAt: Date.now(),
  });

  return approvalId;
}

export function hasDeckCompareConsentApproval(args: {
  deckId: DeckId;
  approvalId: string | null;
}): boolean {
  if (!args.approvalId) {
    return false;
  }

  return approvalsByDeckId.get(args.deckId)?.approvalId === args.approvalId;
}

export function clearDeckCompareConsentApproval(deckId: DeckId): void {
  approvalsByDeckId.delete(deckId);
}

export function getDeckCompareConsentApprovalTimestamp(
  deckId: DeckId,
): number | null {
  return approvalsByDeckId.get(deckId)?.approvedAt ?? null;
}
