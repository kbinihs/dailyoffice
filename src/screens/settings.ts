// 설정 화면(design.md 6.3, 상단 바의 설정 단추로 연다): 글자 크기·테마, 기록, 정보. 인도자 이름은 기도 화면의 인도자 칩에서만 다룬다.
// 스크롤 하나에 모두 펼쳐 둔다(접기 없음). 기록은 이 기기에만 남고 서버로 보내지 않는다.
import type { DateKey } from '../core/date.ts';
import { FONT_PX, parseBackup, toBackup } from '../data/backup.ts';
import { planConfig } from '../data/content.ts';
import * as store from '../data/store.ts';
import { applyDisplay } from '../display.ts';
import { installGuide } from '../install.ts';
import { h, openDialog, segmented } from '../ui.ts';

const FILE_MAX_BYTES = 5_000_000;

/** 가져오기·지우기 뒤 다시 그린 화면에 남길 한 줄 */
let notice: string | null = null;

export function renderSettings(root: HTMLElement, date: DateKey): void {
  const redraw = () => {
    root.replaceChildren();
    renderSettings(root, date);
  };
  const status = h('p', { class: 'notice', role: 'status' }, notice ?? '');
  notice = null;
  const say = (text: string) => {
    notice = text;
    // 가져오기가 끝나기 전에 다른 화면으로 갔으면 그 화면을 덮지 않는다. 문구는 설정에 돌아오면 보인다.
    if (location.hash.startsWith('#/settings')) redraw();
  };

  root.append(
    displaySection(redraw),
    recordsSection(date, say, status),
    section('설치', ...installGuide()),
    aboutSection(),
  );
}

function section(title: string, ...children: (Node | null)[]): HTMLElement {
  return h('section', { class: 'setting' }, h('h2', null, title), ...children);
}

function displaySection(redraw: () => void): HTMLElement {
  const s = store.settings();
  const px = Math.round(s.fontScale * FONT_PX.base);
  const value = h('span', null, `${px}px`);
  const slider = h('md-slider', {
    min: String(FONT_PX.min),
    max: String(FONT_PX.max),
    step: '1',
    value: String(px),
    labeled: '',
    'aria-label': '글자 크기',
  });
  slider.addEventListener('input', () => {
    const chosen = slider.value ?? px;
    store.updateSettings({ fontScale: chosen / FONT_PX.base });
    value.textContent = `${chosen}px`;
    applyDisplay();
  });

  const theme = segmented(
    '화면 밝기',
    [
      ['auto', '자동'],
      ['light', '밝게'],
      ['dark', '어둡게'],
    ],
    s.theme,
    (key) => {
      store.updateSettings({ theme: key });
      applyDisplay();
      redraw();
    },
  );

  return section(
    '보기',
    h('p', { class: 'label' }, h('span', null, '글자 크기'), value),
    slider,
    h('p', { class: 'label' }, '화면'),
    theme,
  );
}

