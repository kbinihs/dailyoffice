// PWA(design.md 10절): 앱 셸은 미리 담고, 성경 본문·글꼴은 처음 쓸 때 담아 두었다가 오프라인에서 꺼낸다.
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// 카카오톡 미리보기는 og:image가 절대 주소여야 읽는다. 배포 워크플로가 VITE_SITE_URL을 넘긴다(index.html의 %VITE_SITE_URL%).
process.env.VITE_SITE_URL ??= 'http://localhost:5173/';

const YEAR = 60 * 60 * 24 * 365;

export default defineConfig({
  plugins: [
    VitePWA({
      // 새 판은 다음에 열 때 적용한다. 기도 중에 화면을 다시 불러오지 않는다(registerSW.js는 등록만 한다).
      registerType: 'autoUpdate',
      injectRegister: 'script-defer',
      manifest: {
        name: '매일, 함께',
        short_name: '매일, 함께',
        description: '함께 기도하고 함께 읽는 매일의 순서',
        lang: 'ko',
        dir: 'ltr',
        display: 'standalone',
        orientation: 'portrait',
        // 앱을 열 때 잠깐 보이는 바탕은 첫 화면 모션과 같은 보라
        background_color: '#403966',
        theme_color: '#fdf8ff',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      // 아이콘은 아래 globPatterns로 담는다(두 번 담지 않게)
      includeManifestIcons: false,
      workbox: {
        // 새 판의 서비스 워커는 기다리지 않고 바로 맡는다. 열려 있는 화면은 그대로 두고, 다음에 열 때 새 판이 뜬다.
        // (설치한 앱은 완전히 닫히는 일이 드물어, 기다리게 두면 새 판이 한참 뜨지 않는다)
        skipWaiting: true,
        clientsClaim: true,
        globPatterns: ['**/*.{js,css,html,svg,png}'],
        // 성경 66권(4.6MB)은 미리 담지 않고 펼친 책만 담는다. 미리보기 이미지는 앱에서 쓰지 않는다.
        globIgnores: ['bible/**', 'og.png'],
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            urlPattern: /\/bible\/krv\/[^/]+\.json$/,
            handler: 'CacheFirst',
            options: { cacheName: 'bible-krv-1961', cacheableResponse: { statuses: [200] } },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\//,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-css', cacheableResponse: { statuses: [200] } },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-files',
              cacheableResponse: { statuses: [200] },
              expiration: { maxEntries: 400, maxAgeSeconds: YEAR },
            },
          },
        ],
      },
    }),
  ],
});
