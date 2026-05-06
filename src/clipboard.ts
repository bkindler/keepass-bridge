import { Notice } from 'obsidian';

let clearTimer: ReturnType<typeof setTimeout> | null = null;

export function clearPendingClipboard(): void {
    if (clearTimer !== null) {
        clearTimeout(clearTimer);
        clearTimer = null;
    }
}

export async function copyToClipboard(value: string, label: string, timeoutSeconds: number): Promise<void> {
    const { Platform } = require('obsidian');
    if (Platform.isDesktopApp && label.toLowerCase() === 'password') {
        try {
            const { clipboard } = require('electron');
            clipboard.writeText(value);
            // Empêche la plupart des gestionnaires de presse-papiers sous macOS de sauvegarder la donnée
            clipboard.writeBuffer('org.nspasteboard.TransientType', Buffer.from(''));
            // Empêche l'historique Windows et autres gestionnaires de conserver la donnée
            clipboard.writeBuffer('ExcludeClipboardContentFromMonitorProcessing', Buffer.from(''));
            // Pour Linux (KDE)
            clipboard.writeBuffer('x-kde-passwordManagerHint', Buffer.from('secret'));
        } catch (e) {
            await navigator.clipboard.writeText(value);
        }
    } else {
        await navigator.clipboard.writeText(value);
    }
    
    new Notice(`${label} copied to clipboard`);

    clearPendingClipboard();

    if (timeoutSeconds > 0) {
        clearTimer = setTimeout(() => {
            void (async () => {
                try {
                    const current = await navigator.clipboard.readText();
                    if (current === value) {
                        await navigator.clipboard.writeText('');
                    }
                } catch {
                    await navigator.clipboard.writeText('');
                }
                clearTimer = null;
            })();
        }, timeoutSeconds * 1000);
    }
}
