/*
 * Rezekii's service worker (owner, 3 Nov 2026): shows phone notifications and opens Rezekii when one is tapped. Registered only
 * when she turns Phone Notifications on in Settings (components/account/push-switch.tsx). It caches nothing.
 */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let d = {};
  try {
    d = event.data ? event.data.json() : {};
  } catch {
    d = { body: event.data ? event.data.text() : "" };
  }
  const url = typeof d.url === "string" && d.url.startsWith("/") && !d.url.startsWith("//") ? d.url : "/app";
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(d.title || "Rezekii", { body: d.body || "", icon: "/app-icon-192.png", tag: d.tag || undefined, data: { url } }),
      // An open Rezekii counts its bell again now (and chimes), instead of at its next 5-minute check.
      self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((tabs) => tabs.forEach((tab) => tab.postMessage({ type: "rz-push" }))),
    ]),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || "/app", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (tabs) => {
      const tab = tabs.find((t) => new URL(t.url).origin === self.location.origin);
      if (!tab) return self.clients.openWindow(url);
      await tab.focus().catch(() => null);
      // Then to the notification's page, if this tab can be moved there.
      if (tab.url !== url && "navigate" in tab) await tab.navigate(url).catch(() => null);
    }),
  );
});
