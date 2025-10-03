# Intent Assistant Chrome Extension - Installation Guide

## Quick Start

### 1. Install the Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top right)
3. Click **Load unpacked**
4. Select the `extension/dist` folder from this project
5. The Intent Assistant extension should now appear in your extensions list

### 2. Start the Backend Server

Make sure the backend server is running on localhost:5000:

```bash
npm run dev
```

The extension is configured to communicate with `http://localhost:5000/api`

### 3. Start Typing!

1. Navigate to any website (e.g., Amazon, Google, Reddit)
2. Click into any text input field or textarea
3. Start typing naturally
4. After typing at least 10 characters and pausing for 500ms, the extension will:
   - Extract the last 6 words you typed
   - Send them to the matching service
   - Display a toast notification with relevant help cards (if a match is found)

### Example Intent Phrases to Try:

- **Shopping**: "need to buy a new laptop" → Amazon/shopping recommendations
- **Food**: "where to order pizza near me" → DoorDash/food delivery
- **Jobs**: "looking for software engineer jobs" → LinkedIn/Indeed
- **SaaS**: "need project management software" → Asana/Trello
- **Travel**: "want to book a flight to Paris" → Expedia/travel sites
- **Creator**: "how to edit videos professionally" → Adobe/video tools

## Extension Features

### Privacy Controls

- **Password Protection**: Automatically skips password fields
- **Per-Site Suppression**: Right-click → "Don't show Intent Assistant on this site"
- **Category Toggles**: Click extension icon → toggle categories on/off
- **Data Minimization**: Only sends last 6 words + URL origin (no personal data)

### Rate Limiting

- Toast notifications limited to once every 15 seconds
- Prevents notification spam while you type

### Settings Popup

Click the extension icon to:
- Enable/disable specific categories (shopping, food, jobs, etc.)
- View suppressed sites
- Clear all suppressions

## Troubleshooting

### Extension Not Working?

1. **Check Backend**: Ensure `npm run dev` is running on port 5000
2. **Check Console**: Right-click page → Inspect → Console tab for errors
3. **Reload Extension**: Go to `chrome://extensions/` → click reload icon
4. **Test Input**: Make sure you're typing in a text field (not password)
5. **Check Length**: Type at least 10 characters for intent capture

### No Toast Appearing?

1. Check if you've suppressed the current site
2. Wait 15 seconds between attempts (rate limit)
3. Try typing one of the example phrases above
4. Check if the category is enabled in the popup settings

### API Errors?

- Verify backend is running: `curl http://localhost:5000/api/match`
- Check extension console: Right-click extension icon → Inspect popup

## How It Works

1. **Content Script** monitors text inputs across all websites
2. **Debouncing** waits 500ms after you stop typing
3. **Intent Extraction** grabs your last 6 words
4. **Privacy Check** skips password fields, checks site suppression
5. **API Call** sends intent + URL origin to `/api/match`
6. **Fuzzy Matching** finds best matching help card (Jaro-Winkler ≥0.6)
7. **Toast Display** shows sponsored + organic resources in isolated overlay
8. **Feedback Tracking** logs clicks and helpfulness for analytics

## Production Deployment

For production use, update the API URL in `extension/src/content.ts`:

```typescript
private readonly API_BASE_URL = 'https://your-production-domain.com/api';
```

Then rebuild: `cd extension && npx vite build`
