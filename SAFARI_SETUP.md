# Safari Push Notifications Setup

## 🍎 Enabling Push API in Safari

Safari requires experimental features to be enabled for Push API support. Follow these steps:

### Step 1: Enable Experimental Features

#### On iOS Safari:
1. Open **Settings** app
2. Scroll down and tap **Safari**
3. Tap **Advanced**
4. Tap **Experimental Features**
5. Find and enable **"Push API"**
6. Restart Safari

#### On macOS Safari:
1. Open **Safari**
2. Go to **Safari** → **Preferences** (or **Settings** in newer versions)
3. Click **Advanced** tab
4. Check **"Show Experimental Features in the Develop menu"**
5. Go to **Develop** → **Experimental Features**
6. Enable **"Push API"**
7. Restart Safari

### Step 2: Allow Notifications
1. Visit your PWA
2. When prompted, click **"Allow"** for notifications
3. If you missed the prompt, check Safari settings:
   - Safari → Settings → Websites → Notifications
   - Set your domain to "Allow"

### Step 3: Install as PWA (Recommended)
1. On iOS: Tap **Share** button → **"Add to Home Screen"**
2. On macOS: File → **"Add to Dock"** or **"Install App"**

### Troubleshooting

#### No Push API Option?
- Update Safari to the latest version
- The feature may not be available in older Safari versions

#### Still Not Working?
- Clear Safari cache and cookies
- Try in private/incognito mode first
- Check browser console for error messages
- Verify Firebase configuration

#### Alternative Testing
- Test in Chrome/Firefox first to verify Firebase setup
- Use Chrome Developer Tools for debugging

### Notes
- Push notifications in Safari are still experimental
- Behavior may change in future Safari updates
- For production apps, consider providing fallback mechanisms
- PWA installation improves notification reliability
