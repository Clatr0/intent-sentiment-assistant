# Sidecar Chrome Extension

AI Communication Assistant - Privacy-first browser extension for managing workplace situations.

## Features

- **Situation Tracking**: Create and manage workplace situations/issues
- **Content Capture**: Easily capture messages from Slack and Gmail
- **AI Analysis**: Generate briefs and suggested actions using local LLM (Ollama)
- **Privacy First**: All data stored locally, analysis done on-device
- **Side Panel**: Full management interface in Chrome's side panel

## Installation

### Development Mode

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked" and select the `extension` folder
4. The Sidecar icon should appear in your toolbar

### Icons

Before loading, you'll need to add icon files:
- `public/icons/icon16.png` (16x16)
- `public/icons/icon32.png` (32x32)
- `public/icons/icon48.png` (48x48)
- `public/icons/icon128.png` (128x128)

## Usage

### Quick Access (Popup)
Click the Sidecar icon in your toolbar to:
- Create new situations
- View active situations
- Capture selected text from the current page

### Full Interface (Side Panel)
Click the expand icon in the popup or use the context menu to open the full side panel interface with:
- Complete situation management
- Participant tracking
- Communication timeline
- AI-generated briefs
- Settings configuration

### Capturing Content
1. **From Slack/Gmail**: Highlight text and click "Capture Selection" in the popup
2. **Using Context Menu**: Right-click selected text and choose "Add to Sidecar Situation"
3. **In-page Buttons**: Use the Sidecar buttons that appear on Slack messages

## Configuration

### Local LLM (Ollama)
1. Install [Ollama](https://ollama.ai)
2. Pull a model: `ollama pull llama3:8b`
3. Keep Ollama running when using Sidecar
4. Default endpoint: `http://localhost:11434`

### Cloud LLM (Optional)
For complex reasoning on anonymized data:
1. Enable in Settings
2. Add your Anthropic API key
3. Note: Only anonymized summaries are sent to cloud

## Privacy

- All situation data stored locally in Chrome storage
- Communications are processed on-device
- Cloud LLM (if enabled) only receives anonymized summaries
- No tracking or analytics

## Development

This is a vanilla JavaScript Chrome Extension (Manifest V3):
- No build step required
- Edit files and reload extension to see changes
- Use Chrome DevTools for debugging

### File Structure
```
extension/
├── manifest.json          # Extension manifest
├── src/
│   ├── popup/            # Toolbar popup UI
│   ├── sidepanel/        # Side panel UI
│   ├── background/       # Service worker
│   ├── content/          # Content scripts (Slack, Gmail)
│   └── shared/           # Shared types and utilities
└── public/
    └── icons/            # Extension icons
```

## Permissions

- `storage`: Store situations and settings locally
- `sidePanel`: Enable Chrome side panel
- `activeTab`: Capture content from current tab
- `identity`: OAuth for Gmail (if used)
- Host permissions: Slack, Gmail, Zoom, Ollama, Anthropic API
