import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";

// 1) Init Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDZmPVEJhZsFvvEgdqXk-YnGZH1PFXUjS4",
  authDomain: "notofications-push-test.firebaseapp.com",
  projectId: "notofications-push-test",
  storageBucket: "notofications-push-test.firebasestorage.app",
  messagingSenderId: "809930765442",
  appId: "1:809930765442:web:deff74bea605f951c5309b",
  measurementId: "G-MB5J0Y3MNP"
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
  const vapidKey = "BLg1riNSPL56-dd3dX-X7uPLeX-MSjJo_2OePWSX96tBd5cBlAvGbQ3-jnR4-KJ95gbIjQy6K6-bj-MBdgOlMYM";
  const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: await navigator.serviceWorker.getRegistration() });
  console.log("FCM token:", token);

  // Display token in UI for mobile access
  const tokenDiv = document.getElementById("token")!;
  if (token) {
    tokenDiv.innerHTML = `
      <div style="background: #f5f5f5; padding: 10px; border-radius: 8px; word-break: break-all; font-size: 12px; margin-bottom: 10px;">
        ${token}
      </div>
      <button id="copyTokenBtn" style="padding: 8px 16px; background: #4285f4; color: white; border: none; border-radius: 4px; cursor: pointer;">
        Copy Token
      </button>
    `;
    
    // Add copy functionality
    document.getElementById("copyTokenBtn")?.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(token);
        const btn = document.getElementById("copyTokenBtn")!;
        btn.textContent = "Copied!";
        setTimeout(() => btn.textContent = "Copy Token", 2000);
      } catch (err) {
        console.error("Copy failed:", err);
        // Fallback for older browsers
        const textArea = document.createElement("textarea");
        textArea.value = token;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        
        const btn = document.getElementById("copyTokenBtn")!;
        btn.textContent = "Copied!";
        setTimeout(() => btn.textContent = "Copy Token", 2000);
      }
    });
  } else {
    tokenDiv.innerHTML = '<p style="color: red;">Failed to generate FCM token</p>';
  }

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
  <main style="font-family: system-ui; padding: 24px; max-width: 600px; margin: 0 auto;">
    <h1>PWA + Firebase Push</h1>
    
    <div style="margin-bottom: 2rem;">
      <h3 style="margin-bottom: 10px;">FCM Token:</h3>
      <div id="token" style="margin-bottom: 10px;">
        <p style="color: #666;">Loading token...</p>
      </div>
    </div>
    
    <div style="margin-bottom: 2rem;">
      <h3 style="margin-bottom: 10px;">Messages:</h3>
      <div id="log" style="padding:1rem; border:1px solid #ddd; border-radius:8px; background: #fafafa;">No messages yet.</div>
    </div>
    
    <button id="installBtn" style="padding: 12px 24px; background: #4285f4; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px;">
      Install PWA
    </button>
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
