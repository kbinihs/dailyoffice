// 앱 셸: 첫 화면 모션, 상단 바, 해시 라우팅(#/home, #/pray, #/read, #/settings)과 하단 탭.
// GitHub Pages에서 새로고침해도 깨지지 않는다.
import './style.css';
import './mwc.ts';
import { type DateKey, parseKey, prayerDate } from './core/date.ts';
import { parseRefs } from './core/ref.ts';
import { resolve } from './core/resolve.ts';
import { loadBook } from './data/bible.ts';
import { planEntry, psalterEntry, psalterPassages } from './data/content.ts';
import { type StorageStatus, loadStore, onStorageStatus, storageStatus } from './data/store.ts';
import { applyDisplay, applyTone } from './display.ts';
import { isInstalled, watchInstall } from './install.ts';
import { renderHome } from './screens/home.ts';
import { renderPray } from './screens/pray.ts';
import { renderRead } from './screens/read.ts';
import { renderSettings } from './screens/settings.ts';
import { runSplash } from './splash.ts';
import { topBar } from './ui.ts';
import { holdScreen, releaseScreen } from './wake.ts';

const screens = {
  home: renderHome,
  pray: renderPray,
  read: renderRead,
  settings: renderSettings,
} satisfies Record<string, (root: HTMLElement, date: DateKey, params: string[]) => void>;

type Route = keyof typeof screens;

const TITLES: Record<Exclude<Route, 'home'>, string> = { pray: '기도', read: '말씀', settings: '설정' };

/** 설정에서 뒤로 가면 돌아갈 곳: 설정을 열기 전에 보던 화면 */
let returnTo = '#/home';

/** 기도 날짜. 주소에 ?date=YYYY-MM-DD를 붙이면 그날을 미리 본다(검수용). */
function currentDate(): DateKey {
  const override = new URLSearchParams(location.search).get('date');
  if (override) {
    try {
      parseKey(override);
      return override;
    } catch {
      // 잘못된 날짜는 무시하고 오늘로
    }
  }
  return prayerDate();
}

/** #/read/day/262 → ['read', ['day', '262']] */
function currentRoute(): [Route, string[]] {
  const [name, ...params] = location.hash.replace(/^#\/?/, '').split('/');
  return name in screens ? [name as Route, params] : ['home', []];
}

/** 홈의 제목: 둥근 막대 십자가 + 앱 이름 */
function homeTitle(): DocumentFragment {
  const title = document.createDocumentFragment();
  const mark = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  mark.setAttribute('class', 'cross');
  mark.setAttribute('viewBox', '0 0 20 20');
  mark.setAttribute('aria-hidden', 'true');
  mark.innerHTML = '<rect x="8.5" y="1" width="3" height="18" rx="1.5"/><rect x="3.5" y="5.5" width="13" height="3" rx="1.5"/>';
  title.append(mark, '매일, 함께');
  return title;
}

function render(): void {
  const [route, params] = currentRoute();
  const date = currentDate();
  const root = document.getElementById('screen')!;
  document.body.dataset.route = route;
  if (route !== 'settings') returnTo = location.hash || '#/home';
  // 그날의 전례색(04:00을 넘기거나 ?date=가 바뀌면 여기서 따라온다)
  applyTone(date);
  applyDisplay();

  const bar =
    route === 'home'
      ? topBar(homeTitle())
      : route === 'settings'
        ? topBar(TITLES.settings, { back: () => (location.hash = returnTo) })
        : topBar(TITLES[route]);
  document.querySelector('.topbar')?.remove();
  document.body.prepend(bar);

  root.replaceChildren();
  screens[route](root, date, params);

  for (const tab of document.querySelectorAll<HTMLAnchorElement>('.navbar a')) {
    const on = tab.dataset.route === route;
    if (on) tab.setAttribute('aria-current', 'page');
    else tab.removeAttribute('aria-current');
  }
  if (route === 'pray') holdScreen();
  else releaseScreen();
}

/**
 * 화면을 옮길 때 새 화면이 짧게 떠오른다(M3 fade-through의 들어오는 쪽).
 * 주소가 바뀔 때만 부른다. 다시 볼 때·설치 안내·설정을 다시 그릴 때는 깜박이지 않게 쓰지 않는다.
 */
function fadeIn(): void {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document
    .getElementById('screen')
    ?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 210, easing: 'cubic-bezier(0.05, 0.7, 0.1, 1)' });
}

