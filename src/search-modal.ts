import { App, FuzzySuggestModal } from 'obsidian';
import type { KeePassEntryInfo } from './kdbx-service';

export class SearchModal extends FuzzySuggestModal<KeePassEntryInfo> {
    private entries: KeePassEntryInfo[];
    private onChoose: (entry: KeePassEntryInfo) => void;

    constructor(app: App, entries: KeePassEntryInfo[], onChoose: (entry: KeePassEntryInfo) => void) {
        super(app);
        this.entries = entries;
        this.onChoose = onChoose;
        this.setPlaceholder('Search entries\u2026');
    }

    getItems(): KeePassEntryInfo[] {
        return this.entries;
    }

    getItemText(item: KeePassEntryInfo): string {
        const parts = [item.title];
        if (item.userName) parts.push(item.userName);
        if (item.url) parts.push(item.url);
        return parts.join(' ');
    }

    onChooseItem(item: KeePassEntryInfo): void {
        this.onChoose(item);
    }
}
