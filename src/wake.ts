// 기도하는 동안 화면이 꺼지지 않게(Screen Wake Lock). 지원하지 않는 기기에서는 아무 일도 하지 않는다.
// 화면이 가려지면 브라우저가 스스로 풀므로, 다시 보일 때 main.ts가 holdScreen을 다시 부른다.
let sentinel: WakeLockSentinel | null = null;

export async function holdScreen(): Promise<void> {
  if (sentinel || !('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
  try {
    sentinel = await navigator.wakeLock.request('screen');
    sentinel.addEventListener('release', () => {
      sentinel = null;
    });
  } catch {
    // 배터리 절약 모드 등으로 거절될 수 있다. 기도에는 지장이 없다.
  }
}

export function releaseScreen(): void {
  sentinel?.release().catch(() => {});
  sentinel = null;
}
