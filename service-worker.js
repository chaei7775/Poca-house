// 최소한의 서비스워커 - PWA(앱 설치) 인식을 위해 필요
self.addEventListener('install', function(e) {
  self.skipWaiting();
});
self.addEventListener('activate', function(e) {
  self.clients.claim();
});
self.addEventListener('fetch', function(e) {
  // 그냥 네트워크로 그대로 통과 (캐시 전략 없음)
  e.respondWith(fetch(e.request).catch(function() {
    return new Response('오프라인 상태예요', { status: 503 });
  }));
});
