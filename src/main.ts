import { Notice, Plugin } from 'obsidian';
import { KeePassBridgeSettings, KeePassBridgeSettingTab, DEFAULT_SETTINGS } from './settings';
import { KdbxService, KeePassEntryInfo } from './kdbx-service';
import { showCredentialPopup } from './credential-popup';
import { SearchModal } from './search-modal';
import { registerInlineProcessor } from './inline-processor';
import { registerBlockProcessor } from './block-processor';
import { clearPendingClipboard } from './clipboard';

export default class KeePassBridgePlugin extends Plugin {
    settings: KeePassBridgeSettings = DEFAULT_SETTINGS;
    kdbxService!: KdbxService;

    async onload() {
        await this.loadSettings();
        this.kdbxService = new KdbxService(this.app, () => this.settings);

        this.addSettingTab(new KeePassBridgeSettingTab(this.app, this));

        this.addCommand({
            id: 'search-entry',
            name: 'Search entry',
            callback: () => this.searchEntry(),
        });

        this.addCommand({
            id: 'lock-database',
            name: 'Lock database',
            callback: () => {
                this.kdbxService.lock();
                new Notice('KeePass Bridge: Database locked');
            },
        });

        registerInlineProcessor(this);
        registerBlockProcessor(this);
    }

    onunload() {
        this.kdbxService.lock();
        clearPendingClipboard();
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<KeePassBridgeSettings>);
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    async lookupEntry(entryName: string): Promise<void> {
        showCredentialPopup(this.app, this.kdbxService, entryName, this.settings.clipboardTimeout);
    }

    async resolveEntry(entryName: string): Promise<KeePassEntryInfo | null> {
        if (!this.kdbxService.isUnlocked()) {
            const unlocked = await this.kdbxService.unlock();
            if (!unlocked) return null;
        }

        const matches = this.kdbxService.findEntry(entryName);

        if (matches.length === 0) {
            new Notice(`KeePass Bridge: Entry "${entryName}" not found`);
            return null;
        }

        if (matches.length === 1) {
            return matches[0]!;
        }

        return new Promise<KeePassEntryInfo | null>((resolve) => {
            new SearchModal(this.app, matches, (entry) => resolve(entry)).open();
        });
    }

    private async searchEntry(): Promise<void> {
        if (!this.kdbxService.isUnlocked()) {
            const unlocked = await this.kdbxService.unlock();
            if (!unlocked) return;
        }

        const allEntries = this.kdbxService.getAllEntries();

        new SearchModal(this.app, allEntries, (entry) => {
            showCredentialPopup(this.app, this.kdbxService, entry.title, this.settings.clipboardTimeout);
        }).open();
    }
}
