import { Plugin } from 'obsidian';

export default class KeePassBridgePlugin extends Plugin {
    async onload() {
        console.log('KeePass Bridge plugin loaded');
    }

    onunload() {
        console.log('KeePass Bridge plugin unloaded');
    }
}
