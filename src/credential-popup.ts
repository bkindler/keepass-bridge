import { App, Modal, Setting } from 'obsidian';
import type { KeePassEntryInfo } from './kdbx-service';
import { copyToClipboard } from './clipboard';

export class CredentialPopup extends Modal {
    private entry: KeePassEntryInfo;
    private clipboardTimeout: number;

    constructor(app: App, entry: KeePassEntryInfo, clipboardTimeout: number) {
        super(app);
        this.entry = entry;
        this.clipboardTimeout = clipboardTimeout;
    }

    onOpen(): void {
        const { contentEl } = this;
        this.setTitle(this.entry.title);

        if (this.entry.userName) {
            new Setting(contentEl)
                .setName('Username')
                .setDesc(this.entry.userName)
                .addButton(btn => btn
                    .setButtonText('Copy')
                    .onClick(async () => {
                        await copyToClipboard(this.entry.userName, 'Username', this.clipboardTimeout);
                    }));
        }

        new Setting(contentEl)
            .setName('Password')
            .setDesc('\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022')
            .addButton(btn => btn
                .setButtonText('Copy')
                .setCta()
                .onClick(async () => {
                    await copyToClipboard(this.entry.getPassword(), 'Password', this.clipboardTimeout);
                }));

        if (this.entry.url) {
            new Setting(contentEl)
                .setName('URL')
                .setDesc(this.entry.url)
                .addButton(btn => btn
                    .setButtonText('Copy')
                    .onClick(async () => {
                        await copyToClipboard(this.entry.url, 'URL', this.clipboardTimeout);
                    }));
        }
    }

    onClose(): void {
        this.contentEl.empty();
    }
}

export function showCredentialPopup(app: App, entry: KeePassEntryInfo, clipboardTimeout: number): void {
    new CredentialPopup(app, entry, clipboardTimeout).open();
}
