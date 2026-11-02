// 기도 화면(design.md 6.1). 스크롤 하나로 끝까지, 페이지 넘김·접기 없음.
// 혼자 모드가 원형이고, 함께 모드는 같은 본문에 굵게(인도자)·면(다 함께)·라벨·안내 한 줄을 덧입힌다.
// #/pray 는 지금 시각의 시간대, #/pray/<morning|midday|evening> 는 고른 시간대(홈의 타일, 위의 구분 단추).
import { type DateKey, formatKo } from '../core/date.ts';
import { OFFICE_IDS, type OfficeId, officeAt } from '../core/office.ts';
import { type Resolved, resolve } from '../core/resolve.ts';
import { NAME_MAX } from '../data/backup.ts';
import { type Role, offices } from '../data/content.ts';
import * as store from '../data/store.ts';
import { type Block, type Line, alternate, buildOffice } from '../office/model.ts';
import { doneFab, fillPassages, h, icon, linkItem, openDialog, pressable, readingLine, segmented } from '../ui.ts';

export function renderPray(root: HTMLElement, date: DateKey, params: string[] = []): void {
  const office = OFFICE_IDS.includes(params[0] as OfficeId) ? (params[0] as OfficeId) : officeAt();
  const s = store.settings();
  const together = s.mode === 'together';
  const leader = together ? s.lastLeader : null;
  const r = resolve(date);
  const opts = { mode: s.mode, blessingForm: s.blessingForm };
  const redraw = () => {
    root.replaceChildren();
    renderPray(root, date, params);
  };

  const article = h('article', { class: `office ${s.mode}`, 'aria-label': `${offices[office].name} 기도` });
  const ctx: Ctx = { together, leader };
  const mount = (block: Block): HTMLElement => {
    const node = renderBlock(block, ctx, () => {
      // 축복 꼴을 바꿀 때는 그 블록만 다시 그린다(스크롤 위치를 지킨다).
      const fresh = buildOffice(office, r, store.settings()).find((b) => b.id === block.id);
      if (fresh) node.replaceWith(mount(fresh));
    });
    return node;
  };
  for (const block of buildOffice(office, r, opts)) article.append(mount(block));

  root.append(
    h(
      'div',
      { class: 'pray-controls' },
      segmented(
        '시간대',
        OFFICE_IDS.map((o) => [o, offices[o].name]),
        office,
        // 구분 단추는 보기를 바꿀 뿐이라 방문 기록을 쌓지 않는다
        (o) => location.replace(`#/pray/${o}`),
      ),
      h(
        'div',
        { class: 'pray-mode' },
        segmented(
          '모드',
          [
            ['solo', '혼자'],
            ['together', '함께'],
          ],
          s.mode,
          (mode) => {
            store.updateSettings({ mode });
            redraw();
          },
        ),
        together ? leaderChip(leader, redraw) : null,
      ),
    ),
    h('p', { class: 'office-meta' }, `${formatKo(date)} · ${offices[office].name} · ${offices[office].minutes}분`),
  );
  if (together) root.append(h('p', { class: 'guide' }, `굵은 글씨는 ${leader ? `인도자(${leader})` : '인도자'}가 읽습니다.`));
  root.append(article);
  if (office === 'morning') root.append(readingAfter(r));
  root.append(
    doneFab(
      '기도를 마쳤습니다',
      () => store.isChecked(date, office),
      (done) => store.setChecked(date, office, done),
    ),
  );
}

/** 아침 예식 끝의 오늘 통독(offices.json morning.after). 주일·마친 뒤에는 글만. */
function readingAfter(r: Resolved): HTMLElement {
  const line = readingLine(r);
  return h('div', { class: 'after' }, r.planDay !== null ? linkItem('#/read', '오늘 통독', line) : h('p', { class: 'rubric' }, line));
}

interface Ctx {
  together: boolean;
  leader: string | null;
}

