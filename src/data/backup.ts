// 기록 내보내기·가져오기(design.md 5.6). 파일 하나에 settings·people·checks·reading.
// 가져오기는 병합이다: 같은 날짜·일차는 OR(한쪽이라도 체크했으면 체크), 이름은 합치고, 설정은 파일 쪽을 따른다.
// 파일은 사람이 고칠 수도 있으니 아는 모양만 골라 담는다.
import { parseKey } from '../core/date.ts';
import { OFFICE_IDS, type OfficeId } from '../core/office.ts';
import type { BlessingForm, Checks, Reading, Settings } from './store.ts';

export const APP_NAME = '매일, 함께';
export const FORMAT = 1;
export const NAME_MAX = 20;
export const FONT_PX = { min: 14, max: 28, base: 18 };

export interface Snapshot {
  settings: Settings;
  people: string[];
  checks: Checks;
  reading: Reading;
}

export interface BackupFile extends Snapshot {
  app: string;
  format: number;
  exportedAt: string;
}

/** 파일에서 읽어 낸 것. 설정은 빠진 항목이 있을 수 있다. */
export interface Incoming {
  settings: Partial<Settings>;
  people: string[];
  checks: Checks;
  reading: Reading;
}

export type ParseResult = { ok: true; data: Incoming } | { ok: false; reason: string };

export function toBackup(s: Snapshot, now: Date = new Date()): BackupFile {
  return { app: APP_NAME, format: FORMAT, exportedAt: now.toISOString(), ...s };
}

export function parseBackup(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, reason: '기록 파일을 읽을 수 없습니다.' };
  }
  if (!isObject(raw) || raw.app !== APP_NAME) return { ok: false, reason: '이 앱에서 내보낸 기록 파일이 아닙니다.' };
  if (typeof raw.format !== 'number' || raw.format > FORMAT) {
    return { ok: false, reason: '더 새 버전의 앱에서 만든 파일입니다. 앱을 새로 고친 뒤 다시 가져와 주세요.' };
  }
  return {
    ok: true,
    data: {
      settings: cleanSettings(raw.settings),
      people: cleanPeople(raw.people),
      checks: cleanChecks(raw.checks),
      reading: cleanReading(raw.reading),
    },
  };
}

export function mergeSnapshot(current: Snapshot, incoming: Incoming): Snapshot {
  const people = [...current.people];
  for (const name of incoming.people) if (!people.includes(name)) people.push(name);

  const checks: Checks = { ...current.checks };
  for (const [date, offices] of Object.entries(incoming.checks)) checks[date] = { ...checks[date], ...offices };

  const reading: Reading = { ...current.reading };
  for (const [year, days] of Object.entries(incoming.reading)) reading[year] = { ...reading[year], ...days };

  const settings = { ...current.settings, ...incoming.settings };
  if (settings.lastLeader !== null && !people.includes(settings.lastLeader)) settings.lastLeader = null;

  // 체크 기록에는 true만 남아 있으므로 펼쳐 합치면 OR가 된다.
  return { settings, people, checks: dropFalse(checks), reading };
}

export function summarize(s: Pick<Snapshot, 'people' | 'checks' | 'reading'>): { prayerDays: number; readDays: number; people: number } {
  return {
    prayerDays: Object.values(s.checks).filter((o) => Object.values(o).some(Boolean)).length,
    readDays: Object.values(s.reading).reduce((n, days) => n + Object.values(days).filter(Boolean).length, 0),
    people: s.people.length,
  };
}

type Summary = ReturnType<typeof summarize>;

/** 가져오기 전후를 비교해 새로 더해진 양 */
export function countAdded(before: Summary, after: Summary): Summary {
  return {
    prayerDays: after.prayerDays - before.prayerDays,
    readDays: after.readDays - before.readDays,
    people: after.people - before.people,
  };
}

// ── 아는 모양만 골라 담기 ──────────────────────────────

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function cleanName(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const name = v.trim();
  return name && name.length <= NAME_MAX ? name : null;
}

/** 아는 설정만 골라 담는다. 파일에서 읽을 때와 기기에 남은 값을 불러올 때 함께 쓴다. */
export function cleanSettings(v: unknown): Partial<Settings> {
  if (!isObject(v)) return {};
  const out: Partial<Settings> = {};
  const scale = v.fontScale;
  if (typeof scale === 'number' && Number.isFinite(scale)) {
    out.fontScale = Math.min(FONT_PX.max, Math.max(FONT_PX.min, scale * FONT_PX.base)) / FONT_PX.base;
  }
  if (v.theme === 'auto' || v.theme === 'light' || v.theme === 'dark') out.theme = v.theme;
  if (v.mode === 'solo' || v.mode === 'together') out.mode = v.mode;
  if (v.blessingForm === '2인칭' || v.blessingForm === '1인칭 복수') out.blessingForm = v.blessingForm as BlessingForm;
  if (v.lastLeader === null) out.lastLeader = null;
  else if (cleanName(v.lastLeader)) out.lastLeader = cleanName(v.lastLeader);
  return out;
}

function cleanPeople(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const item of v) {
    const name = cleanName(item);
    if (name && !out.includes(name)) out.push(name);
  }
  return out;
}

function isDateKey(key: string): boolean {
  try {
    parseKey(key);
    return true;
  } catch {
    return false;
  }
}

function cleanChecks(v: unknown): Checks {
  const out: Checks = {};
  if (!isObject(v)) return out;
  for (const [date, offices] of Object.entries(v)) {
    if (!isDateKey(date) || !isObject(offices)) continue;
    const kept: Partial<Record<OfficeId, boolean>> = {};
    for (const office of OFFICE_IDS) if (offices[office] === true) kept[office] = true;
    if (Object.keys(kept).length) out[date] = kept;
  }
  return out;
}

function cleanReading(v: unknown): Reading {
  const out: Reading = {};
  if (!isObject(v)) return out;
  for (const [year, days] of Object.entries(v)) {
    if (!/^\d{4}$/.test(year) || !isObject(days)) continue;
    const kept: Record<string, boolean> = {};
    for (const [day, done] of Object.entries(days)) {
      if (/^[1-9]\d{0,2}$/.test(day) && done === true) kept[day] = true;
    }
    if (Object.keys(kept).length) out[year] = kept;
  }
  return out;
}

function dropFalse(checks: Checks): Checks {
  const out: Checks = {};
  for (const [date, offices] of Object.entries(checks)) {
    const kept = Object.fromEntries(Object.entries(offices).filter(([, done]) => done)) as Checks[string];
    if (Object.keys(kept).length) out[date] = kept;
  }
  return out;
}
