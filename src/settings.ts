import { App, PluginSettingTab, Setting } from 'obsidian';
import type KeePassBridgePlugin from './main';

export interface KeePassBridgeSettings {
    databasePath: string;
    keyFilePath: string;
    sessionDuration: 'single' | '5min' | '15min' | 'session';
    clipboardTimeout: number;
}

export const DEFAULT_SETTINGS: KeePassBridgeSettings = {
    databasePath: '',
    keyFilePath: '',
    sessionDuration: '5min',
    clipboardTimeout: 60,
};

export class KeePassBridgeSettingTab extends PluginSettingTab {
    plugin: KeePassBridgePlugin;

    constructor(app: App, plugin: KeePassBridgePlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        new Setting(containerEl)
            .setName('Database path')
            .setDesc('Path to .kdbx file, relative to vault root')
            .addText(text => text
                .setPlaceholder('path/to/database.kdbx')
                .setValue(this.plugin.settings.databasePath)
                .onChange(async (value) => {
                    this.plugin.settings.databasePath = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Key file path')
            .setDesc('Optional path to .keyx/.key file, relative to vault root')
            .addText(text => text
                .setPlaceholder('path/to/keyfile.keyx')
                .setValue(this.plugin.settings.keyFilePath)
                .onChange(async (value) => {
                    this.plugin.settings.keyFilePath = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Session duration')
            .setDesc('How long to keep the database unlocked after entering the master password')
            .addDropdown(dropdown => dropdown
                .addOptions({
                    'single': 'Single lookup',
                    '5min': '5 minutes',
                    '15min': '15 minutes',
                    'session': 'Until Obsidian closes',
                })
                .setValue(this.plugin.settings.sessionDuration)
                .onChange(async (value) => {
                    this.plugin.settings.sessionDuration = value as KeePassBridgeSettings['sessionDuration'];
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Clipboard timeout')
            .setDesc('Seconds before clipboard is cleared after copying a credential')
            .addText(text => {
                text.inputEl.type = 'number';
                text.inputEl.min = '0';
                text.inputEl.max = '300';
                text.setValue(String(this.plugin.settings.clipboardTimeout))
                    .onChange(async (value) => {
                        const num = parseInt(value, 10);
                        if (!isNaN(num) && num >= 0) {
                            this.plugin.settings.clipboardTimeout = num;
                            await this.plugin.saveSettings();
                        }
                    });
            });
    }
}
