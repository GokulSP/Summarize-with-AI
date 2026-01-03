# Changelog

Personal fork changelog documenting changes from the original version.

## Personal Fork - Current Version (2026.01.01.26)

Complete overhaul from original (1,837 lines → 3,284 lines, +79% increase).

### Major Changes from Original

#### New Features Added
- **Multiple AI Service Support** - Full support for both Claude (Sonnet 4.5) and Gemini (3.0 Flash) with separate API key management
- **Model-Specific Caching** - Each AI model maintains its own summary cache for instant switching
- **Image Gallery & Lightbox** - Extract and view article images with full-screen lightbox and swipe navigation
- **Q&A System** - Ask questions about articles with context-aware responses using the selected AI model
- **Copy Summary** - One-click copy with HTML formatting and fallback strategies
- **Custom Modals** - Professional Dieter Rams-inspired modals replacing browser dialogs
- **Publication-Specific Prompts** - Tailored summarization for research vs news articles
- **Inoreader Integration** - Summarize selected text on Inoreader with minimum 50 character requirement

#### Architecture Improvements
- Service layer (StorageService, NotificationService, ModalService, PromptBuilder, UIHelpers)
- Centralized CONFIG object eliminating magic numbers
- State management with single state object
- DOM caching for performance

#### Performance Optimizations
- Pre-compiled regex patterns
- LRU cache for model configurations
- Event delegation for UI components
- Intersection Observer for lazy loading
- Batch DOM operations

#### UI/UX Enhancements
- CSS design system with variables
- Comprehensive dark mode support
- Mobile-optimized with touch/swipe gestures
- Toast notifications with animations
- Professional menu bar layout

### Changed from Original

#### Core Changes
- **AI Providers**: Switched from OpenAI/Gemini to Claude + Gemini (removed OpenAI, kept Gemini for free tier access)
- **Model Management**: Enhanced with per-model caching and service grouping in dropdown
- **Prompts**: Redesigned templates (research vs news, ~300 words, no emojis, structured sections)
- **Site Support**: Whitelist approach (ft.com, hbr.org, economist.com, theguardian.com, inoreader.com) with site-specific optimizations
- **Distribution**: GitHub Pages instead of Greasefork
- **Button Design**: Material Blue color (#1A73E8) for better visibility and modern look

#### Removed Features
- Chat feature (replaced with simpler Q&A)
- OpenAI GPT model support (kept Claude + Gemini only)
- Thinking models / extended timeouts (single 60s timeout)
- Language detection (English only)
- Article quality scoring (focus on content, not meta-analysis)
- Opinion sections (more objective summaries)
- Custom model addition UI (removed from final version)

### Fixed Issues
- Clipboard protection against site interference
- Focus management with debouncing
- Memory leak prevention
- Mobile touch improvements
- Better error handling

### Technical Metrics
- **Code**: 1,837 → 3,284 lines (+79%)
- **Services**: 5 new service layers (StorageService, NotificationService, ModalService, PromptBuilder, UIHelpers)
- **Features**: 13 major features (was 4)
- **Optimizations**: 15+ performance improvements (regex pre-compilation, DOM caching, event delegation, etc.)
- **AI Models**: 2 services supported (Claude Sonnet 4.5, Gemini 3.0 Flash)
- **Distribution**: GitHub Pages at `https://gokulsp.github.io/Summarize-with-AI/`

### Recent Updates (v2026.01.01.26)
- Fixed dark mode visibility issues for Reset Key button
- Ensured unselected models remain muted in dropdown
- Comprehensive QA functionality fixes for Gemini API
- Restored proper contrast and visibility across light/dark themes
- Removed copy/share features from final version (focus on core functionality)

---

## Version History

### 2026.01.01.26 (Current)
- Fixed: Dark mode Reset Key visibility
- Fixed: Model selection dropdown contrast in dark mode
- Fixed: QA functionality for Gemini API
- Removed: Copy/share features (streamlined UI)
- Maintained: S button always Material Blue for consistency

### Previous Versions (2025.12.x)
- Complete rebuild with service layer architecture
- Added image gallery with lightbox viewer
- Added Q&A system
- Added publication-specific prompts
- Added custom modal system
- Added Inoreader integration
- Performance optimizations with caching
- Dark mode support
- Mobile optimization

---

## Original Version Reference

Original project: [insign/userscripts](https://github.com/insign/userscripts) by Hélio.

**Original Features:**
- OpenAI and Gemini support
- Chat interface with message history
- Article quality scoring (1-10 with colors)
- Opinion sections with AI analysis
- Multi-language support
- Universal site support (*://*/*)
- Basic summarization with simple prompts

---

*This is a personal fork. Original project: [insign/userscripts](https://github.com/insign/userscripts)*
