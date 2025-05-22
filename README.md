# extension-chrome-gpt-et-conversations

This repository contains a minimal Chrome extension example for handling GPT conversations. The manifest defines a background service worker (`background.js`) and registers a command that can be triggered with `Ctrl+Shift+Y` by default.

## Building

1. Load the extension folder into Chrome via `chrome://extensions` (enable Developer mode, click "Load unpacked").
2. Ensure the extension's service worker loads without errors.
3. Use the keyboard shortcut or define your own in Chrome to trigger the command handler.


## License

This project is licensed under the [MIT License](LICENSE).
