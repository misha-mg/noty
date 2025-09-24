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

function isSafari(): boolean {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}

function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function getSafariVersion(): number | null {
  const match = navigator.userAgent.match(/Version\/(\d+)/);
  return match ? parseInt(match[1]) : null;
}

function checkSafariPushSupport(): { supported: boolean; method: string; instructions: string } {
  if (!isSafari() && !isIOS()) {
    return { supported: true, method: 'standard', instructions: '' };
  }

  const safariVersion = getSafariVersion();
  
  // Check for various Safari push implementations
  if ('serviceWorker' in navigator && 'PushManager' in window) {
    return { 
      supported: true, 
      method: 'push-api', 
      instructions: 'Enable "Push API" in Safari Experimental Features' 
    };
  }
  
  // Safari 16+ might use Declarative Web Push
  if (safariVersion && safariVersion >= 16) {
    return { 
      supported: true, 
      method: 'declarative', 
      instructions: 'Enable "Declarative Web Push" in Safari Experimental Features' 
    };
  }
  
  return { 
    supported: false, 
    method: 'none', 
    instructions: 'Safari push notifications require Safari 16+ with experimental features enabled' 
  };
}

function showError(message: string, error?: any) {
  console.error(message, error);
  
  let alertMessage = `❌ ${message}`;
  
  if (error) {
    alertMessage += `\n\nDetails: ${error.message || error}`;
  }
  
  // Add Safari-specific instructions
  if (isSafari() || isIOS()) {
    const pushSupport = checkSafariPushSupport();
    const safariVersion = getSafariVersion();
    
    alertMessage += `\n\n🍎 Safari Users (v${safariVersion || 'unknown'}):`;
    
    if (pushSupport.method === 'declarative') {
      alertMessage += `\n\n📱 For Declarative Web Push:
1. Safari Settings → Advanced → Experimental Features
2. Enable "Declarative Web Push" 
3. Restart Safari
4. Add app to Home Screen (required for notifications)

⚠️ Note: FCM may not work with Declarative Web Push.
Consider using Safari's native push service instead.`;
    } else if (pushSupport.method === 'push-api') {
      alertMessage += `\n\n📱 For Push API:
1. Safari Settings → Advanced → Experimental Features  
2. Enable "Push API"
3. Restart Safari and try again`;
    } else {
      alertMessage += `\n\n❌ Safari version ${safariVersion} may not support push notifications.
Try updating Safari or use Chrome/Firefox for testing.`;
    }
  }
  
  alert(alertMessage);
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

async function trySafariNativePush() {
  try {
    console.log("🍎 Attempting Safari native push registration...");
    
    // For Declarative Web Push, we need to be installed as PWA
    const pushSupport = checkSafariPushSupport();
    
    if (pushSupport.method === 'declarative') {
      updateTokenUI(null, `Safari Declarative Web Push detected. 
      
Steps to enable:
1. Enable "Declarative Web Push" in Safari experimental features
2. Add this app to Home Screen
3. Notifications will work through Safari's system

Note: FCM (Firebase) tokens may not work with this method.`);
      return;
    }
    
    // Try direct push manager subscription for Safari
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        try {
          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: null // Safari may not need VAPID key
          });
          
          const endpoint = subscription.endpoint;
          console.log("✅ Safari push subscription created:", endpoint);
          
          updateTokenUI(endpoint, "Safari native push subscription (not FCM token)");
          return;
        } catch (subscribeError) {
          console.warn("Safari push subscription failed:", subscribeError);
        }
      }
    }
    
    // If all else fails, show Safari-specific guidance
    updateTokenUI(null, `Safari push setup incomplete. Try:

1. Update Safari to latest version
2. Enable experimental push features
3. Add app to Home Screen
4. Test in Chrome/Firefox as alternative

Current Safari version: ${getSafariVersion() || 'unknown'}`);
    
  } catch (error) {
    showError("Safari native push setup failed", error);
  }
}

