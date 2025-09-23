import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";

// 1) Init Firebase
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
const app = initializeApp(firebaseConfig);

async function init() {
  // 2) Register service worker for PWA shell (optional but good)
  if ("serviceWorker" in navigator) {
    // Register your app shell SW (optional) if you add one:
    await navigator.serviceWorker.register("/sw.js");
    // Register the Firebase Messaging SW (required)
    await navigator.serviceWorker.register("/firebase-messaging-sw.js");
  }

  // 3) FCM support check (Safari/iOS will return false)
  const supported = await isSupported();
  if (!supported) {
    console.warn("FCM is not supported in this browser.");
    return;
  }

  // 4) Ask for Notification permission
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    console.warn("User denied notifications");
    return;
  }

  // 5) Get FCM token (use your Web Push key)
  const messaging = getMessaging(app);
  const vapidKey = "YOUR_PUBLIC_VAPID_KEY_FROM_FIREBASE_CONSOLE";
  const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: await navigator.serviceWorker.getRegistration() });
  console.log("FCM token:", token);

  // Save token to your backend if you need to target this device later

  // 6) Foreground messages
  onMessage(messaging, (payload) => {
    console.log("Message in foreground:", payload);
    // Optionally show an in-app toast/snackbar
    const title = payload?.notification?.title ?? payload?.data?.title ?? "Message";
    const body = payload?.notification?.body ?? payload?.data?.body ?? "";
    // Simple demo:
    const div = document.getElementById("log")!;
    div.innerHTML = `<b>${title}</b><br/>${body}`;
  });
}

init().catch(console.error);

// Minimal UI
document.body.innerHTML = `
  <main style="font-family: system-ui; padding: 24px;">
    <h1>PWA + Firebase Push</h1>
    <p>Open DevTools console to see your FCM token.</p>
    <div id="log" style="margin-top:1rem; padding:1rem; border:1px solid #ddd; border-radius:8px;">No messages yet.</div>
    <button id="installBtn" style="margin-top:1rem;">Install PWA</button>
  </main>
`;

// Basic install prompt handling
let deferredPrompt: any = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
});
document.getElementById("installBtn")?.addEventListener("click", async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
});
