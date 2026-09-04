// Service worker: listens for push messages from the server and shows a
// real system notification (with sound) even if the site/tab is closed.

self.addEventListener("push", (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch (e) {
    data = { title: "New notification", body: event.data ? event.data.text() : "" }
  }

  const title = data.title || "New notification"
  const options = {
    body: data.body || "",
    icon: "/icon.svg",
    badge: "/icon.svg",
    vibrate: [200, 100, 200],
    // The browser plays the default notification sound automatically —
    // no extra config needed for that.
    data: { url: data.url || "/" },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || "/"
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      if (clients.openWindow) return clients.openWindow(url)
    }),
  )
})
