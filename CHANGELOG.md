# Changelog

Personal fork changelog documenting changes from the original version.

## Personal Fork - Current Version

Complete overhaul from original (1,837 lines → 3,585 lines, +95% increase).

### Major Changes from Original

#### New Features Added
- **Image Gallery & Lightbox** - Extract and view article images with full-screen lightbox
- **Q&A System** - Ask questions about articles with context-aware responses
- **Copy Summary** - One-click copy with HTML formatting and fallback strategies
- **Custom Modals** - Professional Dieter Rams-inspired modals replacing browser dialogs
- **Publication-Specific Prompts** - Tailored summarization for research vs news articles
- **Inoreader Integration** - Summarize selected text on Inoreader

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
- **AI Provider**: Switched from OpenAI/Gemini to Claude Sonnet 4.5 only
- **Prompts**: Redesigned templates (research vs news, ~300 words, no emojis)
- **Site Support**: Whitelist approach (ft.com, hbr.org, economist.com, theguardian.com, inoreader.com)
- **Distribution**: GitHub Pages instead of Greasefork

#### Removed Features
- Chat feature (replaced with simpler Q&A)
- Multi-model support (Claude only)
- Thinking models / extended timeouts
- Language detection (English only)
- Article quality scoring
- Opinion sections

### Fixed Issues
- Clipboard protection against site interference
- Focus management with debouncing
- Memory leak prevention
- Mobile touch improvements
- Better error handling

### Technical Metrics
- **Code**: 1,837 → 3,585 lines (+95%)
- **Services**: 5 new service layers
- **Features**: 8 major additions
- **Optimizations**: 15+ performance improvements
- **Distribution**: GitHub Pages at `https://gokulsp.github.io/Summarize-with-AI/`

---

## Original Version Reference

Original project: [insign/userscripts](https://github.com/insign/userscripts) by Hélio.

**Original Features:**
- OpenAI and Gemini support
- Chat interface
- Article quality scoring
- Opinion sections
- Multi-language support
- Universal site support

---

*This is a personal fork. Original project: [insign/userscripts](https://github.com/insign/userscripts)*
