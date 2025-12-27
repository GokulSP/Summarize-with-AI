// ==UserScript==
// @name        Summarize with AI
// @namespace   https://github.com/insign/userscripts
// @version     2025.12.28.00
// @description Single-button AI summarization (Claude) with model selection dropdown for articles/news. Uses Alt+S shortcut. Long press 'S' (or tap-and-hold on mobile) to select model. Allows adding custom models. Custom modals with Dieter Rams-inspired design. Adapts to dark mode and mobile viewports.
// @author      Hélio <open@helio.me>
// @contributor Gokul SP (Personal fork maintainer)
// @contributor Claude (Anthropic AI assistant)
// @license     WTFPL
// @match       https://www.ft.com/*
// @match       https://hbr.org/*
// @match       https://www.economist.com/*
// @match       https://www.theguardian.com/*
// @match       https://www.inoreader.com/*
// @grant       GM.addStyle
// @grant       GM.xmlHttpRequest
// @grant       GM.setValue
// @grant       GM.getValue
// @connect     api.anthropic.com
// @require     https://cdnjs.cloudflare.com/ajax/libs/readability/0.6.0/Readability.min.js
// @require     https://cdnjs.cloudflare.com/ajax/libs/readability/0.6.0/Readability-readerable.min.js
// @downloadURL https://gokulsp.github.io/Summarize-with-AI/Summarize%20with%20AI.user.js
// @updateURL   https://gokulsp.github.io/Summarize-with-AI/Summarize%20with%20AI.meta.js
// ==/UserScript==

