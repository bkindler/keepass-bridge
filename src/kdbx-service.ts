import * as kdbxweb from 'kdbxweb';
import { argon2id, argon2d, argon2i } from 'hash-wasm';
import { App, Notice, normalizePath } from 'obsidian';
import type { KeePassBridgeSettings } from './settings';
import { promptMasterPassword } from './auth-modal';

export interface KeePassEntryInfo {
    title: string;
    userName: string;
    url: string;
    getPassword: () => string;
}

// Initialize Argon2 for KDBX4 support using hash-wasm
kdbxweb.CryptoEngine.setArgon2Impl(
    async (password, salt, memory, iterations, length, parallelism, type, version) => {
        const t = type as number;
        const hashFn = t === 2 ? argon2id : t === 1 ? argon2i : argon2d;
        const hash = await hashFn({
            password: new Uint8Array(password),
            salt: new Uint8Array(salt),
            iterations,
            memorySize: memory,
            hashLength: length,
            parallelism,
            outputType: 'binary',
        });
        return new Uint8Array(hash).buffer;
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

        const password = await promptMasterPassword(this.app);
        if (!password) return false;

        const error = await this.unlockWithPassword(password);
        if (error) {
            new Notice(`KeePass Bridge: ${error}`, 10000);
            return false;
        }
        return true;
    }

    async unlockWithPassword(password: string): Promise<string | null> {
        if (this.db) return null;

        const settings = this.getSettings();
        if (!settings.databasePath) {
            return 'No database path configured';
        }

        try {
            const dbFile = this.app.vault.getFileByPath(normalizePath(settings.databasePath));
            if (!dbFile) {
                return `Database file not found: ${settings.databasePath}`;
            }
            const dbData = await this.app.vault.readBinary(dbFile);

            let keyFileData: ArrayBuffer | undefined;
            if (settings.keyFilePath) {
                const keyFile = this.app.vault.getFileByPath(normalizePath(settings.keyFilePath));
                if (!keyFile) {
                    return `Key file not found: ${settings.keyFilePath}`;
                }
                keyFileData = await this.app.vault.readBinary(keyFile);
            }

            const credentials = new kdbxweb.Credentials(
                kdbxweb.ProtectedValue.fromString(password),
                keyFileData ?? null,
            );

            this.db = await kdbxweb.Kdbx.load(dbData, credentials);
            this.startSessionTimer();
            return null;
        } catch (e) {
            return e instanceof Error ? e.message : 'Failed to unlock database';
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
            new Notice('KeePass Bridge: session expired, database locked');
        }, duration);
    }
}
