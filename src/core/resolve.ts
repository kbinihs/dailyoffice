// 날짜 → 본문 함수(design.md 4절). 모든 가변 본문은 기기 상태가 아니라 날짜로 정한다.
import seasonsJson from '../../content/seasons.json' with { type: 'json' };
import planConfigJson from '../../content/plan-config.json' with { type: 'json' };
import {
  type DateKey,
  dayNumber,
  dayOfYear,
  isLeapYear,
  parseKey,
  toKey,
  weekdayOf,
  yearOf,
} from './date.ts';

export type SeasonId = 'advent' | 'christmas' | 'lent' | 'holyweek' | 'easter';

/** 전례색. 화면 강조색 토큰(style.css [data-tone])의 이름 */
export type ToneId = 'violet' | 'blue' | 'white' | 'green' | 'red' | 'black';

/** 그날의 전례색과 절기 이름·한 줄 설명(seasons.json tones). 평상시에도 있다(주현절 후·성령강림절 후). */
export interface Tone {
  id: string;
  name: string;
  color: ToneId;
  desc: string;
}

export interface Resolved {
  date: DateKey;
  /** 0=일 … 6=토 */
  weekday: number;
  /** 1~182 */
  psalterDay: number;
  /** 0~2, 선교 기도 3일 순환 */
  missionIdx: number;
  /** 1970-01-01부터 센 날 수. 날마다 차례로 도는 요소(`rotate: "daily"`)가 쓴다 */
  dayIndex: number;
  /** 1~totalDays. 쉬는 요일, 통독 기간 밖이면 null */
  planDay: number | null;
  season: SeasonId | null;
  /** 여는 말씀 키. 절기 id, 부활절 안에서는 easter | ascension | pentecost */
  openingKey: string | null;
  /** 절기 기도 id(adv1 … pentecost). 절기 밖이면 null */
  collectId: string | null;
  /** 전례색과 절기 설명. 날마다 하나가 있다 */
  tone: Tone;
}

export interface PlanConfig {
  startDate: string | null;
  restWeekdays: number[];
  totalDays: number;
}

interface Range {
  id: string;
  from: string;
  to: string;
}

interface SeasonRange extends Range {
  openingSub?: Range[];
}

interface ToneRange extends Range {
  name: string;
  color: ToneId;
  desc: string;
}

interface SeasonRules {
  anchors: Record<string, string>;
  seasons: SeasonRange[];
  tones: ToneRange[];
  collects: Range[];
}

const rules = seasonsJson as SeasonRules;
const planConfig: PlanConfig = planConfigJson;
const PSALTER_CYCLE = 182;

export function resolve(date: DateKey): Resolved {
  const n = parseKey(date);
  const season = findRange(rules.seasons, n);
  // tones는 빈 날이 없게 짜여 있다(tests/resolve.test.ts). 혹시 비면 평상시 초록.
  const tone = findRange(rules.tones, n) ?? rules.tones.find((t) => t.id === 'ordinary')!;
  return {
    date,
    weekday: weekdayOf(n),
    psalterDay: psalterOf(n),
    missionIdx: ((n % 3) + 3) % 3,
    dayIndex: n,
    planDay: planOf(n, planConfig),
    season: (season?.id ?? null) as SeasonId | null,
    openingKey: season ? (findRange(season.openingSub ?? [], n)?.id ?? season.id) : null,
    collectId: findRange(rules.collects, n)?.id ?? null,
    tone: { id: tone.id, name: tone.name, color: tone.color, desc: tone.desc },
  };
}

/** 1월 1일과 7월 2일(윤년 7월 1일)에 1편부터. 364일을 넘는 날은 마지막 분량을 한 번 더. */
export function psalterIndex(date: DateKey): number {
  return psalterOf(parseKey(date));
}

export function planIndex(date: DateKey, config: PlanConfig = planConfig): number | null {
  return planOf(parseKey(date), config);
}

/** 그 날짜가 속한 통독의 시작일. startDate가 없으면 그해 1월 1일. */
export function planStart(date: DateKey, config: PlanConfig = planConfig): DateKey {
  return config.startDate ?? `${date.slice(0, 4)}-01-01`;
}

/** 시작일부터 센 n일차의 날짜. 일차가 범위 밖이면 null */
export function planDate(day: number, start: DateKey, config: PlanConfig = planConfig): DateKey | null {
  if (!Number.isInteger(day) || day < 1 || day > config.totalDays) return null;
  let count = 0;
  for (let n = parseKey(start); ; n++) {
    if (!config.restWeekdays.includes(weekdayOf(n)) && ++count === day) return toKey(n);
  }
}

