import { asDeckCardId } from '@/types/domain';
import { evaluateDeckSequenceScenario } from '@/lib/sequence/sequenceEvaluation';

import adaptiveTagAffinityFixture from './fixtures/sequencing/adaptive-tag-affinity.json';
import broadStartRepresentativeFixture from './fixtures/sequencing/broad-start-representative.json';
import guardrailRecoveryFixture from './fixtures/sequencing/guardrail-recovery.json';
import retestStabilityFixture from './fixtures/sequencing/retest-stability.json';
import {
  buildSequencingScenarioContext,
  type SequencingScenarioFixture,
} from '@/test-fixtures/sequencingScenarios';

const fixtures: SequencingScenarioFixture[] = [
  broadStartRepresentativeFixture as SequencingScenarioFixture,
  adaptiveTagAffinityFixture as SequencingScenarioFixture,
  guardrailRecoveryFixture as SequencingScenarioFixture,
  retestStabilityFixture as SequencingScenarioFixture,
];

describe('sequencing regression harness', () => {
  it.each(fixtures.map((fixture) => [fixture.name, fixture] as const))(
    'keeps %s deterministic across the top queue',
    (_name, fixture) => {
      const context = buildSequencingScenarioContext(fixture);
      const evaluation = evaluateDeckSequenceScenario(context, {
        candidateLimit: 3,
      });

      expect(evaluation.stage).toBe(fixture.expected?.stage);
      expect(evaluation.selected?.cardId).toBe(
        asDeckCardId(fixture.expected?.selectedCardId ?? ''),
      );
      expect(evaluation.selected?.primaryReason).toBe(
        fixture.expected?.primaryReason,
      );

      if (fixture.expected?.topCardIds) {
        expect(
          evaluation.candidates
            .slice(0, fixture.expected.topCardIds.length)
            .map((candidate) => candidate.cardId),
        ).toEqual(
          fixture.expected.topCardIds.map((cardId) => asDeckCardId(cardId)),
        );
      }

      expect(evaluation.metrics?.retestReason ?? null).toBe(
        fixture.expected?.retestReason ?? null,
      );

      if (typeof fixture.expected?.winnerChanged === 'boolean') {
        expect(evaluation.metrics?.guardrailWinnerChanged).toBe(
          fixture.expected.winnerChanged,
        );
      }

      if (fixture.expected?.confidenceDrivers) {
        expect(evaluation.metrics?.confidenceBuildingDrivers).toEqual(
          expect.arrayContaining(fixture.expected.confidenceDrivers),
        );
      }
    },
  );

  it('tracks coverage, diversity, guardrails, and retest metrics through one shared evaluator', () => {
    const broadStart = evaluateDeckSequenceScenario(
      buildSequencingScenarioContext(
        broadStartRepresentativeFixture as SequencingScenarioFixture,
      ),
    );
    const guardrail = evaluateDeckSequenceScenario(
      buildSequencingScenarioContext(
        guardrailRecoveryFixture as SequencingScenarioFixture,
      ),
    );
    const retest = evaluateDeckSequenceScenario(
      buildSequencingScenarioContext(
        retestStabilityFixture as SequencingScenarioFixture,
      ),
    );

    expect(broadStart.metrics?.projectedTagCoverageRatio).toBeGreaterThan(
      broadStart.metrics?.currentTagCoverageRatio ?? 0,
    );
    expect(broadStart.metrics?.projectedFacetCoverageRatio).toBeGreaterThan(
      broadStart.metrics?.currentFacetCoverageRatio ?? 0,
    );
    expect(guardrail.metrics?.guardrailAdjusted).toBe(true);
    expect(guardrail.metrics?.selectedCoverageDebt).toBeGreaterThan(0);
    expect(guardrail.metrics?.noveltyFloorSatisfied).toBe(true);
    expect(retest.metrics?.retestSelected).toBe(true);
    expect(retest.metrics?.selectedCardSeenBefore).toBe(true);
    expect(retest.metrics?.retestPriorityScore).toBeGreaterThan(0);
  });
});
