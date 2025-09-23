/* global self, importScripts, firebase */
importScripts('https://www.gstatic.com/firebasejs/10.12.3/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.3/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyDZmPVEJhZsFvvEgdqXk-YnGZH1PFXUjS4",
  authDomain: "notofications-push-test.firebaseapp.com",
  projectId: "notofications-push-test",
  storageBucket: "notofications-push-test.firebasestorage.app",
  messagingSenderId: "809930765442",
  appId: "1:809930765442:web:deff74bea605f951c5309b",
  measurementId: "G-MB5J0Y3MNP"
};

const messaging = firebase.messaging();

// Optional: customize background notifications shown by the SW.
// If your server sends "notification" payload, Chrome shows it automatically.
// If you send only "data", you can handle and show it manually here.
self.addEventListener('push', (event) => {
  // If using data-only messages
  try {
    const data = event.data?.json() || {};
    if (data?.notification) return; // Let default handler handle notification payload

    const title = data?.data?.title || 'Background message';
    const body = data?.data?.body || 'You have a new message';
    const url = data?.data?.click_action || '/';

    event.waitUntil(
      self.registration.showNotification(title, {
        body,
        data: { url }
      })
    );
  } catch (e) {
    // no-op
  }
});

// Focus/open on click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification?.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsArr) => {
      const hadWindow = clientsArr.some((win) => {
        if (win.url === url) { win.focus(); return true; }
        return false;
      });
      if (!hadWindow) return self.clients.openWindow(url);
    })
  );
});
