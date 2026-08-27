// Web Push service worker — deliberately separate from any future app-shell
// service worker (this app has none yet): its only jobs are to receive a
// push event while the site isn't open and turn it into an OS notification,
// and to focus/open the app when that notification is tapped. Registered
// from src/lib/webPush.ts at "/", so it covers the whole site.

self.addEventListener("push", (event) => {
  let payload = { title: "Umoja Games", body: "" };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    // Non-JSON payload (shouldn't happen — webPush.service.ts always sends
    // JSON) — fall back to the bare title/body above rather than dropping
    // the notification entirely.
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/logo-icon.png",
      badge: "/logo-icon.png",
      data: { url: payload.url },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url;
  event.waitUntil(
    (async () => {
      // A targeted alert's attached PDF isn't part of the SPA — always give
      // it its own tab rather than trying to reuse/focus an existing app
      // window, which would just leave the PDF's URL unopened.
      if (url) {
        await self.clients.openWindow(url);
        return;
      }
      const clientsList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const existing = clientsList.find((c) => "focus" in c);
      if (existing) {
        await existing.focus();
        return;
      }
      await self.clients.openWindow("/");
    })()
  );
});
