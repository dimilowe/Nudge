# Chrome Extension Manual Testing Guide

## Prerequisites

1. **Backend Running**: Ensure the backend is running on `http://localhost:5000`
   ```bash
   npm run dev
   ```

2. **Extension Built**: Build the extension bundle
   ```bash
   cd extension && npx vite build && mkdir -p dist/popup && cp popup/index.html popup/popup.css dist/popup/ && cp manifest.json dist/
   ```

## Loading the Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right)
3. Click "Load unpacked"
4. Select the `extension/dist` folder
5. The "Intent Assistant" extension should now appear in your extensions list

## Test 1: Basic Intent Matching & Toast Display

**Goal**: Verify keystroke capture, API matching, and toast overlay display

1. Navigate to any website with a text input (e.g., https://www.google.com, or http://localhost:5000)
2. Click into the search/text box
3. Type one of the seeded intents:
   - "I need timberland boots for hiking"
   - "looking for chicken curry recipe tonight"
   - "need resume template for job application"
   - "want crm for small business startup"
   - "searching cheap flights to miami"
   - "how to grow my tiktok following"

**Expected Result**:
- After 500ms of typing, a toast appears in the bottom-right corner
- Toast shows both **Sponsored** (blue/gradient) and **Free Help** (slate) sections
- Toast displays:
  - Match title based on your intent
  - Subtitle with additional context
  - CTA buttons for both sponsored and organic links
  - Close button (✕) in top-right
  - Progress bar at bottom (12s auto-dismiss)
- Hovering over toast pauses the auto-dismiss timer

## Test 2: Toast Interactions

**Goal**: Verify toast UI interactions work correctly

1. Type an intent to trigger a toast
2. **Test Close Button**: Click the ✕ button → Toast should disappear immediately
3. **Test Sponsored CTA**: Click the sponsored CTA button → Opens link in new tab, records feedback
4. **Test Organic CTA**: Click the organic CTA button → Opens link in new tab, records feedback
5. **Test Feedback Buttons**: Click 👍 or 👎 → Button should change color, feedback recorded
6. **Test Auto-dismiss**: Wait 12 seconds without hovering → Toast disappears automatically
7. **Test Hover Pause**: Hover over toast → Progress bar pauses, toast doesn't dismiss

## Test 3: Per-Site Suppression

**Goal**: Verify "Don't show on this site" functionality

1. Navigate to a test website (e.g., https://www.example.com)
2. Type an intent to trigger a toast
3. Click "🚫 Don't show on this site" at the bottom of the toast
4. Toast should disappear immediately
5. Try typing another intent on the same site
6. **Expected**: No toast should appear (site is suppressed)

**Verify Suppression Persists**:
1. Click the extension icon in Chrome toolbar
2. Settings popup should open
3. Under "Suppressed Sites", you should see the suppressed origin (e.g., "https://www.example.com")
4. Click the 🗑️ button next to the site to remove suppression
5. Type an intent again → Toast should reappear

## Test 4: Category Toggles

**Goal**: Verify category filtering works

1. Click the extension icon to open settings popup
2. Under "Categories", you'll see 6 checkboxes:
   - 🛍️ Shopping
   - 🍽️ Food & Recipes
   - 💼 Jobs & Career
   - 💻 SaaS & Tools
   - ✈️ Travel
   - 🎬 Creator Tools

**Test Disabling a Category**:
1. Uncheck "Shopping" category
2. Navigate to any website
3. Type "timberland boots" (shopping intent)
4. **Expected**: No toast should appear
5. Type "chicken curry recipe" (food intent)
6. **Expected**: Toast appears (food category still enabled)

**Test Re-enabling**:
1. Open settings popup again
2. Re-check "Shopping" category
3. Type "timberland boots" again
4. **Expected**: Toast appears

## Test 5: Rate Limiting

**Goal**: Verify only 1 toast per 15 seconds

1. Navigate to any website
2. Type "timberland boots" → Toast appears
3. Immediately close the toast
4. Within 15 seconds, type "chicken curry recipe"
5. **Expected**: No new toast appears (rate limited)
6. Wait 15 seconds
7. Type "chicken curry recipe" again
8. **Expected**: Toast appears (rate limit expired)

## Test 6: Privacy - Last 6 Words Only

**Goal**: Verify only last 6 words are sent to API

1. Open browser DevTools (F12) → Network tab
2. Filter by "match" to see API calls
3. Type a long sentence: "This is a very long sentence but I really just want timberland boots for my trip"
4. Check the network request payload
5. **Expected**: Request body should only contain `"text": "just want timberland boots for my"`
6. Settings popup footer should show "🔒 Only last 6 words + URL origin sent"

## Test 7: Fuzzy Matching Edge Cases

**Goal**: Verify fuzzy matching with typos and variations

1. Test exact match:
   - Type: "timberland boots" → Should match (score 1.0)
   
2. Test token overlap:
   - Type: "need resume templates" → Should match "resume template" (score 1.0)
   - Type: "best crm software" → Should match "crm for small business" (score 0.6-1.0)

3. Test Jaro-Winkler similarity:
   - Type: "cheap miami flights" → Should match "cheap flights to miami" (score 0.8)
   - Type: "tiktok growth tips" → Should match "grow my tiktok" (score 0.6-0.8)

4. Test no match:
   - Type: "completely unrelated random text here" → Should NOT match (no toast)

## Test 8: Background Service Worker

**Goal**: Verify context menu and background events

1. Right-click anywhere on a webpage
2. Look for "Intent Assistant Settings" in context menu
3. Hover over it → Should see category toggle options
4. Click a category toggle → Should enable/disable that category
5. Open DevTools → Console → Look for extension logs
6. **Expected**: Should see "Intent Assistant installed" message when extension loads

## Test 9: Popup UI

**Goal**: Verify settings popup renders correctly

1. Click extension icon in toolbar
2. **Verify Header**:
   - ✨ icon and "Intent Assistant" title
   - "Privacy-friendly help" subtitle
3. **Verify Categories Section**:
   - All 6 categories listed with icons
   - Checkboxes work (toggle on/off)
   - Descriptions visible
4. **Verify Suppressed Sites Section**:
   - Shows "No suppressed sites" if empty
   - Shows list of suppressed sites if any exist
   - Remove buttons (🗑️) work
   - "Clear All" button works if sites exist
5. **Verify Footer**:
   - Privacy note: "🔒 Only last 6 words + URL origin sent"

## Test 10: Shadow DOM Isolation

**Goal**: Verify extension doesn't break page styles

1. Navigate to various websites with complex styling:
   - https://www.tailwindcss.com
   - https://www.github.com
   - https://www.reddit.com
2. Type an intent to trigger toast
3. **Verify**:
   - Toast appears with correct styling
   - Page styles are not affected
   - Toast is always on top (z-index 999999)
   - Toast doesn't shift page layout
   - No CSS conflicts visible

## Debugging Tips

**Extension Not Loading**:
- Check manifest.json paths are correct
- Verify all files are in `extension/dist/` folder
- Look for errors in `chrome://extensions/` 
- Check extension service worker console (Inspect views → service worker)

**Toast Not Appearing**:
- Verify backend is running on port 5000
- Check browser console for CORS errors
- Verify input field is a text input/textarea
- Check chrome.storage is accessible (permissions)
- Ensure category is enabled in settings

**API Errors**:
- Check Network tab for failed /api/match requests
- Verify request payload format
- Check backend logs for errors
- Test API directly with curl

**Storage Issues**:
- Open DevTools → Application → Storage → Extension Storage
- Check for 'intent-assistant-data' key
- Verify data structure: {suppressedSites[], enabledCategories[], lastToastTime}

## Success Criteria

All tests pass if:
- ✅ Toast appears within ~1s of typing seeded intents
- ✅ Sponsored + Organic cards display correctly
- ✅ All interactive elements (close, CTA, feedback) work
- ✅ Per-site suppression persists and can be managed
- ✅ Category toggles filter toasts correctly
- ✅ Rate limiting prevents spam (max 1 toast per 15s)
- ✅ Only last 6 words sent to API (verified in Network tab)
- ✅ Fuzzy matching works with variations and typos
- ✅ Popup UI renders correctly and is functional
- ✅ No page style conflicts or layout issues

## Known Limitations

- Extension requires backend running locally on port 5000
- Chrome only (Manifest V3) - not tested on Firefox/Safari
- Shadow DOM may not work in very old Chrome versions
- Context menu may not work on chrome:// pages
- Storage uses chrome.storage.local (limited to ~5MB)
