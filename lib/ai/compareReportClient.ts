import type { ComparePayloadV1, DeckCompareReport } from '@/types/domain';

import { buildFallbackCompareReport } from '@/lib/compare/buildFallbackCompareReport';
import { buildCompareReportPrompt } from '@/lib/compare/buildCompareReportPrompt';
import {
  DECK_COMPARE_REPORT_RESPONSE_SCHEMA,
  parseCompareReport,
} from '@/lib/compare/parseCompareReport';
import { shouldPreferLocalCompareFallback } from '@/lib/policy/deckSafetyPolicy';

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const DEFAULT_OPENAI_COMPARE_MODEL = 'gpt-4.1';

function getOpenAiApiKey(): string | null {
  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

  return typeof apiKey === 'string' && apiKey.trim().length > 0
    ? apiKey.trim()
    : null;
}

function getOpenAiCompareModel(): string {
  const model = process.env.EXPO_PUBLIC_OPENAI_COMPARE_MODEL;

  return typeof model === 'string' && model.trim().length > 0
    ? model.trim()
    : DEFAULT_OPENAI_COMPARE_MODEL;
}

function extractOutputText(responseBody: unknown): string | null {
  if (
    typeof responseBody === 'object' &&
    responseBody !== null &&
    'output_text' in responseBody &&
    typeof responseBody.output_text === 'string' &&
    responseBody.output_text.trim().length > 0
  ) {
    return responseBody.output_text;
  }

  if (
    typeof responseBody !== 'object' ||
    responseBody === null ||
    !('output' in responseBody) ||
    !Array.isArray(responseBody.output)
  ) {
    return null;
  }

  for (const outputItem of responseBody.output) {
    if (
      typeof outputItem !== 'object' ||
      outputItem === null ||
      !('content' in outputItem) ||
      !Array.isArray(outputItem.content)
    ) {
      continue;
    }

    for (const contentItem of outputItem.content) {
      if (
        typeof contentItem === 'object' &&
        contentItem !== null &&
        'text' in contentItem &&
        typeof contentItem.text === 'string' &&
        contentItem.text.trim().length > 0
      ) {
        return contentItem.text;
      }
    }
  }

  return null;
}

function normalizeFetchError(responseBody: unknown, status: number): string {
  if (
    typeof responseBody === 'object' &&
    responseBody !== null &&
    'error' in responseBody &&
    typeof responseBody.error === 'object' &&
    responseBody.error !== null &&
    'message' in responseBody.error &&
    typeof responseBody.error.message === 'string'
  ) {
    return responseBody.error.message;
  }

  return `OpenAI compare report request failed with status ${status}.`;
}

export async function generateCompareReport(args: {
  selfPayload: ComparePayloadV1;
  otherPayload: ComparePayloadV1;
}): Promise<DeckCompareReport> {
  const { selfPayload, otherPayload } = args;
  const localFallbackPolicy = shouldPreferLocalCompareFallback({
    selfPayload,
    otherPayload,
  });

  if (localFallbackPolicy.preferLocalFallback) {
    return buildFallbackCompareReport({
      selfPayload,
      otherPayload,
      fallbackReason:
        localFallbackPolicy.reason ??
        'This deck currently uses a local fallback compare summary because the topic needs stricter safeguards.',
    });
  }

  const prompt = buildCompareReportPrompt({
    selfPayload,
    otherPayload,
  });
  const apiKey = getOpenAiApiKey();

  if (!apiKey) {
    return buildFallbackCompareReport({
      selfPayload,
      otherPayload,
      fallbackReason:
        'No OpenAI API key is configured, so the app generated a local deck-scoped compare summary instead.',
    });
  }

  const model = getOpenAiCompareModel();

  try {
    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        store: false,
        input: [
          {
            role: 'developer',
            content: [
              {
                type: 'input_text',
                text: prompt.developerInstruction,
              },
            ],
          },
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: prompt.userPrompt,
              },
            ],
          },
        ],
        text: {
          format: {
            type: 'json_schema',
            ...DECK_COMPARE_REPORT_RESPONSE_SCHEMA,
          },
        },
      }),
    });
    const responseBody = (await response.json()) as unknown;

    if (!response.ok) {
      throw new Error(normalizeFetchError(responseBody, response.status));
    }

    const outputText = extractOutputText(responseBody);

    if (!outputText) {
      throw new Error(
        'OpenAI compare report response did not include structured output.',
      );
    }

    return parseCompareReport({
      raw: outputText,
      context: prompt.context,
      deckId: selfPayload.deck.deckId,
      deckTitle: selfPayload.deck.title,
      sourceKind: 'ai',
      model,
    });
  } catch (error) {
    return buildFallbackCompareReport({
      selfPayload,
      otherPayload,
      fallbackReason:
        error instanceof Error
          ? error.message
          : 'The AI compare report failed, so the app generated a local fallback summary instead.',
    });
  }
}
