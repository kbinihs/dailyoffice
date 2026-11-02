// 설치 안내(implementation_plan 6.2). 홈 화면에 두면 앱처럼 열리고, 인터넷이 없어도 열리며, 기록이 오래 남는다.
// 카카오톡으로 받은 링크는 카카오톡 안의 브라우저로 열리는데, 거기서는 설치할 수 없어 바깥 브라우저로 보낸다.
import { h, icon } from './ui.ts';

/** 크롬 계열이 주는 설치 요청(표준 DOM 타입에 없다) */
interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: InstallPromptEvent | null = null;
let justInstalled = false;
let redraw = () => {};

/** 앱을 열 때 한 번. 설치 요청이 오거나 설치가 끝나면 onChange로 안내를 다시 그린다. */
export function watchInstall(onChange: () => void): void {
  redraw = onChange;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as InstallPromptEvent;
    onChange();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    justInstalled = true;
    onChange();
  });
}

/** 홈 화면에서 연 앱인가(iOS는 navigator.standalone) */
export function isInstalled(): boolean {
  return (
    matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

type Where = 'kakao' | 'ios' | 'prompt' | 'other';

function where(): Where {
  const ua = navigator.userAgent;
  if (/KAKAOTALK/i.test(ua)) return 'kakao';
  // iPadOS는 데스크톱 Safari처럼 자신을 알린다
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'ios';
  return deferred ? 'prompt' : 'other';
}

/** 설치 안내 본문. 설정의 "설치" 칸에 담는다. */
export function installGuide(): Node[] {
  if (isInstalled()) return [h('p', { class: 'note' }, '이 기기에 설치되어 있습니다.')];
  if (justInstalled) return [h('p', null, '설치했습니다. 이제 홈 화면의 「매일, 함께」로 열어 주세요.')];

  const why = h('p', { class: 'note' }, '홈 화면에 두면 앱처럼 열리고, 인터넷이 없어도 열립니다.');
  switch (where()) {
    case 'kakao': {
      const url = `kakaotalk://web/openExternal?url=${encodeURIComponent(location.href)}`;
      return [
        h('p', null, '카카오톡 안에서는 설치할 수 없습니다. 기본 브라우저로 열어 설치해 주세요.'),
        h('div', { class: 'actions' }, h('md-filled-tonal-button', { href: url }, icon('open_in_new', 'icon'), '브라우저로 열기')),
        why,
      ];
    }
    case 'ios':
      return [
        h(
          'ol',
          { class: 'steps' },
          h('li', null, '화면의 공유 단추', h('span', { class: 'inline-icon' }, icon('ios_share')), '를 누릅니다.'),
          h('li', null, '「홈 화면에 추가」를 고릅니다.'),
          h('li', null, '홈 화면에 생긴 「매일, 함께」로 엽니다.'),
        ),
        why,
        // iOS는 7일 동안 열지 않은 사이트의 저장 공간을 지울 수 있다(홈 화면 앱은 그러지 않는다).
        h('p', { class: 'note' }, 'iPhone에서는 홈 화면에 두어야 기도·통독 기록이 지워지지 않고 남습니다.'),
      ];
    case 'prompt': {
      const button = h('md-filled-tonal-button', null, icon('install_mobile', 'icon'), '설치');
      button.addEventListener('click', async () => {
        const event = deferred;
        if (!event) return;
        deferred = null;
        await event.prompt();
        await event.userChoice.catch(() => null);
        // 그만두었으면 다음 요청이 올 때까지 메뉴로 설치하는 안내로 바꾼다
        redraw();
      });
      return [why, h('div', { class: 'actions' }, button)];
    }
    default:
      return [h('p', null, '브라우저 메뉴에서 「앱 설치」 또는 「홈 화면에 추가」를 고릅니다.'), why];
  }
}
