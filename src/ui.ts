// DOM 직접(프레임워크 없음, design.md 10절). 화면들이 같이 쓰는 작은 도구와 M3 조각.
import { parseKey } from './core/date.ts';
import type { Passage } from './core/ref.ts';
import type { Resolved } from './core/resolve.ts';
import { type PassageText, loadPassages, peekPassages } from './data/bible.ts';
import { planConfig, planEntry } from './data/content.ts';

type Child = Node | string | null | undefined | false;

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> | null,
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs ?? {})) el.setAttribute(name, value);
  for (const child of children) if (child) el.append(child);
  return el;
}

/** Material Symbols Rounded 선 아이콘 하나. 앱의 아이콘은 모두 이 한 가지 결이다(채운 아이콘·이모지 없음). */
export function icon(name: string, slot?: string): HTMLElement {
  const attrs: Record<string, string> = { 'aria-hidden': 'true' };
  if (slot) attrs.slot = slot;
  return h('md-icon', attrs, name);
}

/** 누르는 것에 M3 물결과 초점 표시를 붙인다. 요소에는 `.press`(position:relative)가 있어야 한다. */
export function pressable<T extends HTMLElement>(el: T): T {
  el.classList.add('press');
  el.append(h('md-ripple', null), h('md-focus-ring', null));
  return el;
}

/** 오늘 통독 한 줄: 범위, 또는 쉬는 날·마친 뒤의 문구 */
export function readingLine(r: Resolved): string {
  if (r.planDay !== null) return `${planEntry(r.planDay).label} (${r.planDay}일차)`;
  if (planConfig.restWeekdays.includes(r.weekday)) return r.weekday === 0 ? '주일 — 통독 쉼' : '통독 쉬는 날';
  if (planConfig.startDate && parseKey(r.date) < parseKey(planConfig.startDate)) return '통독 시작 전';
  return '올해 통독표를 마쳤습니다';
}

/** M3 작은 상단 바: 제목과 설정 단추(설정 화면에서는 뒤로 단추). */
export function topBar(title: Node | string, opts: { back?: () => void } = {}): HTMLElement {
  const inner = h('div', { class: opts.back ? 'topbar-inner has-back' : 'topbar-inner' });
  if (opts.back) {
    const back = h('md-icon-button', { 'aria-label': '뒤로' }, icon('arrow_back'));
    back.addEventListener('click', opts.back);
    inner.append(back);
  }
  inner.append(h('h1', null, title));
  if (!opts.back) inner.append(h('md-icon-button', { href: '#/settings', 'aria-label': '설정' }, icon('settings')));
  return h('header', { class: 'topbar' }, inner);
}

/** 다른 화면으로 가는 한 줄(M3 list item): "다음 밀린 날", "오늘 통독" */
export function linkItem(href: string, headline: string, supporting: string): HTMLElement {
  return h(
    'md-list',
    null,
    h(
      'md-list-item',
      { type: 'link', href },
      h('div', { slot: 'headline' }, headline),
      h('div', { slot: 'supporting-text' }, supporting),
      icon('chevron_right', 'end'),
    ),
  );
}

/** M3 구분 단추: 고른 칸은 secondary-container + 체크 아이콘 */
export function segmented<T extends string>(
  label: string,
  options: [T, string][],
  current: T,
  onPick: (value: T) => void,
): HTMLElement {
  const group = h('div', { class: 'seg', role: 'group', 'aria-label': label });
  for (const [value, text] of options) {
    const on = value === current;
    const button = pressable(h('button', { type: 'button', 'aria-pressed': String(on) }, on ? icon('check') : null, text));
    button.addEventListener('click', () => {
      if (value !== current) onPick(value);
    });
    group.append(button);
  }
  return group;
}

/** 성경 본문을 채운다. 받아 둔 책이면 바로, 아니면 불러오는 동안 한 줄 안내, 실패하면 다시 시도 단추. */
export function fillPassages(
  container: HTMLElement,
  passages: Passage[],
  draw: (texts: PassageText[]) => Node[],
): void {
  const ready = peekPassages(passages);
  if (ready) {
    container.replaceChildren(...draw(ready));
    return;
  }
  container.replaceChildren(h('p', { class: 'rubric' }, '본문을 불러오는 중입니다.'));
  loadPassages(passages).then(
    (texts) => container.replaceChildren(...draw(texts)),
    () => {
      const retry = h('md-text-button', null, '다시 불러오기');
      retry.addEventListener('click', () => fillPassages(container, passages, draw));
      container.replaceChildren(h('p', { class: 'rubric' }, '본문을 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.'), retry);
    },
  );
}

/**
 * M3 대화창(md-dialog). 단추로 닫으면 그 자리에서 onClose를 부른다.
 * 바깥을 누르거나 Esc로 닫을 때는 close 이벤트로 같은 일을 한다(이벤트가 늦거나 오지 않는 브라우저가 있어 그것에만 기대지 않는다).
 */
export function openDialog(
  title: string,
  onClose?: () => void,
): { body: HTMLElement; actions: HTMLElement; close: () => void } {
  const dialog = h('md-dialog', null);
  const body = h('div', { slot: 'content' });
  const actions = h('div', { slot: 'actions' });
  dialog.append(h('div', { slot: 'headline' }, title), body, actions);
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    onClose?.();
  };
  dialog.addEventListener('close', finish);
  dialog.addEventListener('closed', () => dialog.remove());
  document.body.append(dialog);
  dialog.show();
  return {
    body,
    actions,
    close: () => {
      dialog.close();
      finish();
      setTimeout(() => dialog.remove(), 500);
    },
  };
}

/**
 * 떠 있는 마침 단추(M3 extended FAB): "기도를 마쳤습니다", "읽었습니다". 다시 누르면 풀린다.
 * 마친 뒤에는 더 세게가 아니라 더 조용하게: surface 면에 높이를 낮춘다(lowered).
 */
export function doneFab(label: string, isDone: () => boolean, setDone: (done: boolean) => void): HTMLElement {
  const glyph = icon('check', 'icon');
  const fab = h('md-fab', { label }, glyph);
  const paint = () => {
    const done = isDone();
    fab.variant = done ? 'surface' : 'primary';
    fab.lowered = done;
    glyph.textContent = done ? 'check_circle' : 'check';
    fab.setAttribute('aria-label', done ? `${label}, 체크함` : label);
  };
  fab.addEventListener('click', () => {
    setDone(!isDone());
    paint();
  });
  paint();
  return h('div', { class: 'fab-bar' }, fab);
}