function renderBlock(block: Block, ctx: Ctx, onFormChange: () => void): HTMLElement {
  // 축복을 1인칭 복수로 고르면 서로를 향하지 않고 다 함께 읽는다.
  const role: Role = block.kind === 'text' && block.form === '1인칭 복수' ? 'together' : block.role;
  const section = h('section', { class: `el role-${role}` });
  section.append(h('h2', null, block.title, ctx.together ? roleLabel(role, ctx.leader) : null));

  if (block.kind === 'text') {
    if (block.subtitle) section.append(h('p', { class: 'sub' }, block.subtitle));
    if (block.rubric) section.append(h('p', { class: 'rubric' }, block.rubric));
    if (block.forms && block.form) {
      section.append(
        segmented(
          '축복',
          block.forms.map((f) => [f, f === '2인칭' ? '서로에게' : '우리에게']),
          block.form,
          (blessingForm) => {
            store.updateSettings({ blessingForm });
            onFormChange();
          },
        ),
      );
    }
    section.append(h('p', { class: 'text' }, block.text));
    if (block.source) section.append(h('p', { class: 'source' }, block.source));
    if (block.rubricAfter) section.append(h('p', { class: 'rubric' }, block.rubricAfter));
  } else if (block.kind === 'lines') {
    section.append(...block.lines.map((l) => renderLine(l, ctx)));
  } else {
    section.append(h('p', { class: 'sub' }, block.label));
    if (block.rubric) section.append(h('p', { class: 'rubric' }, block.rubric));
    const verses = h('div', { class: 'verses' });
    section.append(verses);
    fillPassages(verses, block.passages, (texts) =>
      alternate(texts.flatMap((p) => p.verses)).map((l) => renderLine(l, ctx)),
    );
  }
  return section;
}

function roleLabel(role: Role, leader: string | null): HTMLElement | null {
  const text: Partial<Record<Role, string>> = {
    leader: leader ?? '인도자',
    together: '다 함께',
    mutual: '서로에게',
    antiphonal: '번갈아',
    versicle: '주고받음',
  };
  // 낭독기가 제목과 붙여 읽지 않게 쉼표를 숨겨 둔다.
  return text[role] ? h('span', { class: 'role' }, h('span', { class: 'sr' }, ', '), text[role]) : null;
}

function renderLine(line: Line, ctx: Ctx): HTMLElement {
  return h(
    'p',
    { class: `line who-${line.who}` },
    // 굵기만으로는 낭독기가 역할을 모른다(design.md 9절).
    ctx.together ? h('span', { class: 'sr' }, line.who === 'leader' ? '인도자: ' : '나머지: ') : null,
    line.verse !== undefined ? h('span', { class: 'vn' }, String(line.verse)) : null,
    line.text,
  );
}

/** M3 assist chip: 오늘 인도자. 누르면 이름 목록이 열린다. */
function leaderChip(leader: string | null, onChange: () => void): HTMLElement {
  const chip = h('md-assist-chip', { label: `인도자 · ${leader ?? '정하지 않음'}`, 'aria-haspopup': 'dialog' }, icon('person', 'icon'));
  chip.addEventListener('click', () => openLeaderDialog(onChange));
  return chip;
}

/** 이름 목록에서 인도자를 고른다. 호칭·관계·나이는 묻지 않는다(design.md 2절). */
function openLeaderDialog(onDone: () => void): void {
  const { body, actions, close } = openDialog('오늘 인도자', onDone);
  const pick = (name: string | null) => {
    store.updateSettings({ lastLeader: name });
    close();
  };

  const option = (label: string, on: boolean, onPick: () => void) => {
    const button = pressable(
      h('button', { type: 'button', class: 'pick', 'aria-pressed': String(on) }, on ? icon('check') : null, label),
    );
    button.addEventListener('click', onPick);
    return button;
  };

  const draw = () => {
    const current = store.settings().lastLeader;
    const rows = store.people().map((name) => {
      const remove = h('md-icon-button', { 'aria-label': `${name} 빼기` }, icon('close'));
      remove.addEventListener('click', () => {
        store.setPeople(store.people().filter((p) => p !== name));
        draw();
      });
      return h('li', null, option(name, name === current, () => pick(name)), remove);
    });
    const none = h('li', null, option('정하지 않음', current === null, () => pick(null)));
    list.replaceChildren(...rows, none);
  };

  const list = h('ul', { class: 'people' });
  const field = h('md-outlined-text-field', { label: '이름이나 별명', maxlength: String(NAME_MAX), autocomplete: 'off' });
  const add = h('md-filled-tonal-button', null, '더하기');
  const submit = () => {
    const name = field.value.trim();
    if (!name) return;
    if (!store.people().includes(name)) store.setPeople([...store.people(), name]);
    pick(name);
  };
  add.addEventListener('click', submit);
  field.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.isComposing) submit();
  });

  const closeButton = h('md-text-button', null, '닫기');
  closeButton.addEventListener('click', close);

  draw();
  body.append(list, h('div', { class: 'add' }, field, add));
  actions.append(closeButton);
}
