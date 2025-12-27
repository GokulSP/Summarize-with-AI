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
