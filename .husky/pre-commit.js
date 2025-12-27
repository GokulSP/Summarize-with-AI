#!/usr/bin/env node

/**
 * Pre-commit Hook: Biome Format + Meta Sync
 * Runs automatically before each git commit via Husky
 */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const USER_JS = 'Summarize with AI.user.js';
const META_JS = 'Summarize with AI.meta.js';

// Utility: Get staged JS files
function getStagedJsFiles() {
	try {
		const output = execSync('git diff --cached --name-only --diff-filter=ACM', {
			encoding: 'utf-8',
		});
		return output
			.split('\n')
			.filter(file => file.trim().endsWith('.js'))
			.filter(Boolean);
	} catch {
		return [];
	}
}

// Utility: Check if specific file is staged
function isFileStaged(filename) {
	try {
		const output = execSync('git diff --cached --name-only', { encoding: 'utf-8' });
		return output.split('\n').includes(filename);
	} catch {
		return false;
	}
}

// Step 1: Run Biome format and lint
function runBiome() {
	console.log('Running Biome format and lint...');

	const stagedFiles = getStagedJsFiles();
	if (stagedFiles.length === 0) {
		console.log('  No JS files to check');
		return;
	}

	try {
		for (const file of stagedFiles) {
			if (existsSync(file)) {
				// Run Biome on each file
				execSync(`pnpm exec biome check --write "${file}"`, {
					stdio: 'pipe',
					encoding: 'utf-8',
				});
				// Re-stage the formatted file
				execSync(`git add "${file}"`, { stdio: 'pipe' });
			}
		}
		console.log('✓ Biome formatting and linting complete');
	} catch (_error) {
		console.error('⚠ Warning: Biome check failed');
		process.exit(1);
	}
}

// Step 2: Format userscript metadata (align tags)
function formatUserscriptMetadata() {
	if (!isFileStaged(USER_JS)) {
		return; // Skip if user.js not being committed
	}

	console.log('Formatting userscript metadata...');

	try {
		// Read user.js
		const content = readFileSync(USER_JS, 'utf-8');

		// Extract metadata block
		const metaStart = content.indexOf('// ==UserScript==');
		const metaEnd = content.indexOf('// ==/UserScript==');

		if (metaStart === -1 || metaEnd === -1) {
			throw new Error('Could not find userscript metadata block');
		}

		const beforeMeta = content.substring(0, metaStart);
		const afterMeta = content.substring(metaEnd + '// ==/UserScript=='.length);
		const metadata = content.substring(metaStart, metaEnd + '// ==/UserScript=='.length);

		// Parse metadata lines
		const lines = metadata.split('\n');
		const metaLines = [];

		for (const line of lines) {
			const trimmed = line.trim();
			if (trimmed === '// ==UserScript==' || trimmed === '// ==/UserScript==') {
				metaLines.push({ type: 'boundary', line: trimmed });
			} else if (trimmed.startsWith('// @')) {
				// Parse tag line: // @tag value
				const match = trimmed.match(/^\/\/\s*(@\S+)\s+(.*)$/);
				if (match) {
					metaLines.push({ type: 'tag', tag: match[1], value: match[2] });
				} else {
					metaLines.push({ type: 'other', line: trimmed });
				}
			} else if (trimmed.startsWith('//')) {
				metaLines.push({ type: 'comment', line: trimmed });
			} else if (trimmed === '') {
				metaLines.push({ type: 'empty', line: '' });
			}
		}

		// Find longest tag for alignment
		const tagLines = metaLines.filter(l => l.type === 'tag');
		const maxTagLength = Math.max(...tagLines.map(l => l.tag.length));

		// Reconstruct metadata with aligned tags
		const formattedLines = metaLines.map(item => {
			if (item.type === 'tag') {
				const padding = ' '.repeat(maxTagLength - item.tag.length);
				return `// ${item.tag}${padding} ${item.value}`;
			}
			return item.line;
		});

		const formattedMetadata = formattedLines.join('\n');

		// Only update if changed
		if (formattedMetadata !== metadata) {
			const newContent = beforeMeta + formattedMetadata + afterMeta;
			writeFileSync(USER_JS, newContent, 'utf-8');
			execSync(`git add "${USER_JS}"`, { stdio: 'pipe' });
			console.log('✓ Userscript metadata formatted and aligned');
		} else {
			console.log('  Metadata already aligned');
		}
	} catch (error) {
		console.error(`Error formatting metadata: ${error.message}`);
		process.exit(1);
	}
}

// Step 3: Sync metadata from user.js to meta.js
function syncMetadata() {
	if (!isFileStaged(USER_JS)) {
		return; // Skip if user.js not being committed
	}

	console.log(`Syncing metadata to ${META_JS}...`);

	try {
		// Read user.js (potentially just formatted)
		const content = readFileSync(USER_JS, 'utf-8');

		// Extract metadata block
		const metaStart = content.indexOf('// ==UserScript==');
		const metaEnd = content.indexOf('// ==/UserScript==');

		if (metaStart === -1 || metaEnd === -1) {
			throw new Error('Could not find userscript metadata block');
		}

		const metadata = content.substring(metaStart, metaEnd + '// ==/UserScript=='.length);

		// Write to meta.js
		writeFileSync(META_JS, `${metadata}\n`, 'utf-8');

		// Extract and display version
		const versionMatch = metadata.match(/@version\s+(.+)/);
		const version = versionMatch ? versionMatch[1] : 'unknown';

		console.log(`✓ Metadata synced to ${META_JS}`);
		console.log(`  Version: ${version}`);

		// Stage the updated meta.js
		execSync(`git add "${META_JS}"`, { stdio: 'pipe' });
	} catch (error) {
		console.error(`Error: ${error.message}`);
		process.exit(1);
	}
}

// Main execution
try {
	runBiome();
	formatUserscriptMetadata();
	syncMetadata();
	console.log('✓ Pre-commit checks passed!');
	process.exit(0);
} catch (error) {
	console.error('Pre-commit hook failed:', error.message);
	process.exit(1);
}