(() => {
	const CONFIG = {
		// DOM Element IDs
		ids: {
			button: 'summarize-button',
			dropdown: 'model-dropdown',
			overlay: 'summarize-overlay',
			closeButton: 'summarize-close',
			content: 'summarize-content',
			error: 'summarize-error',
			addModelItem: 'add-custom-model',
			retryButton: 'summarize-retry-button',
			copyButton: 'summarize-copy-button',
			askButton: 'summarize-ask-button',
			questionInput: 'summarize-question-input',
			questionSection: 'summarize-question-section',
			modal: 'custom-modal',
			modalOverlay: 'custom-modal-overlay',
			modalContent: 'custom-modal-content',
			modalMessage: 'custom-modal-message',
			modalInput: 'custom-modal-input',
			modalActions: 'custom-modal-actions',
		},

		// Storage Keys
		storage: {
			customModels: 'custom_ai_models',
		},

		// Timing & Duration (milliseconds)
		timing: {
			longPressDuration: 500,
			apiRequestTimeout: 60000,
			errorNotificationDuration: 4000,
			focusDebounceDelay: 50,
			copySuccessDisplay: 2000,
			modalFocusDelay: 100,
			modalCloseTransition: 200,
			errorFadeOut: 200,
			copyFallbackDelay: 50,
			scrollStepDelay: 100,
			scrollBottomDelay: 300,
			scrollRestoreDelay: 200,
		},

		// Length & Size Limits
		limits: {
			minSelectionLength: 50,
			defaultMaxTokens: 1000,
			targetWordCount: 300,
			bulletPointMaxWords: 20,
			maxImages: 12,
			galleryDisplayLimit: 6,
		},

		// Selectors
		selectors: {
			input: 'input, textarea, select, [contenteditable="true"]',
		},

		// Model Groups
		modelGroups: {
			claude: {
				name: 'Claude',
				baseUrl: 'https://api.anthropic.com/v1/messages',
				models: [{ id: 'claude-sonnet-4-5-20250929', name: 'Sonnet 4.5' }],
				get defaultParams() {
					return { max_tokens: CONFIG.limits.defaultMaxTokens };
				},
			},
		},

		// Publication Configurations
		publications: {
			'hbr.org': {
				type: 'research',
				focus:
					'strategic frameworks, management principles, actionable insights for leaders, and practical applications for organizations',
			},
			'inoreader.com': {
				type: 'research',
				focus:
					'research findings, innovation patterns, technological implications, organizational change dynamics, and data-driven insights',
			},
			'ft.com': {
				type: 'news',
				focus:
					'market impact, regulatory implications, institutional perspectives, data/statistics, and connections to broader economic trends',
			},
			'economist.com': {
				type: 'news',
				focus:
					'geopolitical significance, economic indicators, historical parallels, ideological positions, and cross-border implications',
			},
			'theguardian.com': {
				type: 'news',
				focus:
					'social impact, stakeholder perspectives (especially marginalized voices), political context, investigative details, and accountability questions',
			},
		},

		// UI Styles & Colors
		styles: {
			fontFamily:
				'-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
			colors: {
				activeModel: '#1A73E8',
				error: '#d32f2f',
			},
			fontWeights: {
				activeModel: 'bold',
			},
		},

		// Gesture Thresholds
		gestures: {
			swipeThreshold: 50, // pixels
		},
	};

	const PromptBuilder = {
		_configCache: null,
		_cachedHostname: null,

		_getPublicationConfig(hostname) {
			if (this._cachedHostname === hostname && this._configCache) {
				return this._configCache;
			}

			for (const [domain, config] of Object.entries(CONFIG.publications)) {
				if (hostname.includes(domain)) {
					this._cachedHostname = hostname;
					this._configCache = config;
					return config;
				}
			}

			const defaultConfig = {
				type: 'news',
				focus:
					'key arguments, supporting evidence, stakeholder perspectives, and broader implications',
			};
			this._cachedHostname = hostname;
			this._configCache = defaultConfig;
			return defaultConfig;
		},

		_buildCommonHeader() {
			return `Target: ~${CONFIG.limits.targetWordCount} words
Tags: <p>, <ul>, <li>, <strong> only`;
		},

		_buildResearchTemplate(focus, title, content) {
			return `${this._buildCommonHeader()}

<article>
<title>${title}</title>
<content>${content}</content>
</article>

Create a summary focused on ${focus}.

Format exactly as shown:

<p><strong>Insight:</strong></p>
<p>One memorable sentence capturing the main finding.</p>

<p><strong>Impact:</strong></p>
<p>Real-world significance in 1-2 sentences.</p>

<p><strong>Evidence:</strong></p>
<ul>
<li>Critical finding (max ${CONFIG.limits.bulletPointMaxWords} words)</li>
<li>Supporting pattern (max ${CONFIG.limits.bulletPointMaxWords} words)</li>
<li>Additional proof (max ${CONFIG.limits.bulletPointMaxWords} words)</li>
</ul>

<p><strong>Application:</strong></p>
<p>2-3 actionable steps for implementation.</p>

<p><strong>Context:</strong></p>
<p>Specific trigger scenarios and when to apply in 1-2 sentences.</p>

<p><strong>Limitations:</strong></p>
<p>Conflicting evidence, edge cases not addressed, and unresolved questions in 1-2 sentences.</p>`;
		},

		_buildNewsTemplate(focus, title, content) {
			return `${this._buildCommonHeader()}

<article>
<title>${title}</title>
<content>${content}</content>
</article>

Create a summary emphasizing ${focus}.

Format exactly as shown:

<p><strong>Summary:</strong></p>
<p>Event and significance in 2 sentences.</p>

<p><strong>Details:</strong></p>
<ul>
<li>Most critical detail (max ${CONFIG.limits.bulletPointMaxWords} words)</li>
<li>Second essential fact (max ${CONFIG.limits.bulletPointMaxWords} words)</li>
<li>Third key point (max ${CONFIG.limits.bulletPointMaxWords} words)</li>
<li>Fourth important detail (max ${CONFIG.limits.bulletPointMaxWords} words)</li>
</ul>

<p><strong>Impact:</strong></p>
<p>Significance or memorable angle in 1-2 sentences.</p>

<p><strong>Context:</strong></p>
<p>Background and historical perspective in 1-2 sentences.</p>

<p><strong>Limitations:</strong></p>
<p>Counterarguments, missing perspectives, and key uncertainties in 1-2 sentences.</p>`;
		},

		build(title, content) {
			const config = this._getPublicationConfig(window.location.hostname);
			return config.type === 'research'
				? this._buildResearchTemplate(config.focus, title, content)
				: this._buildNewsTemplate(config.focus, title, content);
		},
	};

	const PROMPT_TEMPLATE = (title, content) => PromptBuilder.build(title, content);

	// Storage Layer - Centralized storage operations
	const StorageService = {
		keys: {
			LAST_USED_MODEL: 'last_used_model',
			CUSTOM_MODELS: CONFIG.storage.customModels,
			API_KEY: service => `${service}_api_key`,
		},

		async getLastUsedModel(defaultModel) {
			return await GM.getValue(this.keys.LAST_USED_MODEL, defaultModel);
		},

		async setLastUsedModel(modelId) {
			if (!modelId) {
				console.warn('StorageService: Cannot save empty model ID');
				return;
			}
			return await GM.setValue(this.keys.LAST_USED_MODEL, modelId);
		},

		async getCustomModels() {
			try {
				const storedModels = await GM.getValue(this.keys.CUSTOM_MODELS, '[]');
				const parsedModels = JSON.parse(storedModels);

				if (
					Array.isArray(parsedModels) &&
					parsedModels.every(m => typeof m === 'object' && m.id && m.service)
				) {
					return parsedModels;
				} else {
					console.warn(
						'StorageService: Invalid custom model format found. Resetting.',
						parsedModels,
					);
					await this.setCustomModels([]);
					return [];
				}
			} catch (error) {
				console.error('StorageService: Failed to load custom models:', error);
				await this.setCustomModels([]);
				return [];
			}
		},

		async setCustomModels(models) {
			if (!Array.isArray(models)) {
				throw new Error('StorageService: Custom models must be an array');
			}
			return await GM.setValue(this.keys.CUSTOM_MODELS, JSON.stringify(models));
		},

		async addCustomModel(model) {
			if (!model || !model.id || !model.service) {
				throw new Error('StorageService: Invalid model object');
			}
			const currentModels = await this.getCustomModels();
			currentModels.push(model);
			return await this.setCustomModels(currentModels);
		},

		async removeCustomModel(modelId, service) {
			const currentModels = await this.getCustomModels();
			const lowerModelId = modelId.toLowerCase();
			const filtered = currentModels.filter(
				m => !(m.id.toLowerCase() === lowerModelId && m.service === service),
			);
			return await this.setCustomModels(filtered);
		},

		async getApiKey(service) {
			if (!service) {
				console.error('StorageService: Service parameter is required');
				return null;
			}
			const apiKey = await GM.getValue(this.keys.API_KEY(service));
			return apiKey?.trim() || null;
		},

		async setApiKey(service, apiKey) {
			if (!service) {
				throw new Error('StorageService: Service parameter is required');
			}
			const keyToSave = (apiKey || '').trim();
			return await GM.setValue(this.keys.API_KEY(service), keyToSave);
		},

		async clearApiKey(service) {
			return await this.setApiKey(service, '');
		},
	};

	// UI Helper Functions
	const UIHelpers = {
		toggleDropdown(visible) {
			if (dom.dropdown) {
				dom.dropdown.style.display = visible ? 'block' : 'none';
			}
		},

		hideDropdown() {
			this.toggleDropdown(false);
		},

		showDropdown() {
			this.toggleDropdown(true);
		},

		showError(message, preferOverlay = false) {
			if (preferOverlay && dom.overlay) {
				updateSummaryOverlay(
					`<p style="color: ${CONFIG.styles.colors.error};">${message}</p>`,
					false,
				);
			} else {
				showErrorNotification(message);
			}
		},

		setButtonState(buttonId, text, disabled = false) {
			const button = document.getElementById(buttonId);
			if (button) {
				button.textContent = text;
				button.disabled = disabled;
			}
		},

		getButton(buttonId) {
			return document.getElementById(buttonId);
		},
	};

	// Validation Functions
	const Validators = {
		isValidModelObject(model) {
			return typeof model === 'object' && model.id && model.service;
		},

		isValidModelArray(models) {
			return Array.isArray(models) && models.every(this.isValidModelObject);
		},

		modelExistsInCustom(service, modelId) {
			return state.customModels.some(
				m => m.service === service && m.id.toLowerCase() === modelId.toLowerCase(),
			);
		},

		modelExistsInStandard(service, modelId) {
			return CONFIG.modelGroups[service]?.models.some(
				m => m.id.toLowerCase() === modelId.toLowerCase(),
			);
		},

		modelExists(service, modelId) {
			return (
				this.modelExistsInCustom(service, modelId) || this.modelExistsInStandard(service, modelId)
			);
		},
	};

	// Custom Modal Service - Dieter Rams inspired design
	const ModalService = {
		currentModal: null,
		resolveCallback: null,

		// Create modal structure
		create(type, options = {}) {
			return new Promise(resolve => {
				this.resolveCallback = resolve;
				this.show(type, options);
			});
		},

		show(type, options) {
			// Remove existing modal if any
			this.close();

			const modalOverlay = createElement('div', {
				id: CONFIG.ids.modalOverlay,
				className: 'modal-overlay',
			});

			const modalContent = createElement('div', {
				id: CONFIG.ids.modalContent,
				className: `modal-content modal-${type}`,
			});

			// Message
			if (options.message) {
				const messageEl = createElement('div', {
					id: CONFIG.ids.modalMessage,
					className: 'modal-message',
					innerHTML: options.message,
				});
				modalContent.appendChild(messageEl);
			}

			// Input field for prompt type
			let inputEl = null;
			if (type === 'prompt') {
				inputEl = createElement('input', {
					id: CONFIG.ids.modalInput,
					className: 'modal-input',
					type: options.inputType || 'text',
					placeholder: options.placeholder || '',
					value: options.defaultValue || '',
				});
				modalContent.appendChild(inputEl);
			}

			// Actions
			const actionsEl = createElement('div', {
				id: CONFIG.ids.modalActions,
				className: 'modal-actions',
			});

			if (type === 'alert') {
				const okBtn = createElement('button', {
					className: 'modal-button modal-button-primary',
					textContent: 'OK',
					onclick: () => this.resolve(true),
					onmouseout: e => e.target.blur(),
				});
				actionsEl.appendChild(okBtn);
			} else if (type === 'confirm') {
				const cancelBtn = createElement('button', {
					className: 'modal-button modal-button-secondary',
					textContent: options.cancelText || 'Cancel',
					onclick: () => this.resolve(false),
					onmouseout: e => e.target.blur(),
				});
				const confirmBtn = createElement('button', {
					className: 'modal-button modal-button-primary',
					textContent: options.confirmText || 'OK',
					onclick: () => this.resolve(true),
					onmouseout: e => e.target.blur(),
				});
				actionsEl.appendChild(cancelBtn);
				actionsEl.appendChild(confirmBtn);
			} else if (type === 'prompt') {
				const cancelBtn = createElement('button', {
					className: 'modal-button modal-button-secondary',
					textContent: 'Cancel',
					onclick: () => this.resolve(null),
					onmouseout: e => e.target.blur(),
				});
				const okBtn = createElement('button', {
					className: 'modal-button modal-button-primary',
					textContent: 'OK',
					onclick: () => {
						const value = inputEl?.value || '';
						this.resolve(value);
					},
					onmouseout: e => e.target.blur(),
				});
				actionsEl.appendChild(cancelBtn);
				actionsEl.appendChild(okBtn);

				// Enter key submit
				if (inputEl) {
					inputEl.addEventListener('keydown', e => {
						if (e.key === 'Enter') {
							e.preventDefault();
							okBtn.click();
						} else if (e.key === 'Escape') {
							e.preventDefault();
							cancelBtn.click();
						}
					});
				}
			}

			modalContent.appendChild(actionsEl);
			modalOverlay.appendChild(modalContent);
			document.body.appendChild(modalOverlay);

			// Focus management
			if (inputEl) {
				setTimeout(() => inputEl.focus(), CONFIG.timing.modalFocusDelay);
			}

			// ESC key handler
			const escHandler = e => {
				if (e.key === 'Escape') {
					e.preventDefault();
					this.resolve(type === 'prompt' ? null : false);
				}
			};
			document.addEventListener('keydown', escHandler);
			modalOverlay._escHandler = escHandler;

			// Click outside to close (only for alerts)
			if (type === 'alert') {
				modalOverlay.onclick = e => {
					if (e.target === modalOverlay) {
						this.resolve(true);
					}
				};
			}

			this.currentModal = modalOverlay;

			// Animation
			requestAnimationFrame(() => {
				modalOverlay.classList.add('modal-active');
			});
		},

		resolve(value) {
			if (this.currentModal?._escHandler) {
				document.removeEventListener('keydown', this.currentModal._escHandler);
			}

			if (this.currentModal) {
				this.currentModal.classList.remove('modal-active');
				setTimeout(() => {
					this.close();
					if (this.resolveCallback) {
						this.resolveCallback(value);
						this.resolveCallback = null;
					}
				}, 200);
			}
		},

		close() {
			if (this.currentModal) {
				this.currentModal.remove();
				this.currentModal = null;
			}
		},

		// Convenience methods
		async alert(message) {
			return await this.create('alert', { message });
		},

		async confirm(message, confirmText = 'OK', cancelText = 'Cancel') {
			return await this.create('confirm', { message, confirmText, cancelText });
		},

		async prompt(message, defaultValue = '', placeholder = '') {
			return await this.create('prompt', { message, defaultValue, placeholder });
		},
	};

	// Helper to convert service name to Title Case
	const toTitleCase = str => {
		return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
	};

	// Notification Service - now uses ModalService
	const NotificationService = {
		async apiKeyUpdated(service) {
			await ModalService.alert(`${toTitleCase(service)} API key updated successfully.`);
		},

		async apiKeyCleared(service) {
			await ModalService.alert(`${toTitleCase(service)} API key has been cleared.`);
		},

		async modelExists(modelId) {
			await ModalService.alert(`Model "${modelId}" already exists.`);
		},

		async modelAdded(modelId) {
			await ModalService.alert(`Model "${modelId}" added successfully.`);
		},

		async modelRemoved(modelId) {
			await ModalService.alert(`Model "${modelId}" has been removed.`);
		},

		async invalidService() {
			await ModalService.alert('Invalid service provided.');
		},
	};

	const state = {
		activeModel: CONFIG.modelGroups.claude.models[0].id,
		articleData: null,
		customModels: [],
		currentSummary: null,
		dropdownNeedsUpdate: true,
		articleImages: [],
	};

	const dom = {
		button: null,
		dropdown: null,
		overlay: null,
		overlayElements: null,
		lightbox: null,
		lightboxElements: null, // Cache lightbox child elements
		lightboxCleanup: null, // Store cleanup function for lightbox listeners
	};

	const createLongPressHandler = (onLongPress, duration = CONFIG.timing.longPressDuration) => {
		let timer = null;
		let isLongPress = false;

		const start = () => {
			isLongPress = false;
			clearTimeout(timer);
			timer = setTimeout(() => {
				isLongPress = true;
				onLongPress();
			}, duration);
		};

		const cancel = e => {
			if (e) e.stopPropagation();
			clearTimeout(timer);
		};

		const check = () => {
			const wasLongPress = isLongPress;
			isLongPress = false;
			return wasLongPress;
		};

		const attachTo = element => {
			const passiveOptions = { passive: true };
			element.addEventListener('mousedown', start);
			element.addEventListener('mouseup', cancel);
			element.addEventListener('mouseleave', cancel);
			element.addEventListener('touchstart', start, passiveOptions);
			element.addEventListener('touchend', cancel);
			element.addEventListener('touchmove', cancel);
			element.addEventListener('touchcancel', cancel);

			// Return cleanup function
			return () => {
				element.removeEventListener('mousedown', start);
				element.removeEventListener('mouseup', cancel);
				element.removeEventListener('mouseleave', cancel);
				element.removeEventListener('touchstart', start);
				element.removeEventListener('touchend', cancel);
				element.removeEventListener('touchmove', cancel);
				element.removeEventListener('touchcancel', cancel);
				clearTimeout(timer);
			};
		};

		return { start, cancel, check, attachTo };
	};

	const createElement = (tag, attrs = {}, children = []) => {
		const el = document.createElement(tag);

		// Use for...of for better performance than forEach
		for (const [key, value] of Object.entries(attrs)) {
			if (key === 'style') {
				el.style.cssText = value;
			} else if (key.startsWith('on')) {
				el.addEventListener(key.substring(2).toLowerCase(), value);
			} else {
				el[key] = value;
			}
		}

		for (const child of children) {
			el.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
		}

		return el;
	};

	const mergeParams = (serviceDefaults, modelParams) => ({
		...serviceDefaults,
		...modelParams,
	});

	const buildOverlayContent = (contentHTML, hasError = false) => {
		// Optimize: pre-allocate approximate string size and use single concatenation
		let html = `<div class="summary-content-body">${contentHTML}</div>`;

		if (hasError) {
			html += `<div style="text-align:center;padding-bottom:24px"><button id="${CONFIG.ids.retryButton}" class="retry-button">Try Again</button></div>`;
		} else if (!contentHTML.includes('glow')) {
			// Add images section if available (optimized: use array join instead of string concatenation)
			if (state.articleImages.length > 0) {
				const galleryItems = [];
				const displayLimit = Math.min(
					state.articleImages.length,
					CONFIG.limits.galleryDisplayLimit,
				);
				for (let i = 0; i < displayLimit; i++) {
					const item = state.articleImages[i];
					if (item.type === 'iframe') {
						galleryItems.push(`<div class="gallery-item gallery-item-iframe" data-image-index="${i}">
                <div class="iframe-preview">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="2" y="3" width="20" height="14" rx="2"/>
                    <line x1="8" y1="21" x2="16" y2="21"/>
                    <line x1="12" y1="17" x2="12" y2="21"/>
                    <path d="M7 8l5 3-5 3V8z"/>
                  </svg>
                  <span>Interactive Chart</span>
                </div>
              </div>`);
					} else {
						galleryItems.push(`<div class="gallery-item" data-image-index="${i}">
                <img src="${item.src}" alt="${item.alt || 'Article image'}" loading="lazy" />
              </div>`);
					}
				}
				html += `<div class="image-gallery">${galleryItems.join('')}</div>`;
			}

			// Add Q&A section after summary (but not during loading or error states)
			html += `<div id="${CONFIG.ids.questionSection}" class="question-section">
          <div class="question-header">Ask a question about this article:</div>
          <div class="question-input-wrapper">
            <input
              type="text"
              id="${CONFIG.ids.questionInput}"
              class="question-input"
              placeholder="Ask a question..."
            />
            <button id="${CONFIG.ids.askButton}" class="ask-button">Ask</button>
          </div>
          <div id="answer-container" class="answer-container"></div>
        </div>`;
		}

		// Add menu bar at the bottom
		html += `<div class="summary-menubar">`;
		if (!hasError && !contentHTML.includes('glow')) {
			html += `<button id="${CONFIG.ids.copyButton}" class="menubar-button">Copy Summary</button>`;
		}
		html += `<button id="${CONFIG.ids.closeButton}" class="menubar-button" title="Close (Esc)">Close</button></div>`;

		return html;
	};

	// Optimize DOM queries by caching element lookups (avoid repeated getElementById calls)
	const attachOverlayHandlers = () => {
		// Batch DOM queries using a single call
		const contentElement = document.getElementById(CONFIG.ids.content);
		if (!contentElement) return;

		// Use querySelector on parent instead of multiple getElementById calls
		const closeBtn = contentElement.querySelector(`#${CONFIG.ids.closeButton}`);
		const retryBtn = contentElement.querySelector(`#${CONFIG.ids.retryButton}`);
		const copyBtn = contentElement.querySelector(`#${CONFIG.ids.copyButton}`);
		const askBtn = contentElement.querySelector(`#${CONFIG.ids.askButton}`);
		const questionInput = contentElement.querySelector(`#${CONFIG.ids.questionInput}`);
		const answerContainer = contentElement.querySelector('#answer-container');

		// Cache elements for reuse
		dom.overlayElements = {
			closeBtn,
			retryBtn,
			copyBtn,
			askBtn,
			questionInput,
			answerContainer,
		};

		if (closeBtn) closeBtn.onclick = closeOverlay;
		if (retryBtn) retryBtn.addEventListener('click', processSummarization);
		if (copyBtn) copyBtn.addEventListener('click', handleCopySummary);
		if (askBtn) askBtn.addEventListener('click', handleAskQuestion);
		if (questionInput) {
			questionInput.addEventListener('keypress', e => {
				if (e.key === 'Enter') handleAskQuestion();
			});
		}

		// Optimize: Use event delegation instead of attaching handlers to each item
		const imageGallery = contentElement.querySelector('.image-gallery');
		if (imageGallery && !imageGallery.dataset.hasListener) {
			imageGallery.dataset.hasListener = 'true';
			imageGallery.addEventListener('click', e => {
				const galleryItem = e.target.closest('.gallery-item');
				if (galleryItem?.dataset.imageIndex) {
					const index = parseInt(galleryItem.dataset.imageIndex, 10);
					openLightbox(index);
				}
			});
		}
	};

	// --- Main Functions ---
	async function initialize() {
		state.customModels = await StorageService.getCustomModels();
		state.articleData = getArticleData();

		if (state.articleData) {
			state.activeModel = await StorageService.getLastUsedModel(state.activeModel);
			addSummarizeButton();
			setupEventListeners();
			injectStyles();
		}
	}

	function getArticleData() {
		try {
			if (window.location.hostname.includes('inoreader.com')) {
				return { title: 'Inoreader Article', content: 'placeholder' };
			}

			const documentClone = document.cloneNode(true);
			const nonContentElements = documentClone.querySelectorAll(
				'script, style, noscript, iframe, figure, img, svg, header, footer, nav',
			);

			// Optimize: remove in forward order (no need to reverse iterate with NodeList)
			for (const element of nonContentElements) {
				element.remove();
			}

			if (!isProbablyReaderable(documentClone)) return null;

			const reader = new Readability(documentClone);
			const parsedArticle = reader.parse();

			return parsedArticle?.content && parsedArticle.textContent?.trim()
				? { title: parsedArticle.title, content: parsedArticle.textContent.trim() }
				: null;
		} catch (error) {
			console.error('Summarize with AI: Article parsing failed:', error);
			return null;
		}
	}

	// Pre-compiled regex patterns (compile once at module level)
	const IMAGE_EXTRACTION_REGEX = {
		economistWidth: /width=(\d+)/,
		guardianWidth: /[?&]width=(\d+)/,
	};

	// Pre-calculated constants
	const IMAGE_ASPECT_RATIO = 0.5625; // 9/16

	async function extractArticleImages() {
		try {
			// Site-specific detection (cached once)
			const hostname = window.location.hostname;
			const isFT = hostname.includes('ft.com');
			const isHBR = hostname.includes('hbr.org');
			const isEconomist = hostname.includes('economist.com');
			const isGuardian = hostname.includes('theguardian.com');

			// Optimized lazy loading: Use Intersection Observer API instead of forced scrolling
			// This is non-blocking and much more performant
			const triggerLazyLoading = () => {
				return new Promise(resolve => {
					const images = document.querySelectorAll(
						'img[loading="lazy"], img[data-src], img[data-lazy-src]',
					);
					if (images.length === 0) {
						resolve();
						return;
					}

					let loadedCount = 0;
					const timeout = setTimeout(() => resolve(), 500); // Failsafe timeout

					const observer = new IntersectionObserver(entries => {
						entries.forEach(entry => {
							if (entry.isIntersecting) {
								observer.unobserve(entry.target);
							}
						});
					});

					images.forEach(img => {
						observer.observe(img);
						// Trigger load by scrolling into view (non-blocking)
						requestAnimationFrame(() => {
							img.scrollIntoView({ block: 'nearest', behavior: 'auto' });
							loadedCount++;
							if (loadedCount === images.length) {
								clearTimeout(timeout);
								observer.disconnect();
								// Small delay to let images actually load
								setTimeout(resolve, 100);
							}
						});
					});
				});
			};

			await triggerLazyLoading();

			const maxImages = CONFIG.limits.maxImages;
			const images = [];
			const seen = new Set();

			// Track first large image for Economist
			let hasEconomistLargeImage = false;

			// HBR.org URL exclusion - Use array for iteration, Set for checking
			const hbrExcludedUrls = [
				'https://hbr.org/resources/images/article_assets/2015/12/HBR-Ideacast-HP-feed.png',
				'https://hbr.org/resources/images/article_assets/2019/03/wide-cold-call.png',
				'https://hbr.org/resources/images/podcasts/episode-ideacast.png',
				'https://hbr.org/resources/images/podcasts/episode-cold-call.png',
				'https://hbr.org/resources/images/products/generic-tool.png',
			];
			const hbrExcludedPrefix = 'https://cdn11.bigcommerce.com/';

			// FT low priority domain
			const ftLowPriorityDomain = 'images.ft.com';

			// Visualization domains for fast checking
			const vizDomains = ['flo.uri.sh', 'flourish', 'datawrapper.dwcdn.net'];

			// STEP 1: Extract interactive visualizations FIRST (highest priority)
			const iframeSelector =
				'article iframe, main iframe, [role="main"] iframe, .article-content iframe, .post-content iframe, .entry-content iframe';
			const iframes = document.querySelectorAll(iframeSelector);

			for (const iframe of iframes) {
				if (images.length >= maxImages) break;

				const src = iframe.src || iframe.dataset.src;
				if (!src || seen.has(src)) continue;

				// Optimize: single loop check instead of multiple includes
				let isVisualization = false;
				for (const domain of vizDomains) {
					if (src.includes(domain)) {
						isVisualization = true;
						break;
					}
				}

				if (isVisualization) {
					seen.add(src);
					images.push({
						src,
						alt: iframe.title || 'Interactive visualization',
						width: iframe.width || 800,
						height: iframe.height || 600,
						type: 'iframe',
						priority: 1,
					});
				}
			}

			// STEP 2: Extract regular images (only if space available after iframes)
			if (images.length < maxImages) {
				const combinedSelector =
					'article img, main img, [role="main"] img, .article-content img, .post-content img, .entry-content img, figure img, picture img';
				const imgs = document.querySelectorAll(combinedSelector);

				for (const img of imgs) {
					if (images.length >= maxImages) break;

					const src = img.currentSrc || img.src || img.dataset.src || img.dataset.lazySrc;
					if (!src || seen.has(src) || src.startsWith('data:')) continue;

					// Combine Economist filters in single check
					if (isEconomist) {
						const hasPromotionalClass =
							img.parentElement?.parentElement?.className?.includes('e1kb1ha80');
						const isHeaderImage = src.includes('_DE_');

						if (hasPromotionalClass || isHeaderImage) {
							continue;
						}
					}

					// Early URL filtering - optimized HBR check
					if (isFT && src.includes('www.ft.com/__origami/service/image/v2/images/raw/')) continue;

					if (isHBR) {
						if (src.startsWith(hbrExcludedPrefix)) continue;
						// Optimize: use some() instead of manual loop
						if (hbrExcludedUrls.some(url => src.startsWith(url))) continue;
					}

					// Extract dimensions
					let width = img.naturalWidth;
					let height = img.naturalHeight;
					let isEconomistChart = false;

					// Extract width from URL parameters
					if (isEconomist && src.includes('cdn-cgi/image/width=')) {
						const match = IMAGE_EXTRACTION_REGEX.economistWidth.exec(src);
						if (match) {
							width = parseInt(match[1], 10);
							height = Math.round(width * IMAGE_ASPECT_RATIO);

							// Detect Economist charts (WBC = Weekly Business Chart, or content-assets/images path)
							isEconomistChart = src.includes('WBC') || src.includes('content-assets/images');
						}
					} else if (isGuardian && src.includes('?width=')) {
						const match = IMAGE_EXTRACTION_REGEX.guardianWidth.exec(src);
						if (match) {
							width = parseInt(match[1], 10);
							if (img.naturalHeight > 0 && img.naturalWidth > 0) {
								height = Math.round(width * (img.naturalHeight / img.naturalWidth));
							}
						}
					}

					// Combined size filters (with exemption for Economist charts)
					if (width < 300 || height < 300) {
						// Allow Economist charts even if small (they're often 360px wide)
						if (isEconomist && isEconomistChart) {
							// Chart exemption - continue to add the image
						} else {
							continue;
						}
					}
					if (isFT && width === 300 && height === 300) continue;
					if (
						isHBR &&
						((width === 500 && height >= 700 && height <= 800) || (width === 383 && height === 215))
					)
						continue;

					// Economist large image filter
					if (isEconomist && width >= 1280 && height >= 720) {
						if (hasEconomistLargeImage) continue;
						hasEconomistLargeImage = true;
					}

					// Priority marking for FT (simplified)
					const priority = isFT && src.includes(ftLowPriorityDomain) ? -1 : 0;

					seen.add(src);
					images.push({
						src,
						alt: img.alt || '',
						width,
						height,
						type: 'image',
						priority,
					});
				}
			}

			return images;
		} catch (error) {
			console.error('Summarize with AI: Image extraction failed:', error);
			return [];
		}
	}

	function addSummarizeButton() {
		if (dom.button) return;

		const isInoreader = window.location.hostname.includes('inoreader.com');
		const title = isInoreader
			? 'Summarize Selected Text or Article (Alt+S) / Long Press to Select Model'
			: 'Summarize (Alt+S) / Long Press or Tap & Hold to Select Model';

		dom.button = createElement('div', {
			id: CONFIG.ids.button,
			textContent: 'S',
			title: title,
		});
		document.body.appendChild(dom.button);

		dom.dropdown = createDropdownElement();
		document.body.appendChild(dom.dropdown);
		populateDropdown(dom.dropdown);
	}

	function setupEventListeners() {
		const buttonPressHandler = createLongPressHandler(toggleDropdown);

		document.addEventListener('keydown', handleKeyPress);

		dom.button.addEventListener('click', () => {
			if (!buttonPressHandler.check()) processSummarization();
		});

		buttonPressHandler.attachTo(dom.button);

		// Event delegation for dropdown items
		dom.dropdown.addEventListener('click', e => {
			const modelItem = e.target.closest('.model-item:not(#add-custom-model)');
			if (modelItem?.dataset.modelId) {
				state.activeModel = modelItem.dataset.modelId;
				StorageService.setLastUsedModel(state.activeModel);
				UIHelpers.hideDropdown();
				processSummarization();
			}
		});

		document.addEventListener('click', handleOutsideClick);
		setupFocusListeners();
	}

	function createDropdownElement() {
		return createElement('div', {
			id: CONFIG.ids.dropdown,
			style: 'display: none',
		});
	}

	function populateDropdown(dropdownElement) {
		const fragment = document.createDocumentFragment();

		for (const [service, group] of Object.entries(CONFIG.modelGroups)) {
			const standardModels = group.models || [];

			// Optimize: filter custom models for this service in one pass
			const serviceCustomModels = state.customModels
				.filter(m => m.service === service)
				.map(m => ({ id: m.id }));

			// Optimize: use Map for O(1) lookups and deduplicate in single pass
			const seenIds = new Map();
			const allModelObjects = [];

			// Process all models in single pass (spread creates new array only once)
			for (const model of [...standardModels, ...serviceCustomModels]) {
				const lowerCaseId = model.id.toLowerCase();
				if (!seenIds.has(lowerCaseId)) {
					seenIds.set(lowerCaseId, true);
					allModelObjects.push(model);
				}
			}

			// Sort once after filtering (more efficient than sorting during insertion)
			allModelObjects.sort((a, b) => a.id.localeCompare(b.id));

			if (allModelObjects.length > 0) {
				const groupDiv = createElement('div', { className: 'model-group' });
				groupDiv.appendChild(createHeader(group.name, service));
				for (const modelObj of allModelObjects) {
					groupDiv.appendChild(createModelItem(modelObj, service));
				}
				fragment.appendChild(groupDiv);
			}
		}

		fragment.appendChild(
			createElement('hr', {
				style: 'margin:8px 0;border:none;border-top:1px solid #eee',
			}),
		);
		fragment.appendChild(createAddModelItem());

		dropdownElement.innerHTML = '';
		dropdownElement.appendChild(fragment);
	}

	function createHeader(text, service) {
		const container = createElement('div', { className: 'group-header-container' });

		container.appendChild(
			createElement('span', {
				className: 'group-header-text',
				textContent: text,
			}),
		);

		container.appendChild(
			createElement('a', {
				href: '#',
				textContent: 'Reset Key',
				className: 'reset-key-link',
				title: `Reset ${text} API Key`,
				onclick: e => {
					e.preventDefault();
					e.stopPropagation();
					handleApiKeyReset(service);
				},
			}),
		);

		return container;
	}

	function createModelItem(modelObj, service) {
		const isCustom = !CONFIG.modelGroups[service]?.models.some(m => m.id === modelObj.id);

		const item = createElement('div', {
			className: 'model-item',
			textContent: modelObj.name || modelObj.id,
			title: isCustom ? 'Click to use. Long press to delete.' : 'Click to use this model.',
		});

		// Store data as attributes for event delegation
		item.dataset.modelId = modelObj.id;
		item.dataset.service = service;
		item.dataset.isCustom = isCustom;

		if (modelObj.id === state.activeModel) {
			item.style.fontWeight = CONFIG.styles.fontWeights.activeModel;
			item.style.color = CONFIG.styles.colors.activeModel;
		}

		// Attach long press handler for custom models
		if (isCustom) {
			const modelPressHandler = createLongPressHandler(() =>
				handleModelRemoval(modelObj.id, service),
			);
			modelPressHandler.attachTo(item);
			item.dataset.hasLongPress = 'true';
		}

		return item;
	}

	function createAddModelItem() {
		return createElement('div', {
			id: CONFIG.ids.addModelItem,
			className: 'model-item add-model-item',
			textContent: '+ Add Custom Model',
			onclick: async e => {
				e.stopPropagation();
				UIHelpers.hideDropdown();
				await handleAddModel();
			},
		});
	}

	function toggleDropdown() {
		if (dom.dropdown.style.display === 'none') {
			if (state.dropdownNeedsUpdate) {
				populateDropdown(dom.dropdown);
				state.dropdownNeedsUpdate = false;
			}
			UIHelpers.showDropdown();
		} else {
			UIHelpers.hideDropdown();
		}
	}

	function handleOutsideClick(event) {
		if (
			dom.dropdown &&
			dom.dropdown.style.display !== 'none' &&
			!dom.dropdown.contains(event.target) &&
			!dom.button?.contains(event.target)
		) {
			UIHelpers.hideDropdown();
		}
	}

	function showSummaryOverlay(contentHTML, isError = false) {
		if (dom.overlay) {
			updateSummaryOverlay(contentHTML, isError);
			return;
		}

		dom.overlay = createElement('div', { id: CONFIG.ids.overlay });
		dom.overlay.innerHTML = `<div id="${CONFIG.ids.content}">${buildOverlayContent(contentHTML, isError)}</div>`;

		document.body.appendChild(dom.overlay);
		document.body.style.overflow = 'hidden';

		attachOverlayHandlers();
		dom.overlay.onclick = e => e.target === dom.overlay && closeOverlay();
	}

	function closeOverlay() {
		if (dom.overlay) {
			dom.overlay.remove();
			dom.overlay = null;
			dom.overlayElements = null;
			document.body.style.overflow = '';

			// Memory cleanup: clear article data and images
			state.currentSummary = null;
			state.articleImages = [];
			state.articleData = null;
		}
	}

	function updateSummaryOverlay(contentHTML, isError = false) {
		const contentDiv = document.getElementById(CONFIG.ids.content);
		if (contentDiv) {
			contentDiv.innerHTML = buildOverlayContent(contentHTML, isError);
			attachOverlayHandlers();
		}
	}

	function showErrorNotification(message) {
		const existing = document.getElementById(CONFIG.ids.error);
		if (existing) existing.remove();

		const errorDiv = createElement('div', {
			id: CONFIG.ids.error,
			className: 'error-notification',
		});

		const messageEl = createElement('div', {
			className: 'error-message',
			innerText: message,
		});

		const closeBtn = createElement('button', {
			className: 'error-close',
			textContent: '×',
			onclick: () => errorDiv.remove(),
		});

		errorDiv.appendChild(messageEl);
		errorDiv.appendChild(closeBtn);
		document.body.appendChild(errorDiv);

		// Animate in
		requestAnimationFrame(() => {
			errorDiv.classList.add('error-active');
		});

		// Auto-dismiss after duration, but allow manual dismiss (with cleanup)
		const autoDismissTimeout = setTimeout(() => {
			if (errorDiv.parentNode) {
				errorDiv.classList.remove('error-active');
				setTimeout(() => {
					if (errorDiv.parentNode) {
						errorDiv.remove();
					}
				}, CONFIG.timing.errorFadeOut);
			}
		}, CONFIG.timing.errorNotificationDuration);

		// Store timeout reference for cleanup on manual dismiss
		errorDiv._autoDismissTimeout = autoDismissTimeout;
		closeBtn.onclick = () => {
			if (errorDiv._autoDismissTimeout) {
				clearTimeout(errorDiv._autoDismissTimeout);
			}
			errorDiv.remove();
		};
	}

	const _modelConfigCache = new Map();
	const MAX_CACHE_SIZE = 50; // Prevent unbounded cache growth

	function getActiveModelConfig() {
		const activeId = state.activeModel;

		if (_modelConfigCache.has(activeId)) {
			return _modelConfigCache.get(activeId);
		}

		for (const serviceKey in CONFIG.modelGroups) {
			const group = CONFIG.modelGroups[serviceKey];
			const modelConfig = group.models.find(m => m.id === activeId);
			if (modelConfig) {
				const config = { ...modelConfig, service: serviceKey, isCustom: false };

				// Limit cache size to prevent memory leak
				if (_modelConfigCache.size >= MAX_CACHE_SIZE) {
					const firstKey = _modelConfigCache.keys().next().value;
					_modelConfigCache.delete(firstKey);
				}

				_modelConfigCache.set(activeId, config);
				return config;
			}
		}

		const customConfig = state.customModels.find(m => m.id === activeId);
		if (customConfig) {
			const config = { ...customConfig, isCustom: true };

			// Limit cache size to prevent memory leak
			if (_modelConfigCache.size >= MAX_CACHE_SIZE) {
				const firstKey = _modelConfigCache.keys().next().value;
				_modelConfigCache.delete(firstKey);
			}

			_modelConfigCache.set(activeId, config);
			return config;
		}

		console.error(`Summarize with AI: Active model configuration not found for ID: ${activeId}`);
		return null;
	}

	// Clear cache when custom models are modified
	function clearModelConfigCache() {
		_modelConfigCache.clear();
	}

	function validateInoreaderArticle() {
		const selection = window.getSelection();
		const selectedText = selection?.toString().trim();

		if (selectedText && selectedText.length > CONFIG.limits.minSelectionLength) {
			// Try to extract title from the selection or nearby DOM elements
			let title = 'Inoreader Article';

			try {
				// Get the anchor node (starting point of selection)
				const anchorNode = selection.anchorNode;

				// Try to find the article container
				let articleElement = anchorNode?.parentElement;
				while (articleElement && !articleElement.classList?.contains('article_content')) {
					articleElement = articleElement.parentElement;
					// Stop if we've gone too far up the DOM
					if (articleElement === document.body) break;
				}

				if (articleElement) {
					// Try to find title in various possible locations
					// Check for article title link in the header
					const titleLink = articleElement.querySelector('.article_title a.article_title_link');
					if (titleLink?.textContent?.trim()) {
						title = titleLink.textContent.trim();
					} else {
						// Try alternative selectors
						const altTitle =
							articleElement.querySelector('.article_title') ||
							articleElement.querySelector('.article_header h1') ||
							articleElement.querySelector('[class*="title"]');
						if (altTitle?.textContent?.trim()) {
							title = altTitle.textContent.trim();
						}
					}
				}

				// If we still don't have a good title, try to extract from the first line of selected text
				if (title === 'Inoreader Article') {
					const firstLine = selectedText.split('\n')[0].trim();
					// If the first line looks like a title (not too long, no "by" author attribution)
					if (
						firstLine.length > 10 &&
						firstLine.length < 150 &&
						!firstLine.toLowerCase().startsWith('by ')
					) {
						title = firstLine;
					}
				}
			} catch (error) {
				console.warn('Failed to extract Inoreader article title:', error);
			}

			return {
				title: title,
				content: selectedText,
			};
		}

		showErrorNotification(
			`Please select at least ${CONFIG.limits.minSelectionLength} characters to summarize.`,
		);
		return null;
	}

	async function validateModelAndApiKey() {
		const modelConfig = getActiveModelConfig();
		if (!modelConfig) {
			showErrorNotification(
				`Model "${state.activeModel}" is not available. Please select another model.`,
			);
			return null;
		}

		const modelDisplayName = modelConfig.name || modelConfig.id;
		const service = modelConfig.service;

		const apiKey = await StorageService.getApiKey(service);
		if (!apiKey) {
			const errorMsg = `${toTitleCase(service)} API key is required. To add one, long-press the S button and select Reset Key.`;
			UIHelpers.showError(errorMsg, true);
			return null;
		}

		return { modelConfig, apiKey, service, modelDisplayName };
	}

	async function processSummarization() {
		try {
			const articleData = await getValidatedArticleData();
			if (!articleData) return;

			// Extract images from article
			state.articleImages = await extractArticleImages();

			const validationResult = await validateModelAndApiKey();
			if (!validationResult) return;

			await executeSummarization(articleData, validationResult);
		} catch (error) {
			handleSummarizationError(error);
		}
	}

	async function getValidatedArticleData() {
		let articleData = state.articleData;

		if (window.location.hostname.includes('inoreader.com')) {
			articleData = validateInoreaderArticle();
			if (!articleData) return null;
		}

		if (!articleData) {
			showErrorNotification(
				'Unable to extract article content. Please try selecting text manually.',
			);
			return null;
		}

		return articleData;
	}

	async function executeSummarization(articleData, validationResult) {
		const { modelConfig, apiKey, service, modelDisplayName } = validationResult;

		// Update state with current article data so Q&A can access it
		state.articleData = articleData;

		showLoadingState(modelDisplayName);

		const payload = {
			title: articleData.title,
			content: articleData.content,
		};
		const response = await sendApiRequest(service, apiKey, payload, modelConfig);

		handleApiResponse(response);
	}

	function showLoadingState(modelDisplayName) {
		const loadingMessage = `<p class="glow">Summarizing with ${modelDisplayName}... </p>`;
		if (dom.overlay) {
			updateSummaryOverlay(loadingMessage);
		} else {
			showSummaryOverlay(loadingMessage);
		}
	}

	function handleSummarizationError(error) {
		const errorMsg = `Error: ${error.message}`;
		console.error('Summarize with AI:', errorMsg, error);
		showSummaryOverlay(`<p style="color: ${CONFIG.styles.colors.error};">${errorMsg}</p>`, true);
		UIHelpers.hideDropdown();
	}

	async function sendApiRequest(service, apiKey, payload, modelConfig, skipBuildBody = false) {
		const group = CONFIG.modelGroups[service];
		const url = group.baseUrl;

		// If skipBuildBody is true, use payload directly (for Q&A feature)
		// Otherwise, build the request body from title/content (for summarization)
		const requestBody = skipBuildBody ? payload : buildRequestBody(payload, modelConfig);

		return new Promise((resolve, reject) => {
			GM.xmlHttpRequest({
				method: 'POST',
				url,
				headers: getHeaders(apiKey),
				data: JSON.stringify(requestBody),
				responseType: 'json',
				timeout: CONFIG.timing.apiRequestTimeout,
				onload: response => {
					const responseData = response.response || response.responseText;
					resolve({
						status: response.status,
						data:
							typeof responseData === 'object' ? responseData : JSON.parse(responseData || '{}'),
						statusText: response.statusText,
					});
				},
				onerror: error =>
					reject(new Error(`Network error: ${error.statusText || 'Failed to connect'}`)),
				onabort: () => reject(new Error('Request aborted')),
				ontimeout: () => reject(new Error('Request timed out after 60 seconds')),
			});
		});
	}

	// Consolidated regex patterns at module level for better performance and maintainability
	const REGEX_PATTERNS = {
		// Summary cleaning patterns
		cleanSummary: {
			newlines: /\n/g,
			multiSpaces: / {2,}/g,
			styleAttr: / style="[^"]*"/gi,
			deprecatedAttrs: / (?:color|face|size)="[^"]*"/gi,
			fontOpenTag: /<font([^>]*)>/gi,
			fontCloseTag: /<\/font>/gi,
		},
		// Q&A formatting patterns
		formatQA: {
			brackets: /\[([^\]]+)\]/g,
			bold: /\*\*([^*]+)\*\*/g,
			numberedList: /^\d+\.\s/,
			numberedListRemove: /^\d+\.\s*/,
		},
	};

	function cleanSummaryHTML(htmlString) {
		// Use cached regex for all replacements
		const { cleanSummary } = REGEX_PATTERNS;
		const cleaned = htmlString
			.replace(cleanSummary.newlines, ' ')
			.replace(cleanSummary.multiSpaces, ' ')
			.trim()
			.replace(cleanSummary.styleAttr, '')
			.replace(cleanSummary.deprecatedAttrs, '')
			.replace(cleanSummary.fontOpenTag, '<span$1>')
			.replace(cleanSummary.fontCloseTag, '</span>');

		// Only use DOM for final sanitization if needed
		const tempDiv = document.createElement('div');
		tempDiv.innerHTML = cleaned;
		return tempDiv.innerHTML;
	}

	function handleApiResponse(response) {
		const { status, data, statusText } = response;

		if (status < 200 || status >= 300) {
			const errorDetails =
				data?.error?.message || data?.message || statusText || 'Unknown API error';
			throw new Error(`API Error (${status}): ${errorDetails}`);
		}

		const message = data?.content?.[0];
		if (data?.stop_reason === 'max_tokens') {
			console.warn('Summarize with AI: Summary may be incomplete (max token limit reached)');
		}
		const rawSummary = message?.text || '';

		if (!rawSummary && !data?.error) {
			console.error('Summarize with AI: API Response Data:', data);
			throw new Error('API response did not contain a valid summary.');
		}

		const cleanedSummary = cleanSummaryHTML(rawSummary);
		state.currentSummary = {
			title: state.articleData?.title || 'Untitled',
			content: cleanedSummary,
			timestamp: new Date().toISOString(),
		};
		updateSummaryOverlay(cleanedSummary, false);
	}

	function buildRequestBody({ title, content }, modelConfig) {
		const systemPrompt = PROMPT_TEMPLATE(title, content);

		return {
			model: modelConfig.id,
			messages: [{ role: 'user', content: systemPrompt }],
			...mergeParams(CONFIG.modelGroups.claude.defaultParams, modelConfig.params),
		};
	}

	function getHeaders(apiKey) {
		return {
			'Content-Type': 'application/json',
			'x-api-key': apiKey,
			'anthropic-version': '2023-06-01',
		};
	}

	async function handleApiKeyReset(service) {
		if (!service || !CONFIG.modelGroups[service]) {
			console.error('Invalid service provided for API key reset:', service);
			await NotificationService.invalidService();
			return;
		}
		const newApiKey = await ModalService.prompt(
			`Enter your ${toTitleCase(service)} API key:`,
			'',
			'Leave blank to clear existing key',
		);

		if (newApiKey !== null) {
			const trimmedApiKey = newApiKey.trim();
			await StorageService.setApiKey(service, newApiKey);
			if (trimmedApiKey) {
				await NotificationService.apiKeyUpdated(service);
			} else {
				await NotificationService.apiKeyCleared(service);
			}
		}
	}

	async function handleAddModel() {
		const service = 'claude';

		const modelId = await ModalService.prompt(
			'Enter the Claude model ID:',
			'',
			'e.g., claude-3-opus-20240229',
		);

		if (modelId === null) return; // User cancelled

		const trimmedModelId = modelId.trim();
		if (!trimmedModelId) {
			await ModalService.alert('Model ID cannot be empty.');
			return;
		}

		await addCustomModel(service, trimmedModelId);
	}

	async function addCustomModel(service, modelId) {
		if (Validators.modelExists(service, modelId)) {
			await NotificationService.modelExists(modelId);
			return;
		}

		const newModel = { id: modelId, service };
		state.customModels.push(newModel);
		await StorageService.addCustomModel(newModel);
		clearModelConfigCache(); // Clear cache when models are modified
		state.dropdownNeedsUpdate = true;
		await NotificationService.modelAdded(modelId);
	}

	async function handleModelRemoval(modelId, service) {
		const confirmed = await ModalService.confirm(`Remove model "${modelId}"?`, 'Remove', 'Cancel');
		if (confirmed) {
			await StorageService.removeCustomModel(modelId, service);
			state.customModels = await StorageService.getCustomModels();
			clearModelConfigCache(); // Clear entire cache when models are modified

			if (state.activeModel === modelId) {
				state.activeModel = CONFIG.modelGroups.claude.models[0].id;
				await StorageService.setLastUsedModel(state.activeModel);
			}

			state.dropdownNeedsUpdate = true;
			if (dom.dropdown && dom.dropdown.style.display !== 'none') {
				populateDropdown(dom.dropdown);
				state.dropdownNeedsUpdate = false;
			}
			await NotificationService.modelRemoved(modelId);
		}
	}

	// --- Save Summary Functionality ---
	function handleCopySummary() {
		if (!state.currentSummary) {
			showErrorNotification('No summary to copy. Please generate a summary first.');
			return;
		}

		UIHelpers.setButtonState(CONFIG.ids.copyButton, 'Copying...', true);

		copyToClipboard(state.currentSummary.content)
			.then(() => showCopySuccess())
			.catch(error => showCopyError(error));
	}

	async function copyToClipboard(htmlContent) {
		// Always try modern Clipboard API first - it bypasses copy event listeners completely
		try {
			// Store reference to native clipboard API to prevent interference
			const nativeClipboard = Object.getOwnPropertyDescriptor(Navigator.prototype, 'clipboard');
			const clipboardAPI = nativeClipboard
				? nativeClipboard.get.call(navigator)
				: navigator.clipboard;

			// Check if clipboard API is available and has write method
			if (clipboardAPI && typeof clipboardAPI.write === 'function') {
				const parser = new DOMParser();
				const doc = parser.parseFromString(htmlContent, 'text/html');
				const textContent = doc.body.textContent || doc.body.innerText || '';

				const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
				const textBlob = new Blob([textContent], { type: 'text/plain' });

				await clipboardAPI.write([
					new ClipboardItem({
						'text/html': htmlBlob,
						'text/plain': textBlob,
					}),
				]);
				return;
			}
		} catch (error) {
			console.warn('Clipboard API with HTML failed, trying fallback:', error);
		}

		// Fallback for browsers without Clipboard API support
		return copyWithFallback(htmlContent);
	}

	function copyWithFallback(htmlContent) {
		// Use hidden contenteditable div for mobile browsers
		// Let the browser naturally handle HTML formatting (critical for Firefox Mobile)
		return new Promise((resolve, reject) => {
			// Store references to native APIs to prevent website interference
			const nativeExecCommand = Document.prototype.execCommand;
			const nativeGetSelection = Window.prototype.getSelection || (() => window.getSelection());
			const nativeCreateRange = Document.prototype.createRange;
			const nativeCreateElement = Document.prototype.createElement;
			const nativeAppendChild = Element.prototype.appendChild;
			const nativeRemove = Element.prototype.remove;
			const nativeFocus = HTMLElement.prototype.focus;
			const nativeAddEventListener = EventTarget.prototype.addEventListener;

			const tempDiv = nativeCreateElement.call(document, 'div');
			tempDiv.contentEditable = 'true';
			// Enhanced styling to prevent interference and ensure selectability
			tempDiv.style.cssText =
				'position:fixed!important;left:-9999px!important;top:0!important;opacity:0.01!important;width:1px!important;height:1px!important;overflow:hidden!important;user-select:text!important;-webkit-user-select:text!important;-moz-user-select:text!important;-ms-user-select:text!important;pointer-events:none!important;z-index:2147483647!important;';
			tempDiv.innerHTML = htmlContent;

			// Mark element to prevent removal by page scripts
			tempDiv.setAttribute('data-userscript-clipboard', 'true');

			// Block copy event propagation to prevent site interference (e.g., FT.com adding attribution)
			let copyEventBlocker = null;

			const cleanup = () => {
				try {
					const sel = nativeGetSelection.call(window);
					sel?.removeAllRanges?.();
					if (copyEventBlocker) {
						document.removeEventListener('copy', copyEventBlocker, true);
					}
					if (tempDiv.parentNode) {
						nativeRemove.call(tempDiv);
					}
				} catch (e) {
					console.error('Cleanup error:', e);
				}
			};

			try {
				// Install copy event blocker before adding element to DOM
				copyEventBlocker = e => {
					// Only block if the event is coming from our temp div
					if (e.target === tempDiv || tempDiv.contains(e.target)) {
						e.stopImmediatePropagation();
						e.stopPropagation();
					}
				};
				// Use capture phase with native addEventListener to intercept before page handlers
				nativeAddEventListener.call(document, 'copy', copyEventBlocker, true);

				nativeAppendChild.call(document.body, tempDiv);
				nativeFocus.call(tempDiv);

				const range = nativeCreateRange.call(document);
				range.selectNodeContents(tempDiv);
				const selection = nativeGetSelection.call(window);

				if (!selection) {
					throw new Error('Selection API not available');
				}

				selection.removeAllRanges();
				selection.addRange(range);

				// Small delay to ensure selection is fully registered
				setTimeout(() => {
					try {
						// Verify element and selection still exist (protection against interference)
						if (!tempDiv.parentNode) {
							cleanup();
							reject(new Error('Temporary element was removed by page'));
							return;
						}

						const currentSelection = nativeGetSelection.call(window);
						if (!currentSelection || currentSelection.rangeCount === 0) {
							cleanup();
							reject(new Error('Selection was cleared by page'));
							return;
						}

						const successful = nativeExecCommand.call(document, 'copy');
						cleanup();

						if (successful) {
							resolve();
						} else {
							reject(new Error('Copy command failed'));
						}
					} catch (error) {
						cleanup();
						reject(error);
					}
				}, 50);
			} catch (error) {
				cleanup();
				reject(error);
			}
		});
	}

	function showCopySuccess() {
		UIHelpers.setButtonState(CONFIG.ids.copyButton, 'Copied ✓', false);
		setTimeout(() => {
			UIHelpers.setButtonState(CONFIG.ids.copyButton, 'Copy Summary', false);
		}, CONFIG.timing.copySuccessDisplay);
	}

	function showCopyError(error) {
		console.error('Copy to clipboard failed:', error);
		UIHelpers.setButtonState(CONFIG.ids.copyButton, 'Copy Summary', false);
		showErrorNotification(`Failed to copy: ${error.message}`);
	}

	// --- Q&A Functionality ---
	function formatQAAnswer(text) {
		// Escape HTML first
		let formatted = escapeHtml(text);

		// Use consolidated regex patterns
		const { formatQA } = REGEX_PATTERNS;

		// Convert [From Article] and [Expert Context] to section headers
		formatted = formatted.replace(formatQA.brackets, '<p><strong>$1</strong></p>\n');

		// Convert **bold** to <strong>
		formatted = formatted.replace(formatQA.bold, '<strong>$1</strong>');

		// Split into lines for processing
		const lines = formatted.split('\n');
		const result = [];
		let inList = false;

		for (const line of lines) {
			const trimmedLine = line.trim();

			if (!trimmedLine) {
				// Close list if we were in one
				if (inList) {
					result.push('</ul>');
					inList = false;
				}
				continue;
			}

			// Check if this is a numbered list item
			if (formatQA.numberedList.test(trimmedLine)) {
				if (!inList) {
					result.push('<ul>');
					inList = true;
				}
				// Remove the number and add as list item
				const content = trimmedLine.replace(formatQA.numberedListRemove, '');
				result.push(`<li>${content}</li>`);
			}
			// Check if line already has HTML tags
			else if (trimmedLine.startsWith('<p>') || trimmedLine.startsWith('<strong>')) {
				if (inList) {
					result.push('</ul>');
					inList = false;
				}
				result.push(trimmedLine);
			}
			// Regular paragraph
			else {
				if (inList) {
					result.push('</ul>');
					inList = false;
				}
				result.push(`<p>${trimmedLine}</p>`);
			}
		}

		// Close any open list
		if (inList) {
			result.push('</ul>');
		}

		return result.join('\n');
	}

	async function handleAskQuestion() {
		const { questionInput, answerContainer, askBtn } = dom.overlayElements || {};

		if (!questionInput || !answerContainer) return;

		const question = questionInput.value.trim();
		if (!question) {
			showErrorNotification('Please enter a question.');
			return;
		}

		if (!state.articleData) {
			showErrorNotification('No article content available.');
			return;
		}

		// Disable input while processing
		questionInput.disabled = true;
		if (askBtn) {
			askBtn.disabled = true;
			askBtn.textContent = 'Thinking...';
		}

		try {
			const validationResult = await validateModelAndApiKey();
			if (!validationResult) {
				throw new Error('Model or API key validation failed');
			}

			const { modelConfig, apiKey, service } = validationResult;

			// Show loading state in answer container
			answerContainer.innerHTML =
				'<p class="glow" style="text-align: center; padding: 20px;">Thinking...</p>';

			const prompt = `You are an expert analyst with deep knowledge across business, technology, management, and research. Use the article below as your primary context, but draw upon your full expertise to provide comprehensive, insightful answers.

<article>
<title>${state.articleData.title}</title>
<content>${state.articleData.content}</content>
</article>

Question: ${question}

Instructions:
1. First, address what the article explicitly states about this question
2. Then, if relevant, expand with your broader knowledge and expertise to provide additional context, frameworks, or insights
3. Make clear distinctions between what's from the article vs. your additional expert knowledge
4. If the article doesn't address the question, use the article's topic as context and apply your expertise
5. Provide actionable insights where possible
6. Keep your response focused and under 150 words

Format your answer to clearly show: [From Article] ... [Expert Context] ... (if providing additional insights)`;

			const payload = {
				model: modelConfig.id,
				messages: [{ role: 'user', content: prompt }],
				max_tokens: 800,
			};

			const response = await sendApiRequest(service, apiKey, payload, modelConfig, true);

			if (response.status < 200 || response.status >= 300) {
				throw new Error(`API Error (${response.status})`);
			}

			const answer = response.data?.content?.[0]?.text || 'No answer received';

			// Format the answer with proper HTML structure
			const formattedAnswer = formatQAAnswer(answer);

			// Display answer
			answerContainer.innerHTML = `
        <div class="answer">
          <p><strong>Q:</strong> ${escapeHtml(question)}</p>
          <div class="answer-content">${formattedAnswer}</div>
        </div>
      `;

			// Clear input
			questionInput.value = '';
		} catch (error) {
			console.error('Ask question failed:', error);
			answerContainer.innerHTML = `<p style="color: ${CONFIG.styles.colors.error};">Error: ${escapeHtml(error.message)}</p>`;
		} finally {
			// Re-enable input
			questionInput.disabled = false;
			if (askBtn) {
				askBtn.disabled = false;
				askBtn.textContent = 'Ask';
			}
		}
	}

	function escapeHtml(text) {
		const div = document.createElement('div');
		div.textContent = text;
		return div.innerHTML;
	}

	// --- Image Lightbox Functions ---
	let currentImageIndex = 0;

	function openLightbox(index) {
		if (!state.articleImages.length) return;

		currentImageIndex = index;

		if (!dom.lightbox) {
			createLightbox();
		} else if (!dom.lightboxElements) {
			// Re-cache elements if they were cleared
			dom.lightboxElements = {
				img: dom.lightbox.querySelector('.lightbox-image'),
				iframe: dom.lightbox.querySelector('.lightbox-iframe'),
				counter: dom.lightbox.querySelector('.lightbox-counter'),
				prevBtn: dom.lightbox.querySelector('.lightbox-prev'),
				nextBtn: dom.lightbox.querySelector('.lightbox-next'),
			};
		}

		updateLightboxImage();
		dom.lightbox.style.display = 'flex';
		document.body.style.overflow = 'hidden';
	}

	function closeLightbox() {
		if (dom.lightbox) {
			dom.lightbox.style.display = 'none';
			document.body.style.overflow = '';

			// Cleanup event listeners to prevent memory leaks
			if (dom.lightboxCleanup) {
				dom.lightboxCleanup();
				dom.lightboxCleanup = null;
			}

			// Clear cached elements
			dom.lightboxElements = null;
		}
	}

	function createLightbox() {
		dom.lightbox = createElement('div', {
			className: 'lightbox-overlay',
		});

		// Create content container
		const lightboxContent = createElement('div', {
			className: 'lightbox-content',
		});

		const img = createElement('img', {
			className: 'lightbox-image',
			alt: 'Full size image',
		});

		const iframe = createElement('iframe', {
			className: 'lightbox-iframe',
			frameborder: '0',
			scrolling: 'no',
			style: 'display: none;',
		});

		lightboxContent.appendChild(img);
		lightboxContent.appendChild(iframe);

		// Create menu bar at bottom (similar to summary overlay)
		const menuBar = createElement('div', {
			className: 'lightbox-menubar',
		});

		const prevBtn = createElement('button', {
			className: 'menubar-button lightbox-prev',
			textContent: '← Prev',
			onclick: () => navigateLightbox(-1),
		});

		const counter = createElement('div', {
			className: 'lightbox-counter',
		});

		const nextBtn = createElement('button', {
			className: 'menubar-button lightbox-next',
			textContent: 'Next →',
			onclick: () => navigateLightbox(1),
		});

		const closeBtn = createElement('button', {
			className: 'menubar-button',
			textContent: 'Close',
			title: 'Close (Esc)',
			onclick: closeLightbox,
		});

		menuBar.appendChild(prevBtn);
		menuBar.appendChild(counter);
		menuBar.appendChild(nextBtn);
		menuBar.appendChild(closeBtn);

		dom.lightbox.appendChild(lightboxContent);
		dom.lightbox.appendChild(menuBar);
		document.body.appendChild(dom.lightbox);

		// Cache lightbox elements to avoid repeated DOM queries
		dom.lightboxElements = {
			img,
			iframe,
			counter,
			prevBtn,
			nextBtn,
		};

		// Close on overlay click
		const overlayClickHandler = e => {
			if (e.target === dom.lightbox) {
				closeLightbox();
			}
		};
		dom.lightbox.addEventListener('click', overlayClickHandler);

		// Keyboard navigation
		document.addEventListener('keydown', handleLightboxKeyboard);

		// Touch/swipe support
		let touchStartX = 0;
		let touchEndX = 0;

		const touchStartHandler = e => {
			touchStartX = e.changedTouches[0].screenX;
		};
		const touchEndHandler = e => {
			touchEndX = e.changedTouches[0].screenX;
			handleSwipe();
		};

		lightboxContent.addEventListener('touchstart', touchStartHandler, { passive: true });
		lightboxContent.addEventListener('touchend', touchEndHandler, { passive: true });

		function handleSwipe() {
			const swipeThreshold = 50;
			if (touchEndX < touchStartX - swipeThreshold) {
				navigateLightbox(1); // Swipe left - next image
			} else if (touchEndX > touchStartX + swipeThreshold) {
				navigateLightbox(-1); // Swipe right - previous image
			}
		}

		// Store cleanup function to remove all event listeners
		dom.lightboxCleanup = () => {
			document.removeEventListener('keydown', handleLightboxKeyboard);
			dom.lightbox.removeEventListener('click', overlayClickHandler);
			lightboxContent.removeEventListener('touchstart', touchStartHandler);
			lightboxContent.removeEventListener('touchend', touchEndHandler);
		};
	}

	function updateLightboxImage() {
		if (!dom.lightbox || !dom.lightboxElements || !state.articleImages.length) return;

		const { img, iframe, counter, prevBtn, nextBtn } = dom.lightboxElements;
		const currentItem = state.articleImages[currentImageIndex];
		counter.textContent = `${currentImageIndex + 1} / ${state.articleImages.length}`;

		// Show image or iframe based on type
		if (currentItem.type === 'iframe') {
			img.style.display = 'none';
			iframe.style.display = 'block';
			iframe.src = currentItem.src;
			iframe.title = currentItem.alt || 'Interactive visualization';
		} else {
			iframe.style.display = 'none';
			img.style.display = 'block';
			img.src = currentItem.src;
			img.alt = currentItem.alt || 'Article image';
		}

		// Disable/enable buttons at boundaries
		prevBtn.disabled = currentImageIndex === 0;
		nextBtn.disabled = currentImageIndex === state.articleImages.length - 1;
	}

	function navigateLightbox(direction) {
		const newIndex = currentImageIndex + direction;
		if (newIndex >= 0 && newIndex < state.articleImages.length) {
			currentImageIndex = newIndex;
			updateLightboxImage();
		}
	}

	function handleLightboxKeyboard(e) {
		if (!dom.lightbox || dom.lightbox.style.display === 'none') return;

		switch (e.key) {
			case 'Escape':
				e.preventDefault();
				closeLightbox();
				break;
			case 'ArrowLeft':
				e.preventDefault();
				navigateLightbox(-1);
				break;
			case 'ArrowRight':
				e.preventDefault();
				navigateLightbox(1);
				break;
		}
	}

	// --- Event Handlers & Utilities ---
	function handleKeyPress(e) {
		if (e.altKey && e.code === 'KeyS' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
			e.preventDefault();
			if (dom.button && !document.activeElement?.closest(CONFIG.selectors.input)) {
				processSummarization();
			}
		}
		if (e.key === 'Escape') {
			if (dom.overlay) {
				e.preventDefault();
				closeOverlay();
			} else if (dom.dropdown?.style.display !== 'none') {
				e.preventDefault();
				dom.dropdown.style.display = 'none';
			}
		}
	}

	function setupFocusListeners() {
		let focusOutTimer = null;

		document.addEventListener('focusin', event => {
			if (event.target?.closest(CONFIG.selectors.input)) {
				if (focusOutTimer) {
					clearTimeout(focusOutTimer);
					focusOutTimer = null;
				}
				if (dom.button) dom.button.style.display = 'none';
				if (dom.dropdown) dom.dropdown.style.display = 'none';
			}
		});

		document.addEventListener(
			'focusout',
			event => {
				const isLeavingInput = event.target?.closest(CONFIG.selectors.input);
				const isEnteringInput = event.relatedTarget?.closest(CONFIG.selectors.input);

				if (isLeavingInput && !isEnteringInput && state.articleData) {
					focusOutTimer = setTimeout(() => {
						if (!document.activeElement?.closest(CONFIG.selectors.input)) {
							if (dom.button) dom.button.style.display = 'flex';
						}
						focusOutTimer = null;
					}, CONFIG.timing.focusDebounceDelay);
				}
			},
			true,
		);
	}

	function injectStyles() {
		const fontFamily = CONFIG.styles.fontFamily;

		// Add viewport meta tag to prevent zooming on mobile
		if (!document.querySelector('meta[name="viewport"][content*="user-scalable=no"]')) {
			const viewport = document.createElement('meta');
			viewport.name = 'viewport';
			viewport.content =
				'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
			document.head.appendChild(viewport);
		}

		GM.addStyle(`
      /* =================================================================
         DESIGN SYSTEM TOKENS - Dieter Rams Principles
         Less but better: Unified spacing, colors, typography, transitions
         ================================================================= */
      :root {
        /* Color Palette */
        --color-text-primary: #1a1a1a;
        --color-text-secondary: #666;
        --color-text-tertiary: #999;
        --color-border: #e0e0e0;
        --color-border-light: #f0f0f0;
        --color-bg-primary: #ffffff;
        --color-bg-hover: #f5f5f5;
        --color-bg-active: #e8e8e8;
        --color-error: #d32f2f;
        --color-accent: #1A73E8;

        /* Spacing Scale (based on 4px grid) */
        --space-xs: 8px;
        --space-sm: 16px;
        --space-md: 24px;
        --space-lg: 32px;
        --space-xl: 40px;

        /* Typography Scale */
        --font-size-sm: 0.875rem;   /* 14px */
        --font-size-base: 1rem;      /* 16px */
        --font-size-lg: 1.125rem;    /* 18px */
        --font-weight-normal: 400;
        --font-weight-medium: 500;
        --line-height-tight: 1.4;
        --line-height-normal: 1.6;

        /* Border Radius */
        --radius-sm: 4px;
        --radius-md: 8px;
        --radius-lg: 12px;

        /* Shadows (unified elevation system) */
        --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.08);
        --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.12);
        --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.12);

        /* Transitions (consistent timing) */
        --transition-fast: 0.15s cubic-bezier(0.4, 0, 0.2, 1);
        --transition-base: 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        --easing-standard: cubic-bezier(0.4, 0, 0.2, 1);

        /* Z-Index Scale */
        --z-dropdown: 2147483641;
        --z-button: 2147483640;
        --z-overlay: 2147483645;
        --z-error: 2147483646;
        --z-lightbox: 2147483647;
        --z-modal: 2147483648;
      }

      /* Dark Mode Overrides */
      @media (prefers-color-scheme: dark) {
        :root {
          --color-text-primary: #ffffff;
          --color-text-secondary: #b8b8b8;
          --color-text-tertiary: #999;
          --color-border: #333;
          --color-border-light: #2a2a2a;
          --color-bg-primary: #1a1a1a;
          --color-bg-hover: #2a2a2a;
          --color-bg-active: #333;
        }
      }

      /* =================================================================
         MOBILE TOUCH PREVENTION
         ================================================================= */
      @media (max-width: 600px) {
        /* Prevent zooming and manipulation on all content areas */
        body {
          touch-action: pan-y;
          overscroll-behavior: none;
        }

        /* Lock all overlay and modal content from manipulation */
        #${CONFIG.ids.overlay},
        #${CONFIG.ids.content},
        .modal-overlay,
        .modal-content,
        .summary-content-body,
        .question-section,
        .image-gallery,
        .lightbox-overlay,
        .lightbox-content {
          touch-action: pan-y;
          user-select: none;
          -webkit-user-select: none;
        }

        /* Allow text selection only in specific content areas */
        #${CONFIG.ids.content} p,
        #${CONFIG.ids.content} ul,
        #${CONFIG.ids.content} ol,
        #${CONFIG.ids.content} li,
        .answer-content {
          user-select: text;
          -webkit-user-select: text;
        }

        /* Ensure buttons and interactive elements remain functional */
        button,
        .modal-button,
        .menubar-button,
        .ask-button,
        #${CONFIG.ids.button},
        .model-item,
        .lightbox-nav,
        .lightbox-close {
          touch-action: manipulation;
          user-select: none;
          -webkit-user-select: none;
        }

        /* Allow input fields to be interactive */
        input,
        textarea,
        .question-input,
        .modal-input {
          touch-action: manipulation;
          user-select: text;
          -webkit-user-select: text;
        }
      }

      /* =================================================================
         CUSTOM MODAL SYSTEM - Dieter Rams Design Principles
         ================================================================= */
      .modal-overlay {
        position: fixed;
        top: 0; left: 0;
        width: 100%; height: 100%;
        background: rgba(0, 0, 0, 0);
        z-index: var(--z-modal);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background var(--transition-base);
        opacity: 0;
      }

      .modal-overlay.modal-active {
        background: rgba(0, 0, 0, 0.4);
        opacity: 1;
      }

      .modal-content {
        background: var(--color-bg-primary);
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-lg);
        max-width: 420px;
        width: 90%;
        padding: 0;
        font-family: ${fontFamily};
        transform: scale(0.9) translateY(20px);
        transition: transform var(--transition-base);
        overflow: hidden;
      }

      .modal-active .modal-content {
        transform: scale(1) translateY(0);
      }

      .modal-message {
        padding: var(--space-lg) var(--space-lg) var(--space-md) var(--space-lg);
        font-size: var(--font-size-base);
        line-height: var(--line-height-normal);
        color: var(--color-text-primary);
        text-align: left;
      }

      .modal-input {
        width: 100%;
        padding: 12px var(--space-sm);
        margin: 0 var(--space-lg) var(--space-md) var(--space-lg);
        width: calc(100% - var(--space-lg) * 2);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
        font-family: ${fontFamily};
        font-size: var(--font-size-base);
        color: var(--color-text-primary);
        background: var(--color-bg-hover);
        box-sizing: border-box;
        transition: all var(--transition-fast);
        outline: none;
      }

      .modal-input:focus {
        border-color: var(--color-text-primary);
        background: var(--color-bg-primary);
      }

      .modal-input::placeholder {
        color: var(--color-text-tertiary);
      }

      .modal-actions {
        display: flex;
        gap: 0;
        border-top: 1px solid var(--color-border-light);
      }

      .modal-button {
        flex: 1;
        padding: var(--space-sm);
        border: none;
        background: transparent;
        font-family: ${fontFamily};
        font-size: var(--font-size-base);
        font-weight: var(--font-weight-medium);
        cursor: pointer;
        transition: background var(--transition-fast);
        color: var(--color-text-secondary);
        user-select: none;
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        -webkit-touch-callout: none;
        -webkit-tap-highlight-color: transparent;
      }

      .modal-button:hover {
        background: var(--color-bg-hover);
      }

      .modal-button:active {
        background: transparent;
      }

      .modal-button:focus {
        outline: 2px solid var(--color-accent);
        outline-offset: -2px;
      }

      /* Remove redundant primary button styles - they're identical to base */
      .modal-button-secondary {
        border-right: 1px solid var(--color-border-light);
      }

      .modal-button:only-child {
        border-right: none;
      }

      /* =================================================================
         MAIN UI COMPONENTS
         ================================================================= */
      #${CONFIG.ids.button} {
        position: fixed; bottom: 24px; right: 24px;
        width: 56px; height: 56px;
        background: #1a1a1a;
        color: #ffffff; font-size: 1rem; font-weight: 500;
        font-family: ${fontFamily};
        border-radius: 50%; cursor: pointer; z-index: 2147483640;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15), 0 1px 2px rgba(0, 0, 0, 0.1);
        display: flex !important; align-items: center !important; justify-content: center !important;
        transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
        line-height: 1;
        user-select: none;
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        -webkit-touch-callout: none;
        -webkit-tap-highlight-color: transparent;
        border: none;
      }
      #${CONFIG.ids.button}:hover {
        background: #2a2a2a;
        color: #ffffff;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2), 0 2px 4px rgba(0, 0, 0, 0.15);
        transform: translateY(-1px);
      }
      #${CONFIG.ids.dropdown} {
        position: fixed; bottom: 80px; right: 20px;
        background: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12); z-index: 2147483641;
        max-height: 70vh; overflow-y: auto;
        padding: 8px; width: 300px;
        font-family: ${fontFamily};
        display: none;
        animation: fadeIn 0.2s ease-out;
      }
      #${CONFIG.ids.overlay} {
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background-color: rgba(0, 0, 0, 0.4);
        z-index: 2147483645;
        display: flex; align-items: center; justify-content: center;
        overflow: hidden;
        font-family: ${fontFamily};
        animation: fadeIn 0.3s ease-out;
      }
      #${CONFIG.ids.content} {
        background-color: #fff;
        color: #1a1a1a;
        padding: 0;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
        max-width: 680px; width: 90%; max-height: 85vh;
        overflow-y: auto;
        position: relative;
        font-size: 1rem; line-height: 1.6;
        animation: slideInUp 0.3s ease-out;
        white-space: normal;
        box-sizing: border-box;
        border-radius: 8px;
        display: flex;
        flex-direction: column;
      }
      .summary-menubar {
        display: flex; justify-content: flex-end; gap: 12px;
        position: sticky; bottom: 0;
        background: rgba(255, 255, 255, 0.98);
        padding: 12px 24px;
        border-top: 1px solid #e8e8e8;
        z-index: 10;
        backdrop-filter: blur(10px);
      }
      .menubar-button {
        background: transparent;
        border: 1px solid #e0e0e0;
        font-family: ${fontFamily};
        font-size: 0.95rem; font-weight: 500;
        color: #666; cursor: pointer;
        padding: 6px 12px; border-radius: 4px;
        transition: all 0.15s ease;
        white-space: nowrap;
        user-select: none;
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        -webkit-touch-callout: none;
        -webkit-tap-highlight-color: transparent;
      }
      .menubar-button:hover {
        background: #f5f5f5;
        border-color: #d0d0d0;
        color: #1a1a1a;
      }
      .summary-content-body {
        padding: 32px 40px;
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
      }

      /* When content is loaded, remove centering */
      .summary-content-body:has(ul),
      .summary-content-body:has(p:not(.glow)) {
        justify-content: flex-start;
      }
      #${CONFIG.ids.content} * {
        font-family: ${fontFamily} !important;
        line-height: inherit !important;
      }
      #${CONFIG.ids.content} p {
        margin-top: 0;
        margin-bottom: 1.2em;
        color: inherit;
        max-width: 65ch;
      }
      #${CONFIG.ids.content} ul {
        margin: 1.2em 0;
        padding-left: 1.5em;
        color: inherit;
      }
      #${CONFIG.ids.content} li {
        list-style-type: disc;
        margin-bottom: 0.6em;
        color: inherit;
        line-height: 1.5;
      }
      #${CONFIG.ids.content} strong {
        font-weight: 600;
        color: #0a0a0a;
        font-size: 1em;
        letter-spacing: -0.005em;
      }
      #${CONFIG.ids.content} span:not([class*="article-"]) {
        color: inherit !important;
      }
      /* Error Notification - Dieter Rams Style */
      .error-notification {
        position: fixed;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%) translateY(20px);
        background: #ffffff;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
        z-index: 2147483646;
        font-family: ${fontFamily};
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 16px 20px;
        min-width: 320px;
        max-width: 480px;
        opacity: 0;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .error-notification.error-active {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }

      .error-message {
        flex: 1;
        font-size: 0.95rem;
        line-height: 1.5;
        color: #1a1a1a;
        margin: 0;
      }

      .error-close {
        background: transparent;
        border: none;
        color: #666;
        font-size: 1.5rem;
        line-height: 1;
        cursor: pointer;
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: all 0.15s ease;
        flex-shrink: 0;
        font-family: ${fontFamily};
      }

      .error-close:hover {
        background: #f0f0f0;
        color: #1a1a1a;
      }
      .retry-button, .save-button {
        display: block; margin: 24px auto 0; padding: 12px 24px;
        background-color: #1a1a1a;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer; font-size: 1rem; font-weight: 500;
        transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
        letter-spacing: 0.02em;
      }
      .retry-button:hover, .save-button:hover:not(:disabled) {
        background-color: #2a2a2a;
        color: white;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        transform: translateY(-1px);
      }
      .save-button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      /* =================================================================
         Q&A SECTION
         ================================================================= */
      .question-section {
        border-top: 1px solid #e8e8e8;
        padding: 24px 40px;
        margin-top: 0;
        background: #f8f8f8;
      }
      .question-header {
        font-weight: 600;
        color: #1a1a1a;
        margin-bottom: 12px;
        font-size: 0.95rem;
      }
      .question-input-wrapper {
        display: flex;
        gap: 10px;
        margin-bottom: 16px;
      }
      .question-input {
        flex: 1;
        padding: 10px 14px;
        border: 1px solid #d8d8d8;
        border-radius: 4px;
        font-family: ${fontFamily};
        font-size: 0.95rem;
        transition: border-color 0.15s;
        background: white;
        color: #1a1a1a;
      }
      .question-input:focus {
        outline: none;
        border-color: #1a1a1a;
      }
      .question-input:disabled {
        background: #f5f5f5;
        color: #666;
        cursor: not-allowed;
      }
      @media (prefers-color-scheme: light) {
        .ask-button {
          padding: 10px 20px;
          background-color: #1a1a1a;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-family: ${fontFamily};
          font-size: 0.95rem;
          font-weight: 500;
          transition: all 0.15s ease;
          white-space: nowrap;
        }
        .ask-button:hover:not(:disabled) {
          background-color: #2a2a2a;
          color: white;
        }
      }

      .ask-button {
        padding: 10px 20px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-family: ${fontFamily};
        font-size: 0.95rem;
        font-weight: 500;
        transition: all 0.15s ease;
        white-space: nowrap;
        user-select: none;
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        -webkit-touch-callout: none;
        -webkit-tap-highlight-color: transparent;
      }
      .ask-button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      .answer-container {
        min-height: 40px;
      }
      .answer {
        background: white;
        padding: 16px;
        border-radius: 4px;
        border-left: 3px solid #1a1a1a;
        line-height: 1.6;
      }
      .answer > p {
        margin-top: 0;
        margin-bottom: 1em;
      }
      .answer > p:first-child {
        font-weight: 600;
        color: #1a1a1a;
        margin-bottom: 0.75em;
      }
      .answer strong {
        color: #1a1a1a;
        font-weight: 600;
      }
      .answer-content {
        margin-top: 0.5em;
      }
      .answer-content p {
        margin-top: 0;
        margin-bottom: 1em;
        line-height: 1.6;
      }
      .answer-content ul {
        margin: 0.75em 0;
        padding-left: 1.5em;
      }
      .answer-content li {
        margin-bottom: 0.5em;
        line-height: 1.5;
      }

      /* =================================================================
         IMAGE GALLERY
         ================================================================= */
      .image-gallery {
        padding: 24px 40px;
        background: #f8f8f8;
        border-top: 1px solid #e8e8e8;
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 12px;
      }
      .gallery-item {
        overflow: hidden;
        border-radius: 4px;
        background: #fff;
        box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        cursor: pointer;
        transition: transform 0.15s ease, box-shadow 0.15s ease;
      }
      .gallery-item:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0,0,0,0.12);
      }
      .gallery-item img {
        width: 100%;
        height: 180px;
        object-fit: cover;
        display: block;
      }
      .gallery-item-iframe {
        display: flex;
        align-items: center;
        justify-content: center;
        background: #f5f5f5;
        min-height: 200px;
      }
      .iframe-preview {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 8px;
        color: #666;
      }
      .iframe-preview svg {
        width: 48px;
        height: 48px;
      }
      .iframe-preview span {
        font-size: 14px;
        font-weight: 500;
      }

      /* =================================================================
         LIGHTBOX VIEWER
         ================================================================= */
      .lightbox-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: #ffffff;
        z-index: 2147483647;
        display: none;
        flex-direction: column;
        animation: fadeIn 0.3s ease-out;
      }
      .lightbox-menubar {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 12px;
        background: rgba(255, 255, 255, 0.98);
        padding: 10px 24px;
        border-top: 1px solid #f0f0f0;
        z-index: 10;
        backdrop-filter: blur(8px);
        flex-shrink: 0;
      }
      .lightbox-menubar .menubar-button {
        background: transparent;
        border: 1px solid #e0e0e0;
        font-family: ${fontFamily};
        font-size: 1rem;
        font-weight: 500;
        color: #666;
        cursor: pointer;
        padding: 4px 8px;
        border-radius: 4px;
        transition: all 0.2s ease;
      }
      .lightbox-menubar .menubar-button:hover:not(:disabled) {
        background: #f5f5f5;
        border-color: #d0d0d0;
        color: #1a1a1a;
      }
      .lightbox-menubar .menubar-button:disabled {
        opacity: 0.3;
        cursor: not-allowed;
        border-color: #e0e0e0;
      }
      .lightbox-counter {
        color: #666;
        padding: 4px 12px;
        font-size: 1rem;
        font-family: ${fontFamily};
        font-weight: 500;
        margin: 0;
      }
      .lightbox-content {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        padding: 20px;
      }
      .lightbox-image {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
        user-select: none;
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
      }
      .lightbox-iframe {
        width: 90vw;
        max-width: 1200px;
        height: 80vh;
        border: none;
        background: #fff;
      }

      /* =================================================================
         DROPDOWN COMPONENTS
         ================================================================= */
      .model-group { margin-bottom: 12px; }
      .group-header-container {
        display: flex; align-items: center; justify-content: space-between;
        padding: 10px 14px; background: #fafafa;
        border-radius: 4px; margin-bottom: 6px;
        border-left: 2px solid #e0e0e0;
      }
      .group-header-text {
        font-weight: 600; color: #1a1a1a; font-size: 1rem;
        text-transform: none; letter-spacing: 0.08em;
        flex-grow: 1;
      }
      .reset-key-link {
        font-size: 1rem; color: #666; text-decoration: none;
        margin-left: 12px;
        white-space: nowrap;
        cursor: pointer;
        transition: color 0.15s cubic-bezier(0.4, 0, 0.2, 1);
        font-weight: 500;
      }
      .reset-key-link:hover { color: #1a1a1a; }
      .model-item {
        padding: 11px 14px; margin: 2px 0; border-radius: 4px;
        transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
        font-size: 1rem; cursor: pointer; color: #2a2a2a; display: block;
        overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        font-weight: 400;
      }
      .model-item:hover {
        background-color: #f5f5f5; color: #1a1a1a;
        transform: translateX(2px);
      }
      .add-model-item {
         color: #666;
         font-style: normal;
         font-weight: 500;
      }
      .add-model-item:hover { background-color: #f0f0f0; color: #1a1a1a; }

      /* =================================================================
         LOADING & STATUS INDICATORS
         ================================================================= */
      .glow {
        text-align: center; padding: 40px 0;
        animation: glow 2.5s ease-in-out infinite;
        font-family: ${fontFamily};
        font-weight: 400;
      }
      span.article-excellent { color: #2ecc71; font-weight: bold; }
      span.article-good      { color: #3498db; font-weight: bold; }
      span.article-average   { color: #f39c12; font-weight: bold; }
      span.article-bad       { color: #e74c3c; font-weight: bold; }
      span.article-very-bad  { color: #c0392b; font-weight: bold; }

      /* =================================================================
         ANIMATIONS
         ================================================================= */
      @keyframes glow {
        0%, 100% { color: #4a90e2; text-shadow: 0 0 10px rgba(74, 144, 226, 0.6), 0 0 20px rgba(74, 144, 226, 0.4); }
        33%      { color: #9b59b6; text-shadow: 0 0 12px rgba(155, 89, 182, 0.7), 0 0 25px rgba(155, 89, 182, 0.5); }
        66%      { color: #e74c3c; text-shadow: 0 0 12px rgba(231, 76, 60, 0.7), 0 0 25px rgba(231, 76, 60, 0.5); }
      }
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
      @keyframes slideInUp {
         from { transform: translateY(30px); opacity: 0; }
         to { transform: translateY(0); opacity: 1; }
      }

      /* =================================================================
         DARK MODE THEME
         ================================================================= */
      @media (prefers-color-scheme: dark) {
        /* Custom Modal Dark Mode */
        .modal-overlay.modal-active {
          background: rgba(0, 0, 0, 0.6);
        }

        .modal-content {
          background: #1a1a1a;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        }

        .modal-message {
          color: #e8e8e8;
        }

        .modal-input {
          background: #2a2a2a;
          border-color: #444;
          color: #e8e8e8;
        }

        .modal-input:focus {
          border-color: #666;
          background: #333;
        }

        .modal-input::placeholder {
          color: #777;
        }

        .modal-actions {
          border-top-color: #2a2a2a;
        }

        .modal-button {
          color: #999;
        }

        .modal-button:hover {
          background: #2a2a2a;
          color: #999;
        }

        .modal-button:active {
          background: transparent;
          color: #999;
        }

        .modal-button:focus {
          outline: none !important;
          box-shadow: none !important;
          background: transparent;
          color: #999;
        }

        .modal-button-primary {
          color: #999;
          font-weight: 500 !important;
        }

        .modal-button-primary:hover {
          color: #999;
          font-weight: 500 !important;
        }

        .modal-button-primary:active {
          color: #999;
          font-weight: 500 !important;
        }

        .modal-button-primary:focus {
          outline: none !important;
          box-shadow: none !important;
          background: transparent;
          color: #999;
          font-weight: 500 !important;
        }

        .modal-button-secondary {
          border-right-color: #2a2a2a;
        }

        /* Error Notification Dark Mode */
        .error-notification {
          background: #1a1a1a;
          border-color: #333;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
        }

        .error-message {
          color: #e8e8e8;
        }

        .error-close {
          color: #999;
        }

        .error-close:hover {
          background: #2a2a2a;
          color: #e8e8e8;
        }

        #${CONFIG.ids.overlay} {
          background-color: rgba(0, 0, 0, 0.6);
        }
        #${CONFIG.ids.button} {
          background: #1a1a1a !important;
          color: #ffffff;
        }
        #${CONFIG.ids.button}:hover {
          background: #2a2a2a !important;
        }
        #${CONFIG.ids.content} {
          background-color: #1a1a1a;
          color: #e8e8e8;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6), 0 4px 12px rgba(0, 0, 0, 0.4);
        }
        #${CONFIG.ids.content} *:not([class*="article-"]):not(.retry-button):not(.save-button):not(button) {
          color: inherit !important;
        }
        #${CONFIG.ids.content} strong {
          color: #f5f5f5;
        }
        #${CONFIG.ids.closeButton} {
          color: #999;
          background: #1a1a1a;
        }
        #${CONFIG.ids.closeButton}:hover {
          color: #e8e8e8;
          background: #2a2a2a;
        }
        .retry-button, .save-button,
        #summarize-retry-button {
          background-color: #e8e8e8 !important;
          color: #1a1a1a !important;
        }
        .retry-button:hover, .save-button:hover:not(:disabled),
        #summarize-retry-button:hover {
          background-color: #f5f5f5 !important;
          color: #1a1a1a !important;
        }
        #${CONFIG.ids.dropdown} { background: #1a1a1a; border-color: #333; }
        .model-item { color: #d0d0d0; }
        .model-item:hover { background-color: #2a2a2a; color: #e8e8e8; }
        .group-header-container { background: #242424; border-left-color: #333; }
        .group-header-text { color: #e8e8e8; }
        .reset-key-link { color: #999; }
        .reset-key-link:hover { color: #e8e8e8; }
        .add-model-item { color: #999; }
        .add-model-item:hover { background-color: #2a2a2a; color: #e8e8e8; }
        hr { border-top-color: #333 !important; }
        .summary-menubar {
          background: rgba(26, 26, 26, 0.98);
          border-top-color: #2a2a2a;
        }
        .menubar-button {
          background: transparent;
          border-color: #444;
          color: #999;
        }
        .menubar-button:hover {
          background: #2a2a2a;
          border-color: #555;
          color: #e8e8e8;
        }
        .question-section {
          background: #1a1a1a;
          border-top-color: #333;
        }
        .question-header {
          color: #e8e8e8;
        }
        .question-input {
          background: #2a2a2a;
          border-color: #444;
          color: #e8e8e8;
        }
        .question-input:focus {
          border-color: #666;
        }
        .question-input:disabled {
          background: #1a1a1a;
          color: #666;
        }
        .ask-button {
          background-color: #e8e8e8 !important;
          color: #1a1a1a !important;
        }
        .ask-button:hover:not(:disabled) {
          background-color: #ffffff !important;
          color: #1a1a1a !important;
        }
        .answer {
          background: #242424;
          color: #e8e8e8;
          border-left-color: #666;
        }
        .answer > p:first-child {
          color: #e8e8e8;
        }
        .answer strong {
          color: #e8e8e8;
        }
        .image-gallery {
          background: #1a1a1a;
          border-top-color: #333;
        }
        .gallery-item {
          background: #242424;
        }
        .lightbox-overlay {
          background: #1a1a1a;
        }
        .lightbox-menubar {
          background: rgba(26, 26, 26, 0.98);
          border-top-color: #2a2a2a;
        }
        .lightbox-menubar .menubar-button {
          background: transparent;
          border-color: #444;
          color: #999;
        }
        .lightbox-menubar .menubar-button:hover:not(:disabled) {
          background: #2a2a2a;
          border-color: #555;
          color: #e8e8e8;
        }
        .lightbox-menubar .menubar-button:disabled {
          border-color: #444;
        }
        .lightbox-counter {
          color: #999;
        }
        .gallery-item-iframe {
          background: #242424;
        }
        .iframe-preview {
          color: #999;
        }
        .lightbox-iframe {
          background: #1a1a1a;
        }
      }

      /* =================================================================
         MOBILE RESPONSIVENESS
         ================================================================= */
      @media (max-width: 600px) {
         /* Custom Modal Mobile */
         .modal-content {
           max-width: 95%;
           border-radius: 12px;
         }

         .modal-message {
           padding: 24px 24px 20px 24px;
           font-size: 0.95rem;
         }

         .modal-input {
           margin: 0 24px 20px 24px;
           width: calc(100% - 48px);
           padding: 12px 14px;
           font-size: 0.95rem;
         }

         .modal-button {
           padding: 14px;
           font-size: 0.95rem;
         }

         /* Error Notification Mobile */
         .error-notification {
           bottom: 20px;
           left: 16px;
           right: 16px;
           transform: translateX(0) translateY(20px);
           min-width: auto;
           max-width: none;
           padding: 14px 16px;
         }

         .error-notification.error-active {
           transform: translateX(0) translateY(0);
         }

         .error-message {
           font-size: 0.9rem;
         }

         .error-close {
           width: 20px;
           height: 20px;
           font-size: 1.3rem;
         }

         #${CONFIG.ids.content} {
            width: 100%; height: 100%;
            max-width: none; max-height: none;
            padding: 0 0 56px 0;
            box-shadow: none; animation: none;
            overflow-y: auto;
            border-radius: 0;
         }
         .summary-menubar {
            padding: 10px 16px;
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            z-index: 11;
         }
         .menubar-button {
            font-size: 0.9rem;
            padding: 6px 10px;
         }
         .summary-content-body {
            padding: 20px 16px;
         }
         .question-section {
            padding: 20px 16px;
         }
         .question-header {
            font-size: 0.9rem;
         }
         .question-input-wrapper {
            flex-direction: column;
            gap: 8px;
         }
         .question-input {
            font-size: 0.9rem;
         }
         .ask-button {
            width: 100%;
            font-size: 0.9rem;
         }
         .image-gallery {
            padding: 20px 16px;
            grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
            gap: 10px;
         }
         .gallery-item img {
            height: 140px;
         }
         #${CONFIG.ids.overlay} ~ #${CONFIG.ids.button},
         #${CONFIG.ids.overlay} ~ #${CONFIG.ids.dropdown} { display: none !important; }

         .lightbox-menubar {
            padding: 8px 12px;
            gap: 8px;
         }
         .lightbox-menubar .menubar-button {
            font-size: 0.9rem;
            padding: 4px 6px;
         }
         .lightbox-counter {
            font-size: 0.9rem;
            padding: 4px 8px;
         }
         .lightbox-content {
            padding: 10px;
         }
      }

      /* =================================================================
         MOBILE DARK MODE
         ================================================================= */
      @media (max-width: 600px) and (prefers-color-scheme: dark) {
         .summary-menubar {
            background: rgba(26, 26, 26, 0.98);
            border-top-color: #2a2a2a;
         }
         .menubar-button {
            background: transparent;
            border-color: #444;
            color: #999;
         }
         .menubar-button:hover {
            background: #2a2a2a;
            border-color: #555;
            color: #e8e8e8;
         }
         .retry-button, .save-button,
         #summarize-retry-button {
            background-color: #e8e8e8 !important;
            color: #1a1a1a !important;
         }
         .retry-button:hover, .save-button:hover:not(:disabled),
         #summarize-retry-button:hover {
            background-color: #f5f5f5 !important;
            color: #1a1a1a !important;
         }
      }
    `);
	}

	// --- Initialization ---
	initialize();
})();
