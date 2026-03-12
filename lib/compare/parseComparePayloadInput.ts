import { COMPARE_PAYLOAD_SCHEMA, type ComparePayloadV1 } from '@/types/domain';
import { isRecord, safeJsonParse } from '@/types/domain';

function stripCodeFence(value: string): string {
  const trimmed = value.trim();

  if (!trimmed.startsWith('```')) {
    return trimmed;
  }

  return trimmed
    .replace(/^```[a-zA-Z0-9_-]*\s*/, '')
    .replace(/\s*```$/, '')
    .trim();
}

export function parseComparePayloadInput(
  payloadText: string,
): ComparePayloadV1 {
  const parsedValue = safeJsonParse<unknown>(stripCodeFence(payloadText), null);

  if (!isRecord(parsedValue)) {
    throw new Error('Paste a valid compare payload JSON export.');
  }

  if (parsedValue.schema !== COMPARE_PAYLOAD_SCHEMA) {
    throw new Error(
      'The pasted JSON is not a supported DateDeck compare payload.',
    );
  }

  if (
    !isRecord(parsedValue.deck) ||
    typeof parsedValue.deck.deckId !== 'string' ||
    typeof parsedValue.deck.title !== 'string'
  ) {
    throw new Error('The pasted compare payload is missing deck metadata.');
  }

  if (
    !isRecord(parsedValue.confidence) ||
    typeof parsedValue.confidence.value !== 'number' ||
    typeof parsedValue.confidence.label !== 'string'
  ) {
    throw new Error(
      'The pasted compare payload is missing confidence metadata.',
    );
  }

  if (
    !Array.isArray(parsedValue.affinities) ||
    !Array.isArray(parsedValue.aversions)
  ) {
    throw new Error('The pasted compare payload is missing theme summaries.');
  }

  if (
    !Array.isArray(parsedValue.unresolvedAreas) ||
    !isRecord(parsedValue.evidence)
  ) {
    throw new Error('The pasted compare payload is incomplete.');
  }

  return parsedValue as unknown as ComparePayloadV1;
}
