import { parseSwipeAction, type SwipeAction } from './actions';
import { asSnapshotId, type SnapshotId } from './ids';
import { isRecord, safeJsonParse } from './parsers';

export interface TagScoreSummary {
  tag: string;
  score: number;
}

export interface TypeScoreSummary {
  type: string;
  score: number;
}

export interface ProfileSummary {
  totalSwipes?: number;
  topAction?: SwipeAction;
  generatedAt?: number;
  labels?: string[];
}

export interface ProfileSnapshotRow {
  id: string;
  created_at: number;
  top_tags_json: string;
  top_types_json: string;
  summary_json: string;
}

export interface ProfileSnapshot {
  id: SnapshotId;
  createdAt: number;
  topTags: TagScoreSummary[];
  topTypes: TypeScoreSummary[];
  summary: ProfileSummary;
}

function isTagScoreSummary(value: unknown): value is TagScoreSummary {
  return (
    isRecord(value) &&
    typeof value.tag === 'string' &&
    typeof value.score === 'number'
  );
}

function isTypeScoreSummary(value: unknown): value is TypeScoreSummary {
  return (
    isRecord(value) &&
    typeof value.type === 'string' &&
    typeof value.score === 'number'
  );
}

function parseTagScoreSummaries(jsonText: string): TagScoreSummary[] {
  const parsed = safeJsonParse<unknown>(jsonText, []);

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed.filter(isTagScoreSummary);
}

function parseTypeScoreSummaries(jsonText: string): TypeScoreSummary[] {
  const parsed = safeJsonParse<unknown>(jsonText, []);

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed.filter(isTypeScoreSummary);
}

function parseProfileSummary(jsonText: string): ProfileSummary {
  const parsed = safeJsonParse<unknown>(jsonText, {});

  if (!isRecord(parsed)) {
    return {};
  }

  const summary: ProfileSummary = {};

  if (typeof parsed.totalSwipes === 'number') {
    summary.totalSwipes = parsed.totalSwipes;
  }

  if (typeof parsed.generatedAt === 'number') {
    summary.generatedAt = parsed.generatedAt;
  }

  if (Array.isArray(parsed.labels)) {
    summary.labels = parsed.labels.filter(
      (label): label is string => typeof label === 'string',
    );
  }

  const parsedAction = parseSwipeAction(parsed.topAction);
  if (parsedAction !== null) {
    summary.topAction = parsedAction;
  }

  return summary;
}

export function rowToProfileSnapshot(row: ProfileSnapshotRow): ProfileSnapshot {
  return {
    id: asSnapshotId(row.id),
    createdAt: row.created_at,
    topTags: parseTagScoreSummaries(row.top_tags_json),
    topTypes: parseTypeScoreSummaries(row.top_types_json),
    summary: parseProfileSummary(row.summary_json),
  };
}

export function profileSnapshotToRow(
  snapshot: ProfileSnapshot,
): ProfileSnapshotRow {
  return {
    id: snapshot.id,
    created_at: snapshot.createdAt,
    top_tags_json: JSON.stringify(snapshot.topTags),
    top_types_json: JSON.stringify(snapshot.topTypes),
    summary_json: JSON.stringify(snapshot.summary),
  };
}
