# KeePass Bridge

Read KeePass (.kdbx) databases directly from Obsidian. Look up credentials from your notes without leaving the app.

## Features

- **Inline references** -- Write `` `keepass::EntryName` `` in any note. In reading mode, it becomes a clickable badge that opens the credential popup.
- **Credential tables** -- Use ` ```keepass ` code blocks to list multiple entries with quick-copy buttons for username and password.
- **Search command** -- Use `Cmd/Ctrl+P` > "KeePass Bridge: Search entry" to fuzzy-search all entries in your database.
- **Credential popup** -- Shows username, password (hidden by default, toggle with eye icon), and URL with copy buttons.
- **Auto-clear clipboard** -- Copied credentials are automatically cleared from the clipboard after a configurable timeout (default: 60 seconds).
- **Session management** -- Configure how long the database stays unlocked: single lookup, 5 minutes, 15 minutes, or until Obsidian closes.
- **Key file support** -- Supports master password only, or master password + key file (.keyx/.key).
- **Cross-platform** -- Works on desktop (macOS, Windows, Linux) and mobile (iOS, Android).

## Usage

### Inline reference

Write in any note:

```
`keepass::GitHub`
```

In reading mode, this renders as a clickable badge. Click it to enter your master password (if not already unlocked) and see the credential details.

### Credential table

````markdown
```keepass
GitHub
AWS Production
Netlify
```
````

In reading mode, this renders as a table with copy buttons for each entry's username and password.

### Search

Open the command palette (`Cmd/Ctrl+P`) and select **KeePass Bridge: Search entry** to fuzzy-search across all entries by title, username, or URL.

### Lock

Use **KeePass Bridge: Lock database** from the command palette to manually lock the database.

## Setup

1. Place your `.kdbx` database file inside your Obsidian vault
2. Go to **Settings > KeePass Bridge**
3. Enter the path to your `.kdbx` file (relative to vault root, e.g. `KeyPassium/Passwords.kdbx`)
4. Optionally set a key file path
5. Choose your preferred session duration and clipboard timeout

## Settings

| Setting | Description | Default |
|---------|-------------|---------|
| Database path | Path to `.kdbx` file relative to vault root | (empty) |
| Key file path | Optional path to `.keyx`/`.key` file relative to vault root | (empty) |
| Session duration | How long the database stays unlocked | 5 minutes |
| Clipboard timeout | Seconds before clipboard is cleared after copying | 60 |

## Security

- **Read-only** -- This plugin never writes to your `.kdbx` file. Your KeePass editor (KeePassium, KeePassXC, etc.) remains the sole editor.
- **No network access** -- This plugin makes no network requests. All processing happens locally.
- **No disk persistence** -- Master password, decrypted database, and credential values are never written to disk.
- **Protected values** -- Passwords are stored XOR-encrypted in memory by the underlying library and only decrypted momentarily when copied.
- **Auto-clear** -- Clipboard is automatically cleared after the configured timeout.

## Compatibility

This plugin uses the [kdbxweb](https://github.com/keeweb/kdbxweb) library (MIT) to read KeePass databases. It supports:

- KDBX 4 (default format in modern KeePass apps)
- KDBX 3
- AES-KDF and Argon2 key derivation

The same `.kdbx` file can be shared between this plugin and any KeePass-compatible app (KeePassium, KeePassXC, KeePass, KeeWeb, etc.).

## Attribution

- [kdbxweb](https://github.com/keeweb/kdbxweb) -- KeePass database library (MIT License)
- [hash-wasm](https://github.com/nicolo-ribaudo/nicolo-nicolo-nicolo) -- Argon2 hashing (MIT License)
- Icons by [Lucide](https://lucide.dev/) (ISC License), bundled with Obsidian

## Author

[Bjoern Kindler](https://www.kindler-dev.de)

## License

[MIT](LICENSE)