function recordsSection(date: DateKey, say: (text: string) => void, status: HTMLElement): HTMLElement {
  const exportButton = h('md-filled-tonal-button', null, '기록 내보내기');
  exportButton.addEventListener('click', async () => {
    // 다른 탭·창이 방금 남긴 기록까지 담도록 기기에서 다시 읽는다.
    await store.loadStore();
    const json = JSON.stringify(toBackup(store.snapshot()), null, 1);
    const name = `매일함께-기록-${date}.json`;
    // 휴대폰(특히 홈 화면 앱)은 내려받기가 파일로 남지 않을 수 있어 공유 시트(파일에 저장·메신저)를 먼저 연다.
    const file = new File([json], name, { type: 'application/json' });
    if (matchMedia('(pointer: coarse)').matches && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: '매일, 함께 기록' });
        return;
      } catch (e) {
        if ((e as DOMException).name === 'AbortError') return;
        // 공유가 막혔으면 내려받기로
      }
    }
    const url = URL.createObjectURL(file);
    const link = h('a', { href: url, download: name });
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  });

  const file = h('input', { type: 'file', accept: 'application/json,.json', class: 'sr', tabindex: '-1', 'aria-hidden': 'true' });
  const importButton = h('md-outlined-button', null, '기록 가져오기');
  importButton.addEventListener('click', () => file.click());
  file.addEventListener('change', async () => {
    const chosen = file.files?.[0];
    file.value = '';
    if (!chosen) return;
    if (chosen.size > FILE_MAX_BYTES) return say('파일이 너무 큽니다. 이 앱에서 내보낸 기록 파일을 골라 주세요.');
    const parsed = parseBackup(await chosen.text());
    if (!parsed.ok) return say(parsed.reason);
    let added;
    try {
      added = await store.importBackup(parsed.data);
    } catch (e) {
      console.warn(e);
      return say('기록을 기기에 남기지 못했습니다. 다시 가져와 주세요.');
    }
    applyDisplay();
    const { prayerDays, readDays, people } = added;
    say(
      prayerDays || readDays || people
        ? `가져왔습니다. 새로 더해진 것: 기도한 날 ${prayerDays}일, 통독 ${readDays}일, 이름 ${people}명. 설정은 파일 쪽을 따랐습니다.`
        : '가져왔습니다. 이미 같은 기록이 있어 새로 더해진 것은 없습니다. 설정은 파일 쪽을 따랐습니다.',
    );
  });

  const clearButton = h('md-text-button', null, '이 기기의 기록 모두 지우기');
  clearButton.addEventListener('click', () => confirmClear(say));

  return section(
    '기록',
    h('p', { class: 'note' }, '기도·통독 체크, 이름, 설정을 파일 하나로 받아 다른 기기에서 가져올 수 있습니다.'),
    h('div', { class: 'actions' }, exportButton, importButton),
    file,
    h('p', { class: 'note' }, '가져오면 이 기기 기록에 더해집니다. 같은 날의 체크는 합쳐지고, 설정은 파일 쪽을 따릅니다.'),
    status,
    h('div', { class: 'actions' }, clearButton),
  );
}

/** 전체 삭제는 두 번 확인한다: 단추 → 확인 창 */
function confirmClear(onDone: (message: string) => void): void {
  const { body, actions, close } = openDialog('이 기기의 기록을 모두 지울까요?');
  const yes = h('md-text-button', null, '지우기');
  const no = h('md-text-button', null, '그만두기');
  yes.addEventListener('click', async () => {
    try {
      await store.clearAll();
    } catch (e) {
      console.warn(e);
      close();
      return onDone('기록을 지우지 못했습니다. 다시 시도해 주세요.');
    }
    applyDisplay();
    close();
    onDone('이 기기의 기록을 모두 지웠습니다.');
  });
  no.addEventListener('click', close);
  body.append(
    h('p', null, '기도·통독 체크, 이름, 설정이 이 기기에서 사라지고 되돌릴 수 없습니다.'),
    h('p', { class: 'note' }, '나중에 다시 쓰려면 먼저 기록을 내보내 두세요.'),
  );
  actions.append(no, yes);
}

/** 출처와 저작권 표기(docs/rights.md) */
function aboutSection(): HTMLElement {
  const item = (term: string, ...desc: string[]) => [h('dt', null, term), ...desc.map((d) => h('dd', null, d))];
  return section(
    '정보',
    h(
      'dl',
      { class: 'about' },
      ...item('기도문', 'The Book of Common Prayer (2019), Anglican Church in North America의 일일 기도와 절기 기도를 우리말로 옮겼습니다.'),
      ...item('성경', '성경전서 개역한글판 © 대한성서공회'),
      ...item('주기도문', '새주기도문'),
      ...item('통독표', planConfig.planTitle),
      ...item('기록', '모든 기록은 이 기기에만 남습니다. 서버로 보내지 않습니다.'),
    ),
  );
}
