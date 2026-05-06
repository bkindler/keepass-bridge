import { ItemView, WorkspaceLeaf, setIcon } from 'obsidian';
import type KeePassBridgePlugin from './main';
import { copyToClipboard } from './clipboard';
import { AddEntryModal } from './add-entry-modal';

export const VAULT_VIEW_TYPE = 'keepass-vault-view';

export class VaultView extends ItemView {
    plugin: KeePassBridgePlugin;

    constructor(leaf: WorkspaceLeaf, plugin: KeePassBridgePlugin) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType(): string {
        return VAULT_VIEW_TYPE;
    }

    getDisplayText(): string {
        return 'Vault';
    }

    getIcon(): string {
        return 'lock';
    }

    async onOpen() {
        this.render();
    }

    async onClose() {
        // Cleanup if needed
    }

    render() {
        const container = this.containerEl.children[1] as HTMLElement;
        container.empty();

        container.addClass('keepass-vault-container');

        const headerContainer = container.createDiv({ cls: 'keepass-vault-header' });
        headerContainer.createEl('h2', { text: '🔐 KeePass Vault' });

        const actionsContainer = headerContainer.createDiv({ cls: 'keepass-vault-header-actions' });
        
        const addBtn = actionsContainer.createEl('button', { cls: 'keepass-vault-icon-btn', title: 'Add Entry' });
        setIcon(addBtn, 'plus');
        addBtn.onclick = () => {
            if (this.plugin.kdbxService.isUnlocked()) {
                new AddEntryModal(this.app, this.plugin.kdbxService, () => this.render()).open();
            }
        };

        const refreshBtn = actionsContainer.createEl('button', { cls: 'keepass-vault-icon-btn', title: 'Refresh' });
        setIcon(refreshBtn, 'refresh-cw');
        refreshBtn.onclick = () => this.render();

        if (!this.plugin.kdbxService.isUnlocked()) {
            const unlockContainer = container.createDiv({ cls: 'keepass-vault-unlock-container' });
            unlockContainer.createEl('p', { text: 'Database is locked.' });
            const unlockBtn = unlockContainer.createEl('button', { text: 'Unlock Database', cls: 'mod-cta' });
            unlockBtn.onclick = async () => {
                const unlocked = await this.plugin.kdbxService.unlock();
                if (unlocked) {
                    this.render();
                }
            };
            return;
        }

        const lockBtn = actionsContainer.createEl('button', { cls: 'keepass-vault-icon-btn', title: 'Lock Database' });
        setIcon(lockBtn, 'lock');
        lockBtn.onclick = () => {
             this.plugin.kdbxService.lock();
             this.render();
        };

        const entries = this.plugin.kdbxService.getAllEntries();

        const tableContainer = container.createDiv({ cls: 'keepass-vault-table-container' });
        const table = tableContainer.createEl('table', { cls: 'keepass-vault-table' });
        
        const thead = table.createEl('thead');
        const trHead = thead.createEl('tr');
        trHead.createEl('th', { text: 'Title' });
        trHead.createEl('th', { text: 'Username' });
        trHead.createEl('th', { text: 'Actions' });

        const tbody = table.createEl('tbody');
        
        for (const entry of entries) {
            const tr = tbody.createEl('tr');
            tr.createEl('td', { text: entry.title, cls: 'keepass-vault-td-title' });
            tr.createEl('td', { text: entry.userName, cls: 'keepass-vault-td-username' });
            
            const tdActions = tr.createEl('td', { cls: 'keepass-vault-td-actions' });
            
            const copyUsersBtn = tdActions.createEl('button', { cls: 'keepass-vault-action-btn', title: 'Copy Username' });
            setIcon(copyUsersBtn, 'user');
            copyUsersBtn.onclick = async () => {
                if (entry.userName) {
                    await copyToClipboard(entry.userName, 'Username', this.plugin.settings.clipboardTimeout);
                }
            };

            const copyPwdBtn = tdActions.createEl('button', { cls: 'keepass-vault-action-btn', title: 'Copy Password' });
            setIcon(copyPwdBtn, 'key');
            copyPwdBtn.onclick = async () => {
                const pwd = entry.getPassword();
                if (pwd) {
                    await copyToClipboard(pwd, 'Password', this.plugin.settings.clipboardTimeout);
                }
            };
        }
    }
}