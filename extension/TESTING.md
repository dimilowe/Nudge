# Chrome Extension Manual Testing Script

## Prerequisites
✅ Backend server running on localhost:5000 (`npm run dev`)
✅ Extension built in `extension/dist/` folder

## Installation Steps

1. **Load Extension in Chrome:**
   - Open Chrome and go to `chrome://extensions/`
   - Enable **Developer mode** (toggle in top-right corner)
   - Click **Load unpacked**
   - Navigate to and select `extension/dist` folder
   - Extension should appear with "Intent Assistant" ✨ icon

2. **Verify Extension Loaded:**
   - Look for "Intent Assistant" card in extensions list
   - Should show status: "Enabled"
   - Click extension icon to open popup settings

## Test Cases

### Test 1: Basic Keystroke Capture (Shopping)
**Steps:**
1. Open a new tab and go to `https://www.google.com`
2. Click into the Google search box
3. Type slowly: `need to buy a new laptop`
4. Wait 500ms (stop typing)

**Expected Result:**
- Toast notification appears with shopping recommendation
- Shows both sponsored (e.g., Amazon) and organic results
- Toast includes "Helpful?" feedback buttons

### Test 2: Cross-Site Capture (Food)
**Steps:**
1. Open `https://www.reddit.com`
2. Click into any comment box or search field
3. Type: `where to order pizza near me`
4. Wait 500ms

**Expected Result:**
- Toast appears with food delivery recommendations
- Should work identically to Google (proves cross-site)

### Test 3: Password Field Protection
**Steps:**
1. Open `https://www.github.com/login`
2. Click into the password field
3. Type anything

**Expected Result:**
- ❌ NO toast should appear (privacy protection working)

### Test 4: Category Toggle
**Steps:**
1. Click extension icon in toolbar
2. In popup, toggle "Shopping" category OFF
3. Go to any site and type: `need to buy shoes`

**Expected Result:**
- ❌ No toast appears (category disabled)
- Re-enable category, try again
- ✅ Toast should appear now

### Test 5: Site Suppression
**Steps:**
1. On any site where toast appears, right-click anywhere
2. Look for context menu item: "Don't show Intent Assistant on this site"
3. Click it
4. Try typing an intent phrase again

**Expected Result:**
- ❌ No toast on this site anymore
- Check popup → should show site in "Suppressed Sites" list
- Click "Clear All" to re-enable

### Test 6: Rate Limiting
**Steps:**
1. Type `looking for software jobs` → wait for toast
2. Immediately type `need project management tool`
3. Try within 15 seconds

**Expected Result:**
- ❌ Second toast blocked (rate limit active)
- Wait 15 seconds, try again
- ✅ Toast should appear now

### Test 7: Feedback Tracking
**Steps:**
1. Trigger a toast with any intent phrase
2. Click "👍 Helpful" button

**Expected Result:**
- Toast disappears
- Backend logs should show feedback update
- Check analytics dashboard (`/analytics`) → feedback count increases

### Test 8: Click Tracking
**Steps:**
1. Trigger a toast (e.g., "buy winter boots")
2. Click on the sponsored link (e.g., "Shop on Amazon")

**Expected Result:**
- Opens link in new tab
- Backend logs click event
- Analytics shows CTR increase

### Test 9: All Intent Categories

Try each category with these phrases:

| Category | Phrase | Expected Card |
|----------|--------|---------------|
| Shopping | "buy winter boots" | Timberland/shopping sites |
| Food | "order sushi delivery" | DoorDash/food delivery |
| Jobs | "find software engineer job" | LinkedIn/job boards |
| SaaS | "need video editing software" | Adobe/video tools |
| Travel | "book flight to Paris" | Expedia/travel sites |
| Creator | "grow my tiktok account" | Creator tools/courses |

### Test 10: No Match Scenario
**Steps:**
1. Type completely random text: `asdfghjkl qwertyuiop`

**Expected Result:**
- ❌ No toast appears (no match found)
- Backend logs "matched: false"

### Test 11: Popup Settings Persistence
**Steps:**
1. Click extension icon → toggle "Food" category OFF
2. Add a site to suppressions (right-click → suppress)
3. Close Chrome completely (quit browser)
4. Restart Chrome
5. Click extension icon again

**Expected Result:**
- ✅ "Food" category still OFF (settings persisted)
- ✅ Suppressed site still in list
- Storage API successfully saved state

### Test 12: Analytics Dashboard Verification
**Steps:**
1. Open analytics dashboard: `http://localhost:5000/analytics`
2. Note current metrics (total matches, CTR, etc.)
3. Trigger a toast with: `buy winter boots`
4. Click the sponsored link (e.g., Amazon)
5. Click "👍 Helpful" button
6. Refresh analytics dashboard

**Expected Result:**
- Total Matches count +1
- Top Cards shows "timberland-boots" with updated stats
- CTR increased (clicked / impressions)
- Feedback rate shows helpful count increased
- Timeline chart shows new data point

**API Verification:**
1. Open Network tab → trigger toast → click feedback
2. Look for `PUT /api/feedback/{logId}` request
3. Verify response shows `{ success: true, updated: true }`
4. Check `GET /api/analytics` response includes new data

## Debugging

### Extension Console
1. Right-click extension icon → "Inspect popup"
2. Console shows storage operations and popup logic

### Content Script Console  
1. On any webpage, F12 → Console tab
2. Look for extension logs (keystroke capture, API calls)

### Background Service Worker
1. Go to `chrome://extensions/`
2. Click "Inspect views: service worker" under Intent Assistant
3. Check for context menu setup logs

### Network Tab
1. F12 → Network tab
2. Type an intent phrase
3. Look for POST to `localhost:5000/api/match`
4. Verify request body contains last 6 words

## Success Criteria

✅ Extension captures keystrokes across multiple websites
✅ Toast notifications appear with relevant help cards
✅ Password fields are skipped (privacy)
✅ Category toggles work correctly
✅ Site suppression works via context menu
✅ Rate limiting prevents toast spam (15s)
✅ Feedback and click tracking persists to database
✅ Analytics dashboard shows real data

## Common Issues

**Issue: Extension won't load**
- Check dist folder has manifest.json, content.js, background.js
- Verify Developer mode is enabled
- Try "Remove" and re-load the extension

**Issue: No toast appearing**
- Check backend is running: `curl http://localhost:5000/api/match`
- Check you typed 10+ characters
- Check category is enabled in popup
- Check site isn't suppressed
- Wait 15 seconds from last toast (rate limit)

**Issue: API errors in console**
- Verify API_BASE_URL in content.ts is `http://localhost:5000/api`
- Check CORS is enabled on backend
- Check network tab for failed requests

**Issue: Popup won't open**
- Check popup.js exists in dist/
- Check popup/index.html references ../popup.js correctly
- Inspect popup for console errors
