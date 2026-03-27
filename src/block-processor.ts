import { MarkdownPostProcessorContext } from 'obsidian';
import type KeePassBridgePlugin from './main';
import { copyToClipboard } from './clipboard';

export function registerBlockProcessor(plugin: KeePassBridgePlugin): void {
    plugin.registerMarkdownCodeBlockProcessor('keepass', async (source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
        const entryNames = source.trim().split('\n').map(line => line.trim()).filter(line => line.length > 0);

        const container = el.createDiv({ cls: 'keepass-block-table' });

        for (const entryName of entryNames) {
            const row = container.createDiv({ cls: 'keepass-block-row' });
            row.dataset.entry = entryName;
            const nameSpan = row.createSpan({ cls: 'keepass-block-entry-name', text: entryName });

            const actions = row.createDiv({ cls: 'keepass-block-actions' });

            const userBtn = actions.createEl('button', { cls: 'keepass-block-btn', text: '\uD83D\uDC64 User' });
            userBtn.addEventListener('click', async () => {
                const entry = await plugin.resolveEntry(entryName);
                if (entry) {
                    nameSpan.removeClass('keepass-block-not-found');
                    await copyToClipboard(entry.userName, 'Username', plugin.settings.clipboardTimeout);
                    plugin.kdbxService.consumeSingleLookup();
                } else {
                    nameSpan.addClass('keepass-block-not-found');
                }
            });

            const passBtn = actions.createEl('button', { cls: 'keepass-block-btn', text: '\uD83D\uDD11 Pass' });
            passBtn.addEventListener('click', async () => {
                const entry = await plugin.resolveEntry(entryName);
                if (entry) {
                    nameSpan.removeClass('keepass-block-not-found');
                    await copyToClipboard(entry.getPassword(), 'Password', plugin.settings.clipboardTimeout);
                    plugin.kdbxService.consumeSingleLookup();
                } else {
                    nameSpan.addClass('keepass-block-not-found');
                }
            });
        }
    });
}
