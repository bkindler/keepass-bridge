import { App, Modal, Setting, Notice } from 'obsidian';
import type { KdbxService } from './kdbx-service';

export class AddEntryModal extends Modal {
    private kdbxService: KdbxService;
    private onAdded: () => void;
    
    private title = '';
    private userName = '';
    private password = '';
    private passwordInputEl: HTMLInputElement | null = null;

    constructor(app: App, kdbxService: KdbxService, onAdded: () => void) {
        super(app);
        this.kdbxService = kdbxService;
        this.onAdded = onAdded;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        
        contentEl.createEl('h2', { text: 'Add New Entry' });

        new Setting(contentEl)
            .setName('Title')
            .addText(text => text
                .setValue(this.title)
                .onChange(value => this.title = value));

        new Setting(contentEl)
            .setName('Username')
            .addText(text => text
                .setValue(this.userName)
                .onChange(value => this.userName = value));

        new Setting(contentEl)
            .setName('Password')
            .addText(text => {
                text.inputEl.type = 'password';
                this.passwordInputEl = text.inputEl;
                text.setValue(this.password)
                    .onChange(value => this.password = value);
            })
            .addButton(btn => btn
                .setIcon('eye')
                .setTooltip('Toggle password visibility')
                .onClick(() => {
                    if (this.passwordInputEl) {
                        const isPassword = this.passwordInputEl.type === 'password';
                        this.passwordInputEl.type = isPassword ? 'text' : 'password';
                        btn.setIcon(isPassword ? 'eye-off' : 'eye');
                    }
                }));

        new Setting(contentEl)
            .addButton(btn => btn
                .setButtonText('Cancel')
                .onClick(() => this.close()))
            .addButton(btn => btn
                .setButtonText('Save')
                .setCta()
                .onClick(async () => {
                    if (!this.title) {
                        new Notice('Title is required');
                        return;
                    }
                    
                    btn.setButtonText('Saving...');
                    btn.buttonEl.disabled = true;
                    
                    const success = await this.kdbxService.addEntry(this.title, this.userName, this.password);
                    if (success) {
                        new Notice('Entry added successfully');
                        this.onAdded();
                        this.close();
                    } else {
                        new Notice('Failed to add entry');
                        btn.setButtonText('Save');
                        btn.buttonEl.disabled = false;
                    }
                }));
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}