import * as kdbxweb from 'kdbxweb';
import argon2 from 'argon2-browser';
import { App, Notice } from 'obsidian';
import type { KeePassBridgeSettings } from './settings';
import { promptMasterPassword } from './auth-modal';

export interface KeePassEntryInfo {
    title: string;
    userName: string;
    url: string;
    getPassword: () => string;
}

// Initialize Argon2 for KDBX4 support
kdbxweb.CryptoEngine.setArgon2Impl(
    (password, salt, memory, iterations, length, parallelism, type, version) => {
        return argon2.hash({
            pass: new Uint8Array(password),
            salt: new Uint8Array(salt),
            time: iterations,
            mem: memory,
            hashLen: length,
            parallelism,
            type,
        }).then((result: { hash: Uint8Array }) => new Uint8Array(result.hash).buffer);
    }
);

const SESSION_DURATIONS: Record<string, number> = {
    'single': 0,
    '5min': 5 * 60 * 1000,
    '15min': 15 * 60 * 1000,
    'session': Infinity,
};

export class KdbxService {
    private db: kdbxweb.Kdbx | null = null;
    private sessionTimer: ReturnType<typeof setTimeout> | null = null;
    private app: App;
    private getSettings: () => KeePassBridgeSettings;

    constructor(app: App, getSettings: () => KeePassBridgeSettings) {
        this.app = app;
        this.getSettings = getSettings;
    }

    isUnlocked(): boolean {
        return this.db !== null;
    }

    async unlock(): Promise<boolean> {
        if (this.db) return true;

        const settings = this.getSettings();
        if (!settings.databasePath) {
            new Notice('KeePass Bridge: No database path configured');
            return false;
        }

        const password = await promptMasterPassword(this.app);
        if (!password) return false;

        try {
            const dbFile = this.app.vault.getFileByPath(settings.databasePath);
            if (!dbFile) {
                new Notice(`KeePass Bridge: Database file not found: ${settings.databasePath}`);
                return false;
            }
            const dbData = await this.app.vault.readBinary(dbFile);

            let keyFileData: ArrayBuffer | undefined;
            if (settings.keyFilePath) {
                const keyFile = this.app.vault.getFileByPath(settings.keyFilePath);
                if (!keyFile) {
                    new Notice(`KeePass Bridge: Key file not found: ${settings.keyFilePath}`);
                    return false;
                }
                keyFileData = await this.app.vault.readBinary(keyFile);
            }

            const credentials = new kdbxweb.Credentials(
                kdbxweb.ProtectedValue.fromString(password),
                keyFileData ?? null,
            );

            this.db = await kdbxweb.Kdbx.load(dbData, credentials);
            this.startSessionTimer();
            new Notice('KeePass Bridge: Database unlocked');
            return true;
        } catch (e) {
            const msg = e instanceof kdbxweb.KdbxError
                ? `KeePass Bridge: ${e.message}`
                : 'KeePass Bridge: Failed to unlock database (wrong password?)';
            new Notice(msg);
            return false;
        }
    }

    lock(): void {
        this.db = null;
        if (this.sessionTimer !== null) {
            clearTimeout(this.sessionTimer);
            this.sessionTimer = null;
        }
    }

    consumeSingleLookup(): void {
        if (this.getSettings().sessionDuration === 'single') {
            this.lock();
        }
    }

    findEntry(title: string): KeePassEntryInfo[] {
        if (!this.db) return [];

        const results: KeePassEntryInfo[] = [];
        const lowerTitle = title.toLowerCase();
        const root = this.db.getDefaultGroup();

        for (const entry of root.allEntries()) {
            const entryTitle = this.getField(entry, 'Title');
            if (entryTitle.toLowerCase().includes(lowerTitle)) {
                const passwordField = entry.fields.get('Password');
                results.push({
                    title: entryTitle,
                    userName: this.getField(entry, 'UserName'),
                    url: this.getField(entry, 'URL'),
                    getPassword: () => {
                        if (passwordField instanceof kdbxweb.ProtectedValue) {
                            return passwordField.getText();
                        }
                        return typeof passwordField === 'string' ? passwordField : '';
                    },
                });
            }
        }

        return results;
    }

    getAllEntries(): KeePassEntryInfo[] {
        if (!this.db) return [];

        const results: KeePassEntryInfo[] = [];
        const root = this.db.getDefaultGroup();

        for (const entry of root.allEntries()) {
            const title = this.getField(entry, 'Title');
            if (!title) continue;
            const passwordField = entry.fields.get('Password');
            results.push({
                title,
                userName: this.getField(entry, 'UserName'),
                url: this.getField(entry, 'URL'),
                getPassword: () => {
                    if (passwordField instanceof kdbxweb.ProtectedValue) {
                        return passwordField.getText();
                    }
                    return typeof passwordField === 'string' ? passwordField : '';
                },
            });
        }

        return results;
    }

    private getField(entry: kdbxweb.KdbxEntry, name: string): string {
        const value = entry.fields.get(name);
        if (value instanceof kdbxweb.ProtectedValue) {
            return value.getText();
        }
        return typeof value === 'string' ? value : '';
    }

    private startSessionTimer(): void {
        if (this.sessionTimer !== null) {
            clearTimeout(this.sessionTimer);
            this.sessionTimer = null;
        }

        const duration = SESSION_DURATIONS[this.getSettings().sessionDuration] ?? 0;
        if (duration === 0 || duration === Infinity) return;

        this.sessionTimer = setTimeout(() => {
            this.lock();
            new Notice('KeePass Bridge: Session expired, database locked');
        }, duration);
    }
}
