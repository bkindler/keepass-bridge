import { MarkdownPostProcessorContext } from 'obsidian';
import type KeePassBridgePlugin from './main';

const KEEPASS_PATTERN = /^keepass::(.+)$/;

export function registerInlineProcessor(plugin: KeePassBridgePlugin): void {
    plugin.registerMarkdownPostProcessor((el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
        const codeElements = el.querySelectorAll('code');

        codeElements.forEach((codeEl) => {
            const text = codeEl.textContent?.trim() ?? '';
            const match = text.match(KEEPASS_PATTERN);
            if (!match) return;

            const entryName = match[1]!;

            const badge = document.createElement('span');
            badge.addClass('keepass-badge');
            badge.setAttribute('data-entry', entryName);

            badge.createSpan({ cls: 'keepass-badge-icon', text: '\uD83D\uDD11' });
            badge.createSpan({ cls: 'keepass-badge-text', text: entryName });

            badge.addEventListener('click', async () => {
                await plugin.lookupEntry(entryName);
            });

            codeEl.replaceWith(badge);
        });
    });
}
