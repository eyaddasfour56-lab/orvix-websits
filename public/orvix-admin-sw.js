self.addEventListener('install', function(event) {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', function(event) {
  event.waitUntil((async function() {
    try {
      const response = await fetch('/api/admin/push/latest?ts=' + Date.now(), {
        cache: 'no-store',
        credentials: 'include'
      });
      const data = await response.json();
      const item = data && data.notification;
      if (!response.ok || !item) return;

      await self.registration.showNotification(item.title || 'ORVIX', {
        body: item.body || 'New update',
        icon: '/icon.svg?v=orvix-20260817-v4',
        badge: '/orvix-notification-icon.svg?v=orvix-20260817-v4',
        tag: 'orvix-' + (item.id || Date.now()),
        renotify: true,
        silent: false,
        data: { url: item.target_url || '/admin' }
      });
    } catch (error) {
      await self.registration.showNotification('ORVIX', {
        body: 'You have a new update.',
        icon: '/icon.svg?v=orvix-20260817-v4',
        badge: '/orvix-notification-icon.svg?v=orvix-20260817-v4',
        tag: 'orvix-fallback',
        data: { url: '/admin' }
      });
    }
  })());
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/admin';

  event.waitUntil((async function() {
    const clientsList = await clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    });

    for (const client of clientsList) {
      if ('focus' in client) {
        await client.focus();
        if ('navigate' in client) await client.navigate(target);
        return;
      }
    }

    if (clients.openWindow) await clients.openWindow(target);
  })());
});
