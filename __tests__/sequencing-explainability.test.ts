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

describe('sequencing explainability harness', () => {
  it.each(fixtures.map((fixture) => [fixture.name, fixture] as const))(
    'builds compact explanation output for %s',
    (_name, fixture) => {
      const evaluation = evaluateDeckSequenceScenario(
        buildSequencingScenarioContext(fixture),
      );
      const explanation = evaluation.explanation;

      expect(explanation).not.toBeNull();
      expect(explanation?.stage).toBe(fixture.expected?.stage);
      expect(explanation?.primaryReason).toBe(fixture.expected?.primaryReason);

      for (const fragment of fixture.expected?.summaryIncludes ?? []) {
        expect(explanation?.summary.toLowerCase()).toContain(fragment);
      }
    },
  );

  it('includes component, guardrail, and retest details in structured debug output', () => {
    const adaptive = evaluateDeckSequenceScenario(
      buildSequencingScenarioContext(
        adaptiveTagAffinityFixture as SequencingScenarioFixture,
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
    const broadStart = evaluateDeckSequenceScenario(
      buildSequencingScenarioContext(
        broadStartRepresentativeFixture as SequencingScenarioFixture,
      ),
    );

    expect(
      adaptive.explanation?.topComponents.map((component) => component.key),
    ).toEqual(expect.arrayContaining(['tag_affinity', 'representative_prior']));
    expect(
      guardrail.explanation?.guardrails?.adjustments.map(
        (adjustment) => adjustment.rule,
      ),
    ).toEqual(
      expect.arrayContaining([
        'undercovered_facet_boost',
        'undercovered_tag_boost',
      ]),
    );
    expect(retest.explanation?.retest?.reason).toBe('stability_check');
    expect(
      broadStart.explanation?.reasons.map((reason) => reason.code),
    ).toEqual(
      expect.arrayContaining([
        'representative_pick',
        'undercovered_facet',
        'undercovered_tag',
      ]),
    );
  });
});