/** date 전날까지 지나간 일차 수(0~totalDays). 밀린 날을 셀 때 쓴다. */
export function planDaysBefore(date: DateKey, config: PlanConfig = planConfig): number {
  const end = parseKey(date);
  let count = 0;
  for (let n = parseKey(planStart(date, config)); n < end; n++) {
    if (!config.restWeekdays.includes(weekdayOf(n))) count++;
  }
  return Math.min(count, config.totalDays);
}

/** 기준 해의 절기 기준일. 검산표(seasons.json check)와 맞춰 보는 데 쓴다. */
export function seasonAnchors(year: number): Record<string, DateKey | null> {
  const out: Record<string, DateKey | null> = {};
  for (const [name, n] of anchorsOf(year)) out[name] = n === null ? null : toKey(n);
  return out;
}

function psalterOf(n: number): number {
  const doy = dayOfYear(n);
  if (doy <= 2 * PSALTER_CYCLE) return ((doy - 1) % PSALTER_CYCLE) + 1;
  const daysInYear = isLeapYear(yearOf(n)) ? 366 : 365;
  return PSALTER_CYCLE - (daysInYear - doy);
}

function planOf(n: number, config: PlanConfig): number | null {
  const start = config.startDate ? parseKey(config.startDate) : dayNumber(yearOf(n), 1, 1);
  const rest = config.restWeekdays;
  if (n < start || rest.includes(weekdayOf(n))) return null;
  let count = 0;
  for (let d = start; d <= n; d++) if (!rest.includes(weekdayOf(d))) count++;
  return count <= config.totalDays ? count : null;
}

// ── 절기 ──────────────────────────────────────────────
// seasons.json의 from/to는 "기준일 ± 일수", "MM-DD", "A 또는 B" 꼴이다.
// 기준 해 Y의 성탄절은 Y+1년 1월 5일까지 가므로, 날짜 하나를 볼 때 그해와 전해를 함께 본다.

function findRange<T extends Range>(items: readonly T[], n: number): T | null {
  const year = yearOf(n);
  for (const y of [year, year - 1]) {
    const anchors = anchorsOf(y);
    for (const item of items) {
      const from = evaluate(item.from, anchors, y);
      if (from === null || n < from) continue;
      const to = evaluate(item.to, anchors, y, from);
      if (to !== null && n <= to) return item;
    }
  }
  return null;
}

const anchorCache = new Map<number, Map<string, number | null>>();

function anchorsOf(year: number): Map<string, number | null> {
  const cached = anchorCache.get(year);
  if (cached) return cached;
  // 말로 적힌 기준일 넷은 여기서 계산하고, 나머지는 seasons.json의 식을 읽는다.
  const christmas = dayNumber(year, 12, 25);
  const christmasWeekday = weekdayOf(christmas);
  const christmas2 = sundayOnOrAfter(dayNumber(year + 1, 1, 2));
  const anchors = new Map<string, number | null>([
    ['easter', easterOf(year)],
    ['advent1', christmas - (christmasWeekday === 0 ? 7 : christmasWeekday) - 21],
    ['christmas1', sundayOnOrAfter(dayNumber(year, 12, 26))],
    ['christmas2', christmas2 <= dayNumber(year + 1, 1, 5) ? christmas2 : null],
  ]);
  for (const [name, expr] of Object.entries(rules.anchors)) {
    if (!anchors.has(name)) anchors.set(name, evaluate(expr, anchors, year));
  }
  anchorCache.set(year, anchors);
  return anchors;
}

const TERM = /^\s*(\d{2}-\d{2}|[A-Za-z]\w*)\s*(?:([+-])\s*(\d+))?\s*$/;

/** notBefore보다 앞서는 MM-DD는 다음 해로 읽는다(성탄절 12-25 ~ 01-05). */
function evaluate(
  expr: string,
  anchors: Map<string, number | null>,
  year: number,
  notBefore = -Infinity,
): number | null {
  for (const alt of expr.split('또는')) {
    const match = TERM.exec(alt);
    if (!match) throw new Error(`seasons.json 식을 읽을 수 없습니다: "${expr}"`);
    const [, base, sign, days] = match;
    let n: number | null;
    if (/^\d/.test(base)) {
      const [m, d] = base.split('-').map(Number);
      n = dayNumber(year, m, d);
      if (n < notBefore) n = dayNumber(year + 1, m, d);
    } else {
      const value = anchors.get(base);
      if (value === undefined) throw new Error(`seasons.json에 없는 기준일입니다: ${base}`);
      n = value;
    }
    if (n === null) continue;
    return n + (sign === '-' ? -1 : 1) * Number(days ?? 0);
  }
  return null;
}

function sundayOnOrAfter(n: number): number {
  return n + ((7 - weekdayOf(n)) % 7);
}

/** 그레고리력 부활절(Meeus/Jones/Butcher) */
function easterOf(y: number): number {
  const a = y % 19;
  const b = Math.floor(y / 100);
  const c = y % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return dayNumber(y, month, day);
}
