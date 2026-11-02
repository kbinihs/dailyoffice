// 홈(design.md 1절): 오늘의 인용, 오늘의 기도, 오늘의 말씀. 앱을 열면 첫 화면 모션 뒤 여기로 온다.
import { type DateKey, formatKo } from '../core/date.ts';
import { josa } from '../core/josa.ts';
import { OFFICE_IDS, type OfficeId, officeAt } from '../core/office.ts';
import { planStart, resolve } from '../core/resolve.ts';
import { discourseTitle, homeQuote, offices, planEntry, seasonName } from '../data/content.ts';
import * as store from '../data/store.ts';
import { readingStatus } from '../reading/progress.ts';
import { h, icon, pressable, readingLine } from '../ui.ts';

/** 시간대 타일의 선 아이콘: 해 뜸, 한낮의 해, 달 */
const GLYPH: Record<OfficeId, string> = { morning: 'wb_twilight', midday: 'sunny', evening: 'bedtime' };

export function renderHome(root: HTMLElement, date: DateKey): void {
  const r = resolve(date);
  const dateLine = h('p', { class: 'date-line' }, formatKo(date));
  if (r.season) dateLine.append(h('span', { class: 'season' }, seasonName(r.season)));

  root.append(h('div', { class: 'home' }, dateLine, quoteHero(date), prayerCard(date), readingCard(date)));
}

function quoteHero(date: DateKey): HTMLElement {
  const quote = homeQuote(date);
  return h(
    'section',
    { class: 'quote', 'aria-label': '오늘의 인용' },
    h('p', { class: 'quote-eyebrow' }, `매튜 헨리 · ${discourseTitle(quote)}`),
    h('blockquote', null, quote.ko),
    h('p', { class: 'quote-anchor' }, `${quote.anchor.krv} `, h('cite', null, `— ${quote.anchor.label}`)),
  );
}

function prayerCard(date: DateKey): HTMLElement {
  const now = officeAt();
  const slots = h('div', { class: 'slots' });
  for (const office of OFFICE_IDS) {
    const done = store.isChecked(date, office);
    const name = offices[office].name;
    const state = done ? '마침' : office === now ? '지금' : '';
    const slot = pressable(
      h(
        'a',
        {
          class: `slot${office === now ? ' now' : ''}${done ? ' done' : ''}`,
          href: `#/pray/${office}`,
          'aria-label': state ? `${name}, ${state}` : name,
        },
        done ? h('span', { class: 'badge' }, icon('check_circle')) : null,
        name,
        h('span', { class: 'glyph' }, icon(GLYPH[office])),
      ),
    );
    slots.append(slot);
  }
  return h('section', { class: 'card' }, h('h2', null, '오늘의 기도'), slots);
}

function readingCard(date: DateKey): HTMLElement {
  const status = readingStatus(date, store.readDays(planStart(date).slice(0, 4)));
  const line =
    status.today !== null ? `오늘 ${josa(planEntry(status.today).label, '을/를')} 읽습니다.` : readingLine(resolve(date));
  const meta = status.today !== null ? `${status.today}일차 · 진도 ${status.percent}%` : `진도 ${status.percent}%`;
  // 기도 카드의 타일처럼 카드 전체가 누르는 곳 하나. 낭독기는 링크 이름 한 줄로 읽는다.
  return pressable(
    h(
      'a',
      { class: 'card card-link', href: '#/read', 'aria-label': `오늘의 말씀, ${line} ${meta}` },
      h('div', { class: 'card-head' }, h('h2', null, '오늘의 말씀'), icon('chevron_right')),
      h('p', { class: 'card-reading' }, line),
      h('p', { class: 'card-meta' }, meta),
    ),
  );
}
