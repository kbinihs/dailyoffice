// 말씀 화면(design.md 6.2): 오늘 · 밀린 날 · 진도(M3 탭).
// 밀린 날은 접힘 목록 대신 따로 한 화면으로 연다(접기·펼치기 UI를 쓰지 않는다, CLAUDE.md 8).
// #/read  #/read/missed  #/read/progress[/YYYY-MM]  #/read/day/<일차>
import { bookOf } from '../core/books.ts';
import { type DateKey, WEEKDAYS_KO, formatKo, formatShortKo } from '../core/date.ts';
import { josa } from '../core/josa.ts';
import { parseRefs } from '../core/ref.ts';
import { planDate, planStart, resolve } from '../core/resolve.ts';
import type { PassageText } from '../data/bible.ts';
import { planConfig, planEntry } from '../data/content.ts';
import * as store from '../data/store.ts';
import { type ReadingStatus, monthCells, readingStatus } from '../reading/progress.ts';
import { doneFab, fillPassages, h, icon, linkItem, pressable, readingLine } from '../ui.ts';

interface View {
  date: DateKey;
  status: ReadingStatus;
  read: Set<number>;
}

type Section = 'today' | 'missed' | 'progress';

export function renderRead(root: HTMLElement, date: DateKey, params: string[] = []): void {
  const year = planStart(date).slice(0, 4);
  const read = store.readDays(year);
  const view: View = { date, status: readingStatus(date, read), read };
  const [sub, arg] = params;
  const day = sub === 'day' && planDate(Number(arg), view.status.start) ? Number(arg) : null;

  if (day !== null) {
    // 일차 하나를 열면 어디서 왔는지에 따라 위 탭을 맞춘다: 오늘, 밀린 날, 그 밖에는 진도(달력)
    const section = day === view.status.today ? 'today' : view.status.missed.includes(day) ? 'missed' : 'progress';
    root.append(tabs(section, view.status.missed.length));
    renderDay(root, view, day);
    return;
  }
  const section: Section = sub === 'missed' || sub === 'progress' ? sub : 'today';
  root.append(tabs(section, view.status.missed.length));
  if (section === 'missed') renderMissed(root, view);
  else if (section === 'progress') renderProgress(root, view, arg);
  else renderToday(root, view);
}

const HREF: Record<Section, string> = { today: '#/read', missed: '#/read/missed', progress: '#/read/progress' };

function tabs(active: Section, missed: number): HTMLElement {
  const labels: [Section, string][] = [
    ['today', '오늘'],
    ['missed', missed ? `밀린 날 ${missed}` : '밀린 날'],
    ['progress', '진도'],
  ];
  const bar = h('md-tabs', { 'aria-label': '말씀' });
  for (const [key, text] of labels) bar.append(h('md-primary-tab', key === active ? { active: '' } : null, text));
  bar.addEventListener('change', () => {
    const picked = labels[bar.activeTabIndex]?.[0];
    if (picked) location.hash = HREF[picked];
  });
  return bar;
}

function renderToday(root: HTMLElement, view: View): void {
  const { status } = view;
  if (status.today !== null) {
    renderDay(root, view, status.today);
    return;
  }
  // 주일, 통독표를 마친 뒤, 시작 전: 오늘 범위 없이 밀린 날로 가는 길만
  root.append(h('h2', { class: 'read-rest' }, readingLine(resolve(view.date))));
  if (status.missed.length) {
    root.append(linkItem('#/read/missed', '밀린 날', `${status.missed.length}일을 이어서 읽을 수 있습니다`));
  }
}

function renderDay(root: HTMLElement, view: View, day: number): void {
  const { status, read } = view;
  const entry = planEntry(day);
  const isToday = day === status.today;
  const dayDate = planDate(day, status.start)!;

  if (isToday) {
    root.append(h('h2', { class: 'today-line' }, `오늘 ${josa(entry.label, '을/를')} 읽습니다.`));
  } else {
    // 밀린 날 목록이나 그 달 달력으로 돌아가는 길
    const [href, text] = status.missed.includes(day)
      ? ['#/read/missed', '밀린 날']
      : [`#/read/progress/${dayDate.slice(0, 7)}`, `${Number(dayDate.slice(5, 7))}월 진도`];
    root.append(
      h('p', { class: 'back' }, h('md-text-button', { href }, icon('arrow_back', 'icon'), text)),
      h('h2', { class: 'read-title' }, entry.label),
    );
  }
  root.append(h('p', { class: 'read-meta' }, `${day}일차 · ${formatKo(dayDate)} · 핵심장 ${entry.key}`));

  const keys = parseRefs(entry.keyRef).map((p) => `${p.book} ${p.chapter}`);
  const text = h('div', { class: 'scripture' });
  fillPassages(text, parseRefs(entry.refs), (texts) => texts.map((p) => chapter(p, keys.includes(`${p.book} ${p.chapter}`))));
  root.append(text);

  // 따라잡는 중이면 다음 밀린 날로 바로 이어 간다.
  const next = status.missed.find((d) => d > day);
  if (!isToday && next) {
    root.append(h('div', { class: 'after' }, linkItem(`#/read/day/${next}`, '다음 밀린 날', planEntry(next).label)));
  } else if (!isToday && status.today !== null) {
    root.append(h('div', { class: 'after' }, linkItem('#/read', '오늘 통독', planEntry(status.today).label)));
  }

  root.append(
    doneFab(
      '읽었습니다',
      () => read.has(day),
      (done) => {
        store.setRead(status.year, day, done);
        if (done) read.add(day);
        else read.delete(day);
      },
    ),
  );
}

