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

function showError(message: string, error?: any) {
  console.error(message, error);
  alert(`❌ ${message}${error ? `\n\nDetails: ${error.message || error}` : ''}`);
}

function updateTokenUI(token: string | null, error?: string) {
  const tokenDiv = document.getElementById("token")!;
  
  if (error) {
    tokenDiv.innerHTML = `<p style="color: red; padding: 10px; background: #fee; border-radius: 8px;">❌ ${error}</p>`;
    return;
  }
  
  if (token) {
    tokenDiv.innerHTML = `
      <div style="background: #f5f5f5; padding: 10px; border-radius: 8px; word-break: break-all; font-size: 12px; margin-bottom: 10px;">
        ${token}
      </div>
      <button id="copyTokenBtn" style="padding: 8px 16px; background: #4285f4; color: white; border: none; border-radius: 4px; cursor: pointer;">
        Copy Token
      </button>
    `;
    
    // Add copy functionality with error handling
    document.getElementById("copyTokenBtn")?.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(token);
        const btn = document.getElementById("copyTokenBtn")!;
        btn.textContent = "Copied!";
        setTimeout(() => btn.textContent = "Copy Token", 2000);
      } catch (err) {
        try {
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
        } catch (fallbackErr) {
          showError("Failed to copy token to clipboard", fallbackErr);
        }
      }
    });
  } else {
    tokenDiv.innerHTML = '<p style="color: red; padding: 10px; background: #fee; border-radius: 8px;">❌ Failed to generate FCM token</p>';
  }
}

async function init() {
  try {
    // 2) Register service workers
    if ("serviceWorker" in navigator) {
      try {
        await navigator.serviceWorker.register("/sw.js");
        console.log("App shell service worker registered successfully");
      } catch (swError) {
        showError("Failed to register app shell service worker", swError);
      }
      
      try {
        await navigator.serviceWorker.register("/firebase-messaging-sw.js");
        console.log("Firebase messaging service worker registered successfully");
      } catch (fcmSwError) {
        showError("Failed to register Firebase messaging service worker", fcmSwError);
        return; // Can't continue without FCM service worker
      }
    } else {
      showError("Service Workers are not supported in this browser");
      return;
    }

    // 3) FCM support check
    let supported;
    try {
      supported = await isSupported();
    } catch (supportError) {
      showError("Failed to check FCM support", supportError);
      return;
    }
    
    if (!supported) {
      showError("FCM is not supported in this browser (likely Safari/iOS)");
      updateTokenUI(null, "FCM not supported in this browser");
      return;
    }

    // 4) Ask for Notification permission
    let permission;
    try {
      permission = await Notification.requestPermission();
    } catch (permError) {
      showError("Failed to request notification permission", permError);
      return;
    }
    
    if (permission !== "granted") {
      showError("Notification permission denied. Please enable notifications in browser settings.");
      updateTokenUI(null, "Notification permission denied");
      return;
    }

    // 5) Get FCM token with comprehensive error handling
    try {
      const messaging = getMessaging(app);
      const vapidKey = "BLg1riNSPL56-dd3dX-X7uPLeX-MSjJo_2OePWSX96tBd5cBlAvGbQ3-jnR4-KJ95gbIjQy6K6-bj-MBdgOlMYM";
      
      let serviceWorkerRegistration;
      try {
        serviceWorkerRegistration = await navigator.serviceWorker.getRegistration();
        if (!serviceWorkerRegistration) {
          throw new Error("Service worker registration not found");
        }
      } catch (regError) {
        showError("Failed to get service worker registration", regError);
        return;
      }
      
      const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration });
      
      if (!token) {
        throw new Error("FCM token is empty - check your Firebase configuration");
      }
      
      console.log("✅ FCM token generated successfully:", token);
      updateTokenUI(token);

      // 6) Set up foreground message handling with error handling
      try {
        onMessage(messaging, (payload) => {
          try {
            console.log("Message received in foreground:", payload);
            const title = payload?.notification?.title ?? payload?.data?.title ?? "New Message";
            const body = payload?.notification?.body ?? payload?.data?.body ?? "You have a new message";
            
            const div = document.getElementById("log");
            if (div) {
              div.innerHTML = `<strong>${title}</strong><br/>${body}<br/><small>${new Date().toLocaleTimeString()}</small>`;
            }
            
            // Show browser notification if page is not in focus
            if (document.hidden) {
              new Notification(title, { body, icon: '/icons/icon-192.png' });
            }
          } catch (msgError) {
            console.error("Error processing foreground message:", msgError);
          }
        });
      } catch (onMessageError) {
        showError("Failed to set up message handling", onMessageError);
      }

    } catch (tokenError) {
      showError("Failed to generate FCM token", tokenError);
      const errorMessage = tokenError instanceof Error ? tokenError.message : String(tokenError);
      updateTokenUI(null, `Token generation failed: ${errorMessage}`);
    }

  } catch (initError) {
    showError("Application initialization failed", initError);
  }
}

init().catch((error) => {
  showError("Critical application error during initialization", error);
});

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

// Basic install prompt handling with error handling
let deferredPrompt: any = null;
window.addEventListener("beforeinstallprompt", (e) => {
  try {
    e.preventDefault();
    deferredPrompt = e;
    console.log("PWA install prompt available");
  } catch (error) {
    showError("Error handling install prompt", error);
  }
});

document.getElementById("installBtn")?.addEventListener("click", async () => {
  try {
    if (!deferredPrompt) {
      alert("ℹ️ PWA install prompt is not available. This may be because:\n• The app is already installed\n• The browser doesn't support PWA installation\n• The install criteria haven't been met");
      return;
    }
    
    await deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;
    
    if (choiceResult.outcome === 'accepted') {
      console.log('✅ User accepted the PWA install prompt');
    } else {
      console.log('❌ User dismissed the PWA install prompt');
    }
    
    deferredPrompt = null;
  } catch (installError) {
    showError("Failed to install PWA", installError);
  }
});
