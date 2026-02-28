import { type CatalogEntityType } from './catalog';
import { asEntityId, type EntityId } from './ids';

export interface ScoreFieldsRow {
  score: number;
  pos: number;
  neg: number;
  last_updated: number;
}

export interface ScoreFields {
  score: number;
  pos: number;
  neg: number;
  lastUpdated: number;
}

function rowToScoreFields(row: ScoreFieldsRow): ScoreFields {
  return {
    score: row.score,
    pos: row.pos,
    neg: row.neg,
    lastUpdated: row.last_updated,
  };
}

function scoreFieldsToRow(score: ScoreFields): ScoreFieldsRow {
  return {
    score: score.score,
    pos: score.pos,
    neg: score.neg,
    last_updated: score.lastUpdated,
  };
}

export interface TasteTagScoreRow extends ScoreFieldsRow {
  tag: string;
}

export interface TasteTagScore extends ScoreFields {
  tag: string;
}

export function rowToTasteTagScore(row: TasteTagScoreRow): TasteTagScore {
  return {
    tag: row.tag,
    ...rowToScoreFields(row),
  };
}

export function tasteTagScoreToRow(score: TasteTagScore): TasteTagScoreRow {
  return {
    tag: score.tag,
    ...scoreFieldsToRow(score),
  };
}

export interface TasteTypeScoreRow extends ScoreFieldsRow {
  type: string;
}

export interface TasteTypeScore extends ScoreFields {
  type: CatalogEntityType;
}

export function rowToTasteTypeScore(row: TasteTypeScoreRow): TasteTypeScore {
  return {
    type: row.type as CatalogEntityType,
    ...rowToScoreFields(row),
  };
}

export function tasteTypeScoreToRow(score: TasteTypeScore): TasteTypeScoreRow {
  return {
    type: score.type,
    ...scoreFieldsToRow(score),
  };
}

export interface EntityAffinityRow extends ScoreFieldsRow {
  entity_id: string;
}

export interface EntityAffinity extends ScoreFields {
  entityId: EntityId;
}

export function rowToEntityAffinity(row: EntityAffinityRow): EntityAffinity {
  return {
    entityId: asEntityId(row.entity_id),
    ...rowToScoreFields(row),
  };
}

export function entityAffinityToRow(score: EntityAffinity): EntityAffinityRow {
  return {
    entity_id: score.entityId,
    ...scoreFieldsToRow(score),
  };
}
