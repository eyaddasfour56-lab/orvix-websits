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
        body: item.body || 'New ORVIX update',
        icon: '/logo.jpeg',
        badge: '/logo.jpeg',
        tag: 'orvix-' + (item.id || Date.now()),
        renotify: true,
        data: { url: item.target_url || '/admin' }
      });
    } catch (error) {
      await self.registration.showNotification('ORVIX', {
        body: 'You have a new ORVIX update.',
        icon: '/logo.jpeg',
        data: { url: '/admin' }
      });
    }
  })());
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/admin';
  event.waitUntil((async function() {
    const clientsList = await clients.matchAll({ type: 'window', includeUncontrolled: true });
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
