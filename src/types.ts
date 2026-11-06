export type Letter = 'A' | 'B' | 'C' | 'D' | 'E';
export type Points = 3 | 4 | 5;
export type ContentNode =
  | { type: 'text'; text: string }
  | { type: 'math'; text: string; display: boolean }
  | { type: 'image'; file: string; alt: string };
export interface Task {
  id: string; editionId: string; number: number; points: Points;
  group: string; tag: string; stem: ContentNode[];
  options: Record<Letter, ContentNode[]>; answer: Letter; version: string;
  source: {
    paper: { dokument: string; strony: number[] };
    key: { dokument: string; strona: number; pozycja: string; litera: Letter };
  };
}
export interface SourceDocument {
  id: string; rodzaj: string; organizator: string; url: string;
  sha256: string; wersja: string; plik: string;
}
export interface Edition {
  id: string; profileId: string; year: number; grades: number[]; complete: boolean;
  expected: { number: number; points: Points }[]; durationSeconds: number;
  rulesVersion: string; startQuarters: number; penaltyQuartersPerPoint: number;
  documents: SourceDocument[];
}
export interface Profile {
  id: string; contest: string; category: string; grades: number[];
  trainingSeconds: Record<Points, number>;
}
export interface Bank {
  schema: 1; version: string; tasks: Task[]; editions: Edition[]; profiles: Profile[];
  dictionary: { grupy: Record<string, { nazwa: string; opis: string }>;
    tagi: Record<string, { nazwa: string; opis: string }> };
}
export type Mode = { kind: 'training'; points: Points } | { kind: 'mix' }
  | { kind: 'year'; editionId: string | 'random' };
export interface Attempt {
  schema: 1; bankVersion: string; profile: Profile; mode: Mode;
  tasks: Task[]; editions: Edition[]; answers: Record<string, Letter | null>;
  index: number; startedAt: number; deadline: number;
  status: 'active' | 'finished'; finishedAt: number | null;
  finishReason: 'manual' | 'time' | null;
}
