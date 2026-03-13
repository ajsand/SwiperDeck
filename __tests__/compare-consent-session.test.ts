import {
  buildDeckCompareConsentApprovalBasis,
  clearDeckCompareConsentApproval,
  createDeckCompareConsentApproval,
  hasDeckCompareConsentApproval,
} from '@/lib/compare/compareConsentSession';
import { asDeckId } from '@/types/domain';

describe('compare consent session approvals', () => {
  const deckId = asDeckId('deck_movies_tv');

  afterEach(() => {
    clearDeckCompareConsentApproval(deckId);
  });

  it('binds an approval to the current local payload basis', () => {
    const basis = buildDeckCompareConsentApprovalBasis({
      profileGeneratedAt: 1700000001000,
      deck: {
        deckId,
        contentVersion: 2,
      },
    });

    expect(basis).toBe('deck_movies_tv|2|1700000001000');

    const approvalId = createDeckCompareConsentApproval({
      deckId,
      basis: basis as string,
    });

    expect(
      hasDeckCompareConsentApproval({
        deckId,
        approvalId,
        basis,
      }),
    ).toBe(true);
    expect(
      hasDeckCompareConsentApproval({
        deckId,
        approvalId,
        basis: 'deck_movies_tv|2|1700000002000',
      }),
    ).toBe(false);
  });
});