/** 본문이 스크롤되면 상단 바가 한 단계 올라온다(M3 scrolled state). */
function markScrolled(): void {
  document.body.classList.toggle('scrolled', window.scrollY > 0);
}

/** 기기에 기록을 남길 수 없을 때만 화면 맨 위에 한 줄. 경고색은 쓰지 않는다. */
function showStorageNotice(status: StorageStatus): void {
  const notice = document.getElementById('storage-notice')!;
  const text = {
    ok: '',
    memory: '이 기기에 기록을 남길 수 없어, 앱을 연 동안만 기억합니다.',
    failed: '기록 하나를 기기에 남기지 못했습니다. 앱을 다시 열어 확인해 주세요.',
  }[status];
  notice.textContent = text;
  notice.hidden = !text;
}

/** 설치한 앱으로 열었을 때 브라우저가 기록을 함부로 지우지 않게 부탁한다(지원하는 브라우저만). */
function askPersistentStorage(): void {
  if (isInstalled()) navigator.storage?.persist?.().catch(() => {});
}

/** 오늘 기도(시편)·통독에 쓸 책을 미리 받아 둔다. 서비스 워커가 담아 두어 나중에 인터넷이 없어도 열린다. */
function prefetchToday(date: DateKey): void {
  const r = resolve(date);
  const passages = psalterPassages(psalterEntry(r.psalterDay));
  if (r.planDay !== null) passages.push(...parseRefs(planEntry(r.planDay).refs));
  for (const code of new Set(passages.map((p) => p.book))) loadBook(code).catch(() => {});
}

// 기록을 다 불러온 뒤에야 화면을 그리고 조작을 받는다(빈 기록 위에 체크해 기기의 기록을 덮지 않게).
// 그동안 첫 화면 모션이 앞을 가리고, 다 그리고 나면 위로 걷힌다.
/**
 * 지난번에 받아 둔 새 판이 기다리고 있으면, 첫 화면이 떠 있는 동안 바꿔 끼우고 한 번 다시 연다.
 * 기도를 시작한 뒤에는 바꾸지 않는다(이번 실행 중에 새로 받은 판은 다음에 열 때 적용).
 */
function applyWaitingUpdate(): void {
  navigator.serviceWorker?.getRegistration().then((reg) => {
    if (!reg?.waiting || !navigator.serviceWorker.controller) return;
    navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), { once: true });
    reg.waiting.postMessage({ type: 'SKIP_WAITING' });
  });
}

applyWaitingUpdate();

const ready = loadStore().then(() => {
  showStorageNotice(storageStatus());
  onStorageStatus(showStorageNotice);
  askPersistentStorage();
  applyDisplay();
  render();
  // 설치 요청이 늦게 오면 안내가 있는 설정 화면만 다시 그린다(기도 중인 화면은 건드리지 않는다)
  watchInstall(() => {
    if (currentRoute()[0] === 'settings') render();
  });
  if (navigator.onLine) setTimeout(() => prefetchToday(currentDate()), 3000);

  window.addEventListener('hashchange', () => {
    render();
    window.scrollTo(0, 0);
    markScrolled();
    fadeIn();
  });
  // 자동 밝기일 때 기기 설정이 바뀌면 상태 표시줄 색도 따라 바꾼다
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyDisplay);
  window.addEventListener('scroll', markScrolled, { passive: true });
  // 다시 볼 때: 다른 탭·창에서 남긴 기록을 읽어 오고, 04:00을 넘겼으면 날짜도 바뀐다.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') loadStore().then(render);
  });
});
runSplash(ready).then(() => document.getElementById('screen')?.focus({ preventScroll: true }));
