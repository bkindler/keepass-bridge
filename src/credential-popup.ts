import { App, Modal, Setting, setIcon } from 'obsidian';
import type { KeePassEntryInfo } from './kdbx-service';
import type { KdbxService } from './kdbx-service';
import { copyToClipboard } from './clipboard';

export class CredentialPopup extends Modal {
    private kdbxService: KdbxService;
    private entryName: string;
    private clipboardTimeout: number;
    private passwordVisible = false;

    constructor(app: App, kdbxService: KdbxService, entryName: string, clipboardTimeout: number) {
        super(app);
        this.kdbxService = kdbxService;
        this.entryName = entryName;
        this.clipboardTimeout = clipboardTimeout;
    }

    onOpen(): void {
        if (this.kdbxService.isUnlocked()) {
            this.showCredentials();
        } else {
            this.showPasswordForm();
        }
    }

    onClose(): void {
        this.contentEl.empty();
        this.passwordVisible = false;
    }

    private showPasswordForm(errorMsg?: string): void {
        const { contentEl } = this;
        contentEl.empty();
        this.setTitle('KeePass: Master password');

        if (errorMsg) {
            contentEl.createDiv({ cls: 'keepass-error-banner', text: errorMsg });
        }

        let password = '';

        new Setting(contentEl)
            .setName('Password')
            .addText(text => {
                text.inputEl.type = 'password';
                text.setPlaceholder('Enter master password')
                    .onChange(value => { password = value; });
                setTimeout(() => text.inputEl.focus(), 50);
            });

        new Setting(contentEl)
            .addButton(btn => btn
                .setButtonText('Unlock')
                .setCta()
                .onClick(() => this.tryUnlock(password)));

        this.scope.register([], 'Enter', (evt) => {
            evt.preventDefault();
            void this.tryUnlock(password);
        });
    }

    private async tryUnlock(password: string): Promise<void> {
        if (!password) return;

        const { contentEl } = this;
        contentEl.empty();
        this.setTitle('KeePass: Unlocking\u2026');
        contentEl.createDiv({ text: 'Decrypting database...', cls: 'keepass-loading' });

        const error = await this.kdbxService.unlockWithPassword(password);
        if (error) {
            this.showPasswordForm(error);
        } else {
            this.showCredentials();
        }
    }

    private showCredentials(): void {
        const matches = this.kdbxService.findEntry(this.entryName);

        if (matches.length === 0) {
            this.showError(`Entry "${this.entryName}" not found`);
            return;
        }

        if (matches.length === 1) {
            this.renderEntry(matches[0]!);
        } else {
            this.showEntrySelection(matches);
        }
    }

    private showError(msg: string): void {
        const { contentEl } = this;
        contentEl.empty();
        this.setTitle('KeePass bridge');
        contentEl.createDiv({ text: msg, cls: 'keepass-error' });
    }

    private showEntrySelection(entries: KeePassEntryInfo[]): void {
        const { contentEl } = this;
        contentEl.empty();
        this.setTitle('Multiple matches');

        for (const entry of entries) {
            new Setting(contentEl)
                .setName(entry.title)
                .setDesc(entry.userName || '')
                .addButton(btn => btn
                    .setButtonText('Select')
                    .onClick(() => this.renderEntry(entry)));
        }
    }

    private renderEntry(entry: KeePassEntryInfo): void {
        const { contentEl } = this;
        contentEl.empty();
        this.setTitle(entry.title);

        if (entry.userName) {
            new Setting(contentEl)
                .setName('Username')
                .setDesc(entry.userName)
                .addExtraButton(btn => btn
                    .setIcon('copy')
                    .setTooltip('Copy username')
                    .onClick(async () => {
                        await copyToClipboard(entry.userName, 'Username', this.clipboardTimeout);
                    }));
        }

        const passwordSetting = new Setting(contentEl)
            .setName('Password')
            .setDesc('\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022')
            .addExtraButton(btn => {
                btn.setIcon('eye')
                    .setTooltip('Show/hide password')
                    .onClick(() => {
                        this.passwordVisible = !this.passwordVisible;
                        const descEl = passwordSetting.descEl;
                        if (this.passwordVisible) {
                            descEl.setText(entry.getPassword());
                            setIcon(btn.extraSettingsEl, 'eye-off');
                        } else {
                            descEl.setText('\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022');
                            setIcon(btn.extraSettingsEl, 'eye');
                        }
                    });
            })
            .addExtraButton(btn => btn
                .setIcon('copy')
                .setTooltip('Copy password')
                .onClick(async () => {
                    await copyToClipboard(entry.getPassword(), 'Password', this.clipboardTimeout);
                }));

        if (entry.url) {
            new Setting(contentEl)
                .setName('URL')
                .setDesc(entry.url)
                .addExtraButton(btn => btn
                    .setIcon('copy')
                    .setTooltip('Copy URL')
                    .onClick(async () => {
                        await copyToClipboard(entry.url, 'URL', this.clipboardTimeout);
                    }));
        }

        this.kdbxService.consumeSingleLookup();
    }
}

export function showCredentialPopup(app: App, kdbxService: KdbxService, entryName: string, clipboardTimeout: number): void {
    new CredentialPopup(app, kdbxService, entryName, clipboardTimeout).open();
}