async function init() {
  try {
    // 1) Safari Push Support Check and Instructions
    if (isSafari() || isIOS()) {
      const pushSupport = checkSafariPushSupport();
      const safariVersion = getSafariVersion();
      
      console.log(`🍎 Safari/iOS detected - Version: ${safariVersion}, Push method: ${pushSupport.method}`);
      
      let safariInstructions = `🍎 Safari Push Notifications Setup (v${safariVersion}):

`;

      if (pushSupport.method === 'declarative') {
        safariInstructions += `📱 Your Safari uses Declarative Web Push:

1️⃣ Enable Experimental Features:
   • Safari → Settings → Advanced → Experimental Features
   • Enable "Declarative Web Push"
   • Restart Safari

2️⃣ Install as PWA (REQUIRED):
   • Tap Share button → "Add to Home Screen"
   • Declarative Web Push only works for installed PWAs

3️⃣ Allow Notifications:
   • You'll be prompted after installation

⚠️ Important: FCM (Firebase) may not work with Declarative Web Push.
This app will try FCM first, but consider using Safari's native push service for production.

Continue anyway?`;
      } else if (pushSupport.method === 'push-api') {
        safariInstructions += `📱 Your Safari supports Push API:

1️⃣ Enable Experimental Features:
   • Safari → Settings → Advanced → Experimental Features
   • Enable "Push API"
   • Restart Safari

2️⃣ Allow Notifications:
   • You'll be prompted to allow notifications
   • Choose "Allow" when prompted

3️⃣ Install as PWA (recommended):
   • Tap Share button → "Add to Home Screen"

Continue to enable notifications now?`;
      } else {
        safariInstructions += `❌ Your Safari version may not support push notifications.

Options:
• Update Safari to the latest version
• Try Chrome or Firefox for testing
• Check if experimental features are available

Continue anyway to test?`;
      }
   
      const proceedWithSafari = confirm(safariInstructions);
      if (!proceedWithSafari) {
        updateTokenUI(null, "Setup cancelled. Please follow the instructions and try again.");
        return;
      }
    }

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
      if (isSafari() || isIOS()) {
        showError("FCM Push API not available in Safari. Please enable 'Push API' in Safari's Experimental Features and restart Safari.");
        updateTokenUI(null, "Push API not enabled in Safari experimental features");
      } else {
        showError("FCM is not supported in this browser");
        updateTokenUI(null, "FCM not supported in this browser");
      }
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
        // If FCM fails on Safari, try alternative approaches
        if (isSafari() || isIOS()) {
          console.warn("FCM token generation failed on Safari - trying alternative approach");
          await trySafariNativePush();
          return;
        }
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
const safariWarning = (isSafari() || isIOS()) ? (() => {
  const pushSupport = checkSafariPushSupport();
  const safariVersion = getSafariVersion();
  
  if (pushSupport.method === 'declarative') {
    return `
    <div style="background: #e7f3ff; border: 1px solid #87ceeb; padding: 15px; border-radius: 8px; margin-bottom: 2rem;">
      <h4 style="margin: 0 0 10px 0; color: #1e6ba0;">🍎 Safari Declarative Web Push (v${safariVersion})</h4>
      <p style="margin: 0; color: #1e6ba0; font-size: 14px;">
        <strong>Setup Required:</strong><br/>
        1. Settings → Advanced → Experimental Features<br/>
        2. Enable "Declarative Web Push"<br/>
        3. Restart Safari<br/>
        4. <strong>Add to Home Screen (Required!)</strong><br/><br/>
        ⚠️ <em>FCM may not work - this is experimental</em>
      </p>
    </div>`;
  } else {
    return `
    <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin-bottom: 2rem;">
      <h4 style="margin: 0 0 10px 0; color: #856404;">🍎 Safari Setup Required (v${safariVersion})</h4>
      <p style="margin: 0; color: #856404; font-size: 14px;">
        To enable push notifications in Safari:<br/>
        1. Settings → Advanced → Experimental Features<br/>
        2. Enable "Push API" or "Declarative Web Push"<br/>
        3. Restart Safari
      </p>
    </div>`;
  }
})() : '';

document.body.innerHTML = `
  <main style="font-family: system-ui; padding: 24px; max-width: 600px; margin: 0 auto;">
    <h1>PWA + Firebase Push</h1>
    
    ${safariWarning}
    
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
