# Summarize with AI

A personal userscript fork that provides AI-powered article summarization with interactive features including image galleries, Q&A capabilities, and a beautifully designed interface following Dieter Rams' design principles.

> **Note**: This is a personal fork of the original [Summarize with AI](https://github.com/insign/userscripts) by Hélio. Enhanced for personal use with documentation and automated deployment. See [FORK.md](FORK.md) for details.

## Features

### Core Functionality
- **One-Click AI Summarization**: Instantly summarize articles using Claude AI with a single button press (Alt+S)
- **Publication-Specific Prompts**: Tailored summarization strategies for different publication types:
  - Research-focused summaries for Harvard Business Review and Inoreader
  - News-focused summaries for Financial Times, The Economist, and The Guardian
- **Custom Model Support**: Add and manage custom Claude models
- **Smart Content Extraction**: Uses Mozilla's Readability.js for accurate article content extraction

### Interactive Features
- **Image Gallery & Lightbox**:
  - Automatically extracts up to 12 relevant images from articles
  - Grid-based gallery display with up to 6 images shown
  - Full-screen lightbox viewer with keyboard navigation and swipe gestures
  - Support for interactive charts and visualizations (iframes)
  - Site-specific extraction optimizations for major publishers

- **Q&A System**:
  - Ask follow-up questions about the article
  - Context-aware responses combining article content with expert knowledge
  - Concise answers limited to 150 words
  - HTML-formatted responses with sections and bullet points

- **Copy Summary**:
  - One-click copy with HTML formatting preserved
  - Multiple fallback strategies for maximum compatibility
  - Protection against site interference (e.g., FT.com attribution)
  - Visual feedback with "Copied ✓" confirmation

### User Experience
- **Professional UI Design**:
  - Dieter Rams-inspired minimalist design system
  - Comprehensive CSS variable system for consistent theming
  - Smooth animations and transitions
  - Dark mode auto-detection and support

- **Custom Modal System**:
  - Native-looking modals replacing browser dialogs
  - Keyboard navigation (Enter/Escape)
  - Mobile-responsive with touch support
  - Accessible and user-friendly

- **Mobile Optimized**:
  - Touch-friendly interface with proper tap targets
  - Swipe gestures for lightbox navigation
  - Fixed menu bar at bottom for easy access
  - Full-screen overlays on mobile devices
  - Prevention of accidental zoom on button taps

- **Smart Button Behavior**:
  - Long-press or tap-and-hold to select models
  - Auto-hides when typing in input fields
  - Context-aware visibility

### Supported Sites
Currently whitelisted for optimal experience on:
- Financial Times (ft.com)
- Harvard Business Review (hbr.org)
- The Economist (economist.com)
- The Guardian (theguardian.com)
- Inoreader (inoreader.com) - with text selection support

## Installation

### Prerequisites
1. A userscript manager browser extension:
   - [Tampermonkey](https://www.tampermonkey.net/) (Chrome, Firefox, Safari, Edge)
   - [Greasemonkey](https://www.greasespot.net/) (Firefox)
   - [Violentmonkey](https://violentmonkey.github.io/) (Chrome, Firefox, Edge)

2. An Anthropic API key ([Get one here](https://console.anthropic.com/))

### Installation Steps
1. Install a userscript manager for your browser
2. Click the install link: **[Install Summarize with AI](https://gokulsp.github.io/Summarize-with-AI/Summarize%20with%20AI.user.js)**
3. Your userscript manager will prompt you to install - click "Install"
4. Visit any supported site (ft.com, hbr.org, economist.com, theguardian.com, or inoreader.com)
5. When prompted, enter your Anthropic API key

## Usage

### Basic Summarization
1. Navigate to an article on a supported site
2. Click the floating "S" button (bottom-right corner) or press **Alt+S**
3. The summary will appear in a beautiful overlay with:
   - Structured summary with key insights
   - Image gallery (if available)
   - Q&A input field
   - Copy button to save the summary

### Selecting Models
1. Long-press (500ms) or tap-and-hold the "S" button
2. A dropdown will appear showing available models
3. Click a model to select it and start summarization
4. Your selection is remembered for next time

### Adding Custom Models
1. Open the model dropdown (long-press "S" button)
2. Click "+ Add Custom Model" at the bottom
3. Enter "claude" as the service
4. Enter the exact Claude model ID (e.g., `claude-3-opus-20240229`)
5. The model will be added and available for selection

### Managing API Keys
1. Open the model dropdown
2. Click "Reset Key" next to the service name (e.g., "CLAUDE")
3. Enter your new API key or leave blank to clear

### Asking Questions
1. After viewing a summary, find the input field: "Ask a question about this article"
2. Type your question
3. Press Enter or click the "Ask" button
4. The answer appears below with formatted sections

### Using Inoreader Integration
1. On Inoreader, select at least 50 characters of text
2. Click the "S" button or press Alt+S
3. The selected text will be summarized

### Keyboard Shortcuts
- **Alt+S**: Trigger summarization
- **Escape**: Close overlay or dropdown
- **Arrow Keys**: Navigate lightbox images (when open)
- **Enter**: Submit Q&A question (when focused on input)

## Configuration

### Customizing Behavior
The script includes extensive configuration options in the `CONFIG` object:

```javascript
CONFIG = {
  timing: {
    longPressDuration: 500,        // ms to trigger model selection
    apiRequestTimeout: 60000,       // API timeout
  },
  limits: {
    maxImages: 12,                  // Max images to extract
    targetWordCount: 300,           // Target summary length
    bulletPointMaxWords: 20,        // Max words per bullet
  }
}
```

### Publication-Specific Prompts
Summaries are automatically tailored based on the site:
- **Research publications** (HBR, Inoreader): Focus on strategic insights, frameworks, and actionable applications
- **News publications** (FT, Economist, Guardian): Focus on current events, impact, and context

## Architecture

### Service Layer
- **StorageService**: Manages all GM storage operations (API keys, models, preferences)
- **NotificationService**: User-friendly notifications using custom modals
- **ModalService**: Professional modal dialogs (alert, confirm, prompt)
- **PromptBuilder**: Dynamic prompt generation based on publication type
- **UIHelpers**: Common UI operations
- **Validators**: Input validation logic

### Performance Optimizations
- Pre-compiled regex patterns for faster text processing
- LRU cache for model configurations (max 50 entries)
- Event delegation for gallery and dropdown items
- DOM element caching to reduce queries
- Lazy loading detection with Intersection Observer API
- Batch DOM operations to minimize reflows

### Design System
- CSS variables for theming (colors, spacing, typography)
- 8px grid system for consistent spacing
- Shadow elevation system (4 levels)
- Dark mode support with proper contrast ratios
- Mobile-first responsive design

## Development

### Prerequisites
- Node.js 18+ and pnpm
- Git

### Setup
```bash
git clone https://github.com/yourusername/Summarize-with-AI.git
cd Summarize-with-AI
pnpm install
```

### Code Quality
The project uses:
- **Biome**: Fast formatter and linter
- **Husky**: Git hooks for pre-commit checks
- **Pre-commit hook**: Automatically formats code and syncs metadata

### Making Changes
1. Edit the main file: `Summarize with AI.user.js`
2. Test on supported sites
3. Commit (Husky will format and validate)
4. Push changes

### Building
The script is self-contained and doesn't require a build step. However, metadata is automatically synced:
```bash
# Manually sync metadata (done automatically on commit)
python sync-meta.py
```

## Browser Compatibility

### Tested Browsers
- Chrome 120+
- Firefox 121+
- Edge 120+
- Safari 17+ (with Tampermonkey)

### Known Issues
- Some sites may have Content Security Policy restrictions
- Copy functionality may be limited on certain sites due to clipboard API restrictions

## API Usage & Costs

The script uses the Anthropic Claude API. Typical costs:
- Claude Sonnet 4.5: ~$3 per 1M input tokens, ~$15 per 1M output tokens
- Average article summary: ~1,000 input tokens + ~300 output tokens
- Estimated cost per summary: $0.004-0.008

You can monitor your usage at [Anthropic Console](https://console.anthropic.com/).

## Privacy & Security

- API keys are stored locally in your browser using GM storage
- No data is sent to any server except Anthropic's API
- Article content is only sent to Anthropic for summarization
- No analytics or tracking
- Open source for full transparency

## Troubleshooting

### "Article content not found or not readable"
- The page may not be an article or may not have enough content
- Try refreshing the page
- Check if the site is in the supported list

### "API key for CLAUDE is required"
- Click the dropdown (long-press "S" button)
- Click "Reset Key" next to "CLAUDE"
- Enter your Anthropic API key

### Images not appearing
- Some sites may block image extraction
- Images need to meet minimum dimensions (600x400)
- Check browser console for extraction details

### Copy not working
- Try the fallback: Select summary text and use Ctrl+C
- Some sites interfere with clipboard operations
- Check browser clipboard permissions

### Button not visible
- The button auto-hides when typing in input fields
- Check if you're on a supported site
- Verify the article is recognized as readerable

## License

This project is licensed under the WTFPL (Do What The F*ck You Want To Public License).
See [LICENSE](LICENSE) for details.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and changes.

## Credits

- **Readability.js**: Mozilla's article extraction library
- **Anthropic Claude**: AI summarization engine
- **Dieter Rams**: Design inspiration for the UI

## About This Fork

This is a personal fork for individual use. For questions about the original project, please contact Hélio at open@helio.me or visit the [original repository](https://github.com/insign/userscripts).

## Authors

**Original Project:**
- **Hélio** ([@insign](https://github.com/insign)) - Original creator

**This Personal Fork:**
- **Gokul SP** ([@gokulsp](https://github.com/gokulsp)) - Personal fork for individual use
- **Claude (Anthropic)** - AI assistant for documentation and setup

---

*Personal fork of the original [Summarize with AI](https://github.com/insign/userscripts) by Hélio*
