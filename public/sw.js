/**
 * Service worker. Push notifications only.
 *
 * Deliberately NOT a caching service worker. Offline caching on a site that
 * is mostly server-rendered and reactive buys very little and introduces the
 * worst class of bug there is — a stale asset served to one visitor and not
 * another, invisible on every machine except theirs.
 *
 * So: no `fetch` handler at all. If one is ever added, remember that
 * registering a fetch handler makes this worker a proxy for every request on
 * the origin, including the admin.
 */

self.addEventListener("install", () => {
  // Replace the previous worker immediately rather than waiting for every
  // tab to close. There is no cached state to migrate, so the usual reason
  // for waiting does not apply.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    // A push with an unparseable body still means something happened, and a
    // silent drop is the failure mode that makes push feel unreliable.
    payload = { title: "Yusuf Creates", body: event.data.text() };
  }

  const title = payload.title || "Yusuf Creates";

  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      // Same tag replaces rather than stacks, so a flapping site does not
      // bury the lock screen in twenty identical alerts.
      tag: payload.tag || "yc-alert",
      renotify: Boolean(payload.tag),
      data: { url: payload.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const target = event.notification.data?.url || "/";

  /*
   * Focus an existing tab before opening a new one. Clicking three alerts
   * should not leave three copies of the admin open, and a tab that is
   * already signed in is the one to bring forward.
   */
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if (client.url.includes(target) && "focus" in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) return self.clients.openWindow(target);
      }),
  );
});
