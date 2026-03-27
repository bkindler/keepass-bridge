import { App, Modal, Setting } from 'obsidian';

export class AuthModal extends Modal {
    private password = '';
    private readonly onSubmit: (password: string) => void;
    private readonly onCancel: () => void;

    constructor(app: App, onSubmit: (password: string) => void, onCancel: () => void) {
        super(app);
        this.onSubmit = onSubmit;
        this.onCancel = onCancel;
    }

    onOpen(): void {
        const { contentEl } = this;
        this.setTitle('KeePass: Master Password');

        new Setting(contentEl)
            .setName('Password')
            .addText(text => {
                text.inputEl.type = 'password';
                text.setPlaceholder('Enter master password')
                    .onChange(value => { this.password = value; });
                setTimeout(() => text.inputEl.focus(), 50);
            });

        new Setting(contentEl)
            .addButton(btn => btn
                .setButtonText('Unlock')
                .setCta()
                .onClick(() => this.submit()));

        this.scope.register([], 'Enter', (evt) => {
            evt.preventDefault();
            this.submit();
        });
    }

    onClose(): void {
        this.contentEl.empty();
    }

    private submit(): void {
        const pw = this.password;
        this.password = '';
        this.close();
        if (pw) {
            this.onSubmit(pw);
        } else {
            this.onCancel();
        }
    }
}

export function promptMasterPassword(app: App): Promise<string | null> {
    return new Promise((resolve) => {
        new AuthModal(
            app,
            (password) => resolve(password),
            () => resolve(null),
        ).open();
    });
}
