// PWA(design.md 10절): 앱 셸은 미리 담고, 성경 본문·글꼴은 처음 쓸 때 담아 두었다가 오프라인에서 꺼낸다.
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// 카카오톡 미리보기는 og:image가 절대 주소여야 읽는다. 배포 워크플로가 VITE_SITE_URL을 넘긴다(index.html의 %VITE_SITE_URL%).
process.env.VITE_SITE_URL ??= 'http://localhost:5173/';

const YEAR = 60 * 60 * 24 * 365;

export default defineConfig({
  plugins: [
    VitePWA({
      // 새 판의 서비스 워커는 받아 두고 기다린다. 다음에 앱을 열 때 첫 화면 동안 바꿔 끼운다(src/main.ts).
      // 바로 맡게 하면(skipWaiting) 옛 화면이 지워진 옛 파일을 찾다 빈 화면이 된다(2026-11-02 배포에서 겪음).
      registerType: 'prompt',
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
