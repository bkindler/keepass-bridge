import { Notice } from 'obsidian';

let clearTimer: ReturnType<typeof setTimeout> | null = null;

export function clearPendingClipboard(): void {
    if (clearTimer !== null) {
        clearTimeout(clearTimer);
        clearTimer = null;
    }
}

export async function copyToClipboard(value: string, label: string, timeoutSeconds: number): Promise<void> {
    await navigator.clipboard.writeText(value);
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