function chapter(p: PassageText, isKey: boolean): HTMLElement {
  const book = bookOf(p.book)!;
  return h(
    'section',
    { class: 'chapter' },
    h('h3', null, `${book.ko} ${p.chapter}${p.book === 'Ps' ? '편' : '장'}`, isKey ? h('span', { class: 'role' }, h('span', { class: 'sr' }, ', '), '핵심장') : null),
    ...p.verses.map((v) => h('p', { class: 'verse' }, h('span', { class: 'vn' }, String(v.verse)), v.text)),
  );
}

function renderMissed(root: HTMLElement, view: View): void {
  const { missed, start } = view.status;
  if (!missed.length) {
    root.append(h('p', { class: 'lead-note' }, '밀린 날이 없습니다.'));
    return;
  }
  root.append(h('p', { class: 'lead-note' }, '처음 체크한 날부터 어제까지, 아직 체크하지 않은 날입니다.'));
  const list = h('md-list', { 'aria-label': '밀린 날' });
  for (const day of missed) {
    list.append(
      h(
        'md-list-item',
        { type: 'link', href: `#/read/day/${day}` },
        h('div', { slot: 'headline' }, planEntry(day).label),
        h('div', { slot: 'supporting-text' }, `${day}일차 · ${formatShortKo(planDate(day, start)!)}`),
        icon('chevron_right', 'end'),
      ),
    );
  }
  root.append(list);
}

function renderProgress(root: HTMLElement, view: View, month: string | undefined): void {
  const { status, read, date } = view;
  const year = Number(status.year);
  const [y, m] = /^\d{4}-\d{2}$/.test(month ?? '') ? month!.split('-').map(Number) : date.split('-').map(Number);
  // 달력은 그해 통독 안에서만 넘긴다(기록이 연도별이다).
  const shown = y === year ? m : Number(date.slice(5, 7));
  const pad = (n: number) => String(n).padStart(2, '0');

  root.append(
    h('p', { class: 'percent' }, `${status.percent}%`),
    h('p', { class: 'read-meta' }, `${planConfig.totalDays}일 중 ${status.done}일을 읽었습니다.`),
  );

  // 맨 앞·맨 뒤 달에서는 단추를 끈다(자리는 남겨 달 이름이 가운데에 있게)
  const step = (to: number, name: string, glyph: string) =>
    to >= 1 && to <= 12
      ? h('md-icon-button', { href: `#/read/progress/${year}-${pad(to)}`, 'aria-label': name }, icon(glyph))
      : h('md-icon-button', { disabled: '', 'aria-label': name }, icon(glyph));
  const nav = h(
    'div',
    { class: 'month' },
    step(shown - 1, '지난달', 'chevron_left'),
    h('h2', null, `${year}년 ${shown}월`),
    step(shown + 1, '다음 달', 'chevron_right'),
  );

  const grid = h('div', { class: 'calendar' });
  for (const w of WEEKDAYS_KO) grid.append(h('span', { class: 'wd', 'aria-hidden': 'true' }, w));
  for (const cell of monthCells(year, shown, read)) {
    if (!cell) {
      grid.append(h('span', null));
      continue;
    }
    const d = String(Number(cell.date.slice(8)));
    const cls = `cell${cell.read ? ' read' : ''}${cell.date === date ? ' today' : ''}`;
    if (cell.day === null) {
      grid.append(h('span', { class: `${cls} off` }, d));
    } else {
      const label = `${formatShortKo(cell.date)}, ${cell.day}일차${cell.read ? ', 읽음' : ''}`;
      grid.append(pressable(h('a', { class: cls, href: `#/read/day/${cell.day}`, 'aria-label': label }, d)));
    }
  }
  root.append(nav, grid, h('p', { class: 'hint' }, '날짜를 누르면 그날 본문이 열립니다.'));
}
