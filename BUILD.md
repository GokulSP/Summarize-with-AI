# Build & Development Guide

This document provides detailed instructions for personal development and maintenance of this Summarize with AI fork.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Development Setup](#development-setup)
- [Development Workflow](#development-workflow)
- [Code Quality Tools](#code-quality-tools)
- [Testing](#testing)
- [Release Process](#release-process)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software
- **Node.js**: Version 18 or higher
  - Download from [nodejs.org](https://nodejs.org/)
  - Verify installation: `node --version`

- **pnpm**: Fast, disk space efficient package manager
  - Install: `npm install -g pnpm`
  - Verify installation: `pnpm --version`

- **Git**: Version control
  - Download from [git-scm.com](https://git-scm.com/)
  - Verify installation: `git --version`

- **Python**: Version 3.6 or higher (for metadata sync script)
  - Download from [python.org](https://www.python.org/)
  - Verify installation: `python --version` or `python3 --version`

### Development Tools
- **Text Editor/IDE**: VS Code recommended
  - Install Biome extension for real-time linting
  - EditorConfig extension for consistent formatting

- **Browser with Userscript Manager**:
  - Chrome/Edge: [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/)
  - Firefox: [Tampermonkey](https://www.tampermonkey.net/) or [Greasemonkey](https://www.greasespot.net/)
  - Safari: [Tampermonkey](https://www.tampermonkey.net/)

## Development Setup

### 1. Clone the Repository
```bash
git clone https://github.com/gokulsp/Summarize-with-AI.git
cd Summarize-with-AI
```

### 2. Install Dependencies
```bash
pnpm install
```

This installs:
- `@biomejs/biome`: Fast formatter and linter
- `husky`: Git hooks for pre-commit checks

### 3. Configure Git Hooks
```bash
pnpm run prepare
```

This sets up Husky git hooks that will:
- Format code with Biome before commits
- Sync metadata file automatically
- Validate script headers

### 4. Install the Userscript Locally
1. Open your userscript manager dashboard
2. Create a new userscript
3. Copy the contents of `Summarize with AI.user.js`
4. Save the userscript
5. Configure it to check for updates from your local file path or enable auto-reload

## Development Workflow

### Project Structure
```
Summarize-with-AI/
├── .github/
│   ├── workflows/          # GitHub Actions workflows
│   │   ├── lint.yml       # Linting on PR/push
│   │   └── release.yml    # Automated releases
│   ├── ISSUE_TEMPLATE/    # Issue templates
│   └── PULL_REQUEST_TEMPLATE.md
├── .husky/
│   └── pre-commit.js      # Pre-commit hook script
├── Example/
│   └── Initial.js         # Original version for reference
├── Summarize with AI.user.js   # Main userscript file
├── Summarize with AI.meta.js   # Auto-generated metadata
├── sync-meta.py           # Python script to sync metadata
├── biome.json             # Biome configuration
├── package.json           # Project dependencies
├── .editorconfig          # Editor configuration
├── .gitignore             # Git ignore rules
├── README.md              # Project documentation
├── CHANGELOG.md           # Version history
├── CONTRIBUTING.md        # Contribution guidelines
├── LICENSE                # WTFPL license
└── BUILD.md               # This file
```

### Making Code Changes

#### 1. Create a Feature Branch
```bash
git checkout -b feature/your-feature-name
```

#### 2. Edit the Main File
All code is in `Summarize with AI.user.js`. The file is structured as follows:

```javascript
// ==UserScript==
// @name         Summarize with AI
// @version      2025.12.27.XX  // Update this on changes
// ... metadata ...
// ==/UserScript==

(() => {
  // Configuration
  const CONFIG = { /* ... */ }

  // State
  const state = { /* ... */ }

  // DOM Cache
  const dom = { /* ... */ }

  // Services
  const StorageService = { /* ... */ }
  const NotificationService = { /* ... */ }
  // ... etc

  // Main initialization
  initializeScript()
})()
```

#### 3. Update Version Number
When making changes, update the version in the script header:
```javascript
// @version     2025.12.27.XX
```

Format: `YYYY.MM.DD.XX` where XX is the iteration number for that day.

#### 4. Test Your Changes
1. Save the file
2. Reload the userscript in your browser
3. Visit a supported site (ft.com, hbr.org, economist.com, etc.)
4. Test the functionality you changed
5. Check the browser console (F12) for errors

#### 5. Commit Your Changes
```bash
git add .
git commit -m "feat: description of your changes"
```

The pre-commit hook will automatically:
- Format your code with Biome
- Sync the metadata file
- Check for errors

Commit message prefixes:
- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting)
- `refactor:` - Code refactoring
- `perf:` - Performance improvements
- `test:` - Test changes
- `chore:` - Maintenance tasks

## Code Quality Tools

### Biome

Biome is a fast formatter and linter for JavaScript.

#### Format Code
```bash
# Format all files
pnpm exec biome format --write .

# Format specific file
pnpm exec biome format --write "Summarize with AI.user.js"
```

#### Lint Code
```bash
# Lint and show issues
pnpm exec biome lint .

# Lint and auto-fix issues
pnpm exec biome lint --write .
```

#### Check (Format + Lint)
```bash
# Check everything (format + lint)
pnpm exec biome check .

# Check and auto-fix
pnpm exec biome check --write .
```

### Configuration

Biome configuration is in `biome.json`:
- **Formatter**: Tab indentation, 100 char line width, single quotes
- **Linter**: Enabled with recommended rules plus custom rules
- **Ignored files**: node_modules, .husky, .vscode, .claude, Example/, *.meta.js

### Sync Metadata

The metadata file (`Summarize with AI.meta.js`) must stay in sync with the main script header.

```bash
# Manually sync metadata
python sync-meta.py
# or
python3 sync-meta.py
```

This is automatically done by the pre-commit hook.

## Testing

### Manual Testing Checklist

Test on supported sites:
- [ ] **Financial Times** (ft.com)
- [ ] **Harvard Business Review** (hbr.org)
- [ ] **The Economist** (economist.com)
- [ ] **The Guardian** (theguardian.com)
- [ ] **Inoreader** (inoreader.com)

Test features:
- [ ] Button appears on articles
- [ ] Alt+S keyboard shortcut works
- [ ] Long-press opens model dropdown
- [ ] Summarization works
- [ ] Image gallery displays (when images available)
- [ ] Lightbox navigation works (arrows, swipe)
- [ ] Q&A feature works
- [ ] Copy summary works
- [ ] Custom model addition works
- [ ] API key management works
- [ ] Error handling works

Test environments:
- [ ] Desktop browser
- [ ] Mobile browser (or responsive mode)
- [ ] Light mode
- [ ] Dark mode
- [ ] Different userscript managers (Tampermonkey, Violentmonkey)

### Debugging Tips

1. **Check Console Errors**:
   - Open browser DevTools (F12)
   - Go to Console tab
   - Look for errors or warnings

2. **Inspect State**:
   ```javascript
   // Add to code temporarily
   console.log('State:', state)
   console.log('DOM:', dom)
   console.log('Config:', CONFIG)
   ```

3. **Test API Calls**:
   ```javascript
   // Check API responses
   console.log('API Response:', response)
   ```

4. **Verify DOM Elements**:
   ```javascript
   // Check if elements exist
   console.log('Button:', document.getElementById(CONFIG.ids.button))
   ```

## Release Process

### Manual Release

1. **Update Version**:
   ```javascript
   // @version     2025.12.XX.XX
   ```

2. **Update CHANGELOG.md**:
   Add entry for new version with changes

3. **Commit Changes**:
   ```bash
   git add .
   git commit -m "chore: bump version to 2025.12.XX.XX"
   ```

4. **Tag Release**:
   ```bash
   git tag -a v2025.12.XX.XX -m "Release 2025.12.XX.XX"
   git push origin main --tags
   ```

### Automated Release (GitHub Actions)

The `.github/workflows/release.yml` workflow automatically:
1. Runs on new tags (`v*`)
2. Installs dependencies
3. Runs linter
4. Creates GitHub release
5. Attaches userscript files

To trigger:
```bash
git tag v2025.12.XX.XX
git push origin v2025.12.XX.XX
```

### Publishing to GitHub Pages

If using GitHub Pages for distribution:

1. **Enable GitHub Pages**:
   - Go to repository Settings > Pages
   - Source: Deploy from a branch
   - Branch: main, folder: / (root)

2. **Update URLs in script header**:
   ```javascript
   // @downloadURL https://gokulsp.github.io/Summarize-with-AI/Summarize%20with%20AI.user.js
   // @updateURL   https://gokulsp.github.io/Summarize-with-AI/Summarize%20with%20AI.meta.js
   ```

3. **Deployment**:
   - Automatic on every push to `main`
   - Handled by `.github/workflows/deploy-pages.yml`
   - No manual intervention needed

## Troubleshooting

### Pre-commit Hook Fails

If the pre-commit hook fails:

1. **Check what failed**:
   - Biome formatting errors
   - Metadata sync errors
   - Script header validation errors

2. **Fix manually**:
   ```bash
   # Format code
   pnpm exec biome check --write .

   # Sync metadata
   python sync-meta.py

   # Try commit again
   git commit -m "your message"
   ```

3. **Skip hook (not recommended)**:
   ```bash
   git commit --no-verify -m "your message"
   ```

### Biome Errors

If Biome reports errors:

1. **Read the error message** - it usually tells you what's wrong
2. **Auto-fix** (if possible):
   ```bash
   pnpm exec biome check --write .
   ```
3. **Manual fix** for complex issues

### Metadata Out of Sync

If metadata is out of sync:

1. **Run sync script**:
   ```bash
   python sync-meta.py
   ```

2. **Verify changes**:
   ```bash
   git diff "Summarize with AI.meta.js"
   ```

3. **Commit updated metadata**:
   ```bash
   git add "Summarize with AI.meta.js"
   git commit -m "chore: sync metadata"
   ```

### Testing Issues

If the script doesn't work during testing:

1. **Check if installed correctly** in userscript manager
2. **Verify the site is supported** (check @match directives)
3. **Look for console errors** (F12 > Console)
4. **Check API key** is set correctly
5. **Try on a different article** (some pages may not be readerable)

### Build Script Not Found

If `sync-meta.py` doesn't run:

1. **Check Python is installed**:
   ```bash
   python --version
   # or
   python3 --version
   ```

2. **Run with explicit python3**:
   ```bash
   python3 sync-meta.py
   ```

3. **Check file exists** in root directory

## Additional Resources

- [Biome Documentation](https://biomejs.dev/)
- [Husky Documentation](https://typicode.github.io/husky/)
- [Userscript Documentation](https://wiki.greasespot.net/)
- [Tampermonkey Documentation](https://www.tampermonkey.net/documentation.php)
- [Claude API Documentation](https://docs.anthropic.com/)

## Reference

For questions about the original project:
- Visit the [original repository](https://github.com/insign/userscripts)
- Contact Hélio: open@helio.me

---

Happy coding! 🚀

---

**Original Project:** [Summarize with AI](https://github.com/insign/userscripts) by Hélio ([@insign](https://github.com/insign))

**This Fork:** Personal use by Gokul SP ([@gokulsp](https://github.com/gokulsp))
