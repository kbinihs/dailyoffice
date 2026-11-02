// 기기 로컬 기록(design.md 5.6). 서버로 보내지 않는다.
// 화면은 메모리의 값을 바로 읽고, 기기(IndexedDB)에는 뒤따라 남긴다.
// 기기에 남길 때는 통째로 덮지 않고 "기기에 있는 값을 읽고 → 바꿀 것만 바꿔 → 쓰기"로 한다.
// 그래야 다른 탭·창이 남긴 체크를 지우지 않는다.
// 처음 불러오기에 실패하면 이번 실행 동안은 기기에 쓰지 않는다(빈 기록으로 덮어쓰지 않게).
import { delMany, get, setMany, update } from 'idb-keyval';
import type { DateKey } from '../core/date.ts';
import type { OfficeId } from '../core/office.ts';
import { type Incoming, type Snapshot, cleanSettings, countAdded, mergeSnapshot, summarize } from './backup.ts';
import { withCheck, withRead } from './records.ts';

export type Mode = 'solo' | 'together';
export type BlessingForm = '2인칭' | '1인칭 복수';

export interface Settings {
  /** 글자 크기 배율. 1 = 18px */
  fontScale: number;
  theme: 'auto' | 'light' | 'dark';
  mode: Mode;
  lastLeader: string | null;
  /** 함께 모드의 축복 꼴. 혼자 모드는 늘 2인칭(받는 말씀) */
  blessingForm: BlessingForm;
}

/** 기도는 날짜 기준: { "2026-11-02": { morning: true, evening: true } } */
export type Checks = Record<DateKey, Partial<Record<OfficeId, boolean>>>;

/** 통독은 연도·일차 기준(PRD 7절): { "2026": { "262": true } }. 열쇠는 통독을 시작한 해. */
export type Reading = Record<string, Record<string, boolean>>;

/** ok: 기기에 남김 / memory: 불러오기에 실패해 이번 실행 동안만 기억 / failed: 남기지 못한 쓰기가 있었음 */
export type StorageStatus = 'ok' | 'memory' | 'failed';

const DEFAULT_SETTINGS: Settings = {
  fontScale: 1,
  theme: 'auto',
  mode: 'solo',
  lastLeader: null,
  blessingForm: '2인칭',
};

const KEYS = ['settings', 'people', 'checks', 'reading'] as const;

const state = {
  settings: { ...DEFAULT_SETTINGS },
  people: [] as string[],
  checks: {} as Checks,
  reading: {} as Reading,
};

let loadedOnce = false;
let status: StorageStatus = 'ok';
const statusListeners = new Set<(s: StorageStatus) => void>();

function setStatus(next: StorageStatus): void {
  if (status === next || status === 'memory') return; // memory는 이번 실행 내내 유지
  status = next;
  for (const fn of statusListeners) fn(status);
}

export function storageStatus(): StorageStatus {
  return status;
}

export function onStorageStatus(fn: (s: StorageStatus) => void): void {
  statusListeners.add(fn);
}

/** 기기의 기록을 메모리로 읽는다. 앱을 열 때, 다시 볼 때 부른다. 실패하면 메모리를 그대로 둔다. */
export async function loadStore(): Promise<void> {
  try {
    const [settings, people, checks, reading] = await Promise.all([
      get<Partial<Settings>>('settings'),
      get<string[]>('people'),
      get<Checks>('checks'),
      get<Reading>('reading'),
    ]);
    state.people = Array.isArray(people) ? people : [];
    // 예전에 남긴 설정 가운데 지금 쓰지 않는 항목(예: 헨리 인용구 보이기)은 버린다.
    const s = { ...DEFAULT_SETTINGS, ...cleanSettings(settings) };
    if (s.lastLeader !== null && !state.people.includes(s.lastLeader)) s.lastLeader = null;
    state.settings = s;
    state.checks = checks ?? {};
    state.reading = reading ?? {};
  } catch (e) {
    console.warn('기록을 불러오지 못했습니다.', e);
    if (!loadedOnce) {
      status = 'memory';
      for (const fn of statusListeners) fn(status);
    }
  } finally {
    loadedOnce = true;
  }
}

/** 기기에 남긴다: 기기의 값에 updater를 적용해 쓴다. */
function write<T>(key: (typeof KEYS)[number], updater: (old: T | undefined) => T): void {
  if (status === 'memory') return;
  update<T>(key, updater).catch((e) => {
    console.warn(`기록을 남기지 못했습니다: ${key}`, e);
    setStatus('failed');
  });
}

/** 내보내기용 사본 */
export function snapshot(): Snapshot {
  return structuredClone(state);
}

/**
 * 가져오기: 기기의 최신 기록을 다시 읽어 그 위에 합치고, 기기에 다 쓴 뒤에 메모리를 바꾼다.
 * 돌려주는 값은 새로 더해진 양이다.
 */
export async function importBackup(incoming: Incoming): Promise<ReturnType<typeof countAdded>> {
  await loadStore();
  const before = summarize(state);
  const merged = mergeSnapshot(snapshot(), incoming);
  if (status !== 'memory') await setMany(KEYS.map((key) => [key, merged[key]]));
  Object.assign(state, merged);
  return countAdded(before, summarize(state));
}

/** 이 기기의 기록·이름·설정을 모두 지운다. 기기에서 지운 뒤에 메모리를 비운다. */
export async function clearAll(): Promise<void> {
  if (status !== 'memory') await delMany([...KEYS]);
  Object.assign(state, { settings: { ...DEFAULT_SETTINGS }, people: [], checks: {}, reading: {} });
}

export function settings(): Readonly<Settings> {
  return state.settings;
}

export function updateSettings(patch: Partial<Settings>): void {
  state.settings = { ...state.settings, ...patch };
  write<Partial<Settings>>('settings', (old) => ({ ...old, ...patch }));
}

export function people(): readonly string[] {
  return state.people;
}

export function setPeople(list: string[]): void {
  state.people = list;
  write<string[]>('people', () => list);
  if (state.settings.lastLeader && !list.includes(state.settings.lastLeader)) updateSettings({ lastLeader: null });
}

export function isChecked(date: DateKey, office: OfficeId): boolean {
  return state.checks[date]?.[office] === true;
}

export function setChecked(date: DateKey, office: OfficeId, done: boolean): void {
  state.checks = withCheck(state.checks, date, office, done);
  write<Checks>('checks', (old) => withCheck(old, date, office, done));
}

/** 그해 통독에서 읽은 일차들 */
export function readDays(year: string): Set<number> {
  const days = state.reading[year] ?? {};
  return new Set(Object.keys(days).filter((d) => days[d]).map(Number));
}

export function setRead(year: string, day: number, done: boolean): void {
  state.reading = withRead(state.reading, year, day, done);
  write<Reading>('reading', (old) => withRead(old, year, day, done));
}
