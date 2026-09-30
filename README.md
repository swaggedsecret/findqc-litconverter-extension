# LitConverter - FindQC Companion

A Chrome extension that turns supported marketplace product links into LitBuy URLs while you browse FindQC.

## Overview

This extension is designed to work only on `findqc.com` and `*.findqc.com` pages. It will stay idle elsewhere and only activate when the current tab is on FindQC.

It supports converting product URLs from:

- 1688
- Taobao
- Tmall
- Weidian
- Xianyu
- Agent-style links that forward to those marketplaces

The extension can also append an optional referral code like `?ref=MYCODE123` when configured in the popup.

## Files

```text
findqc-extension/
├── manifest.json
├── content.js
├── popup.html
├── popup.js
├── styles.css
├── .gitignore
├── README.md
└── LICENSE (optional if you add one later)
```

## Chrome installation tutorial

Follow these steps to install the extension in Google Chrome.

### 1) Download the repo

If you have the repository locally, open the folder that contains `manifest.json`.

If you are using Git:

```bash
git clone https://github.com/swaggedsecret/findqc-litconverter-extension.git
cd findqc-litconverter-extension
```

### 2) Open Chrome extension settings

1. Open Google Chrome.
2. Go to:
   ```text
   chrome://extensions/
   ```
3. Turn on `Developer mode` in the top-right corner.

### 3) Load the extension

1. Click the `Load unpacked` button.
2. Select the folder that contains:
   - `manifest.json`
   - `content.js`
   - `popup.html`
   - `popup.js`
   - `styles.css`
3. Chrome will install the extension and show it in your list.

### 4) Pin the extension

1. Click the puzzle icon in the top-right Chrome toolbar.
2. Find `LitConverter - FindQC Companion`.
3. Click the pin icon so it stays visible.

### 5) Test it on FindQC

Open any page on:

- `https://findqc.com/...`
- `https://*.findqc.com/...`

The extension will activate there. If you visit some other site, it will not run.

## How to use it

### Popup usage

Click the extension icon in Chrome.

The popup lets you do the following:

- paste a product URL
- choose the action mode
- add an affiliate or partner code
- convert the link to a LitBuy URL
- copy the generated URL
- open the converted result in a browser tab

### Auto-detection behavior

When you are on a supported FindQC page, the extension attempts to detect the marketplace and product ID automatically. It then builds the LitBuy URL for you.

## Referral code support

You can optionally enter a referral code in the popup, such as:

```text
MYCODE123
```

It will append to the generated URL like this:

```text
https://litbuy.com/product/taobao/123456?ref=MYCODE123
```

## Permissions used

This extension uses:

- `storage` to save settings like affiliate code and mode
- `host_permissions` for `findqc.com` and `*.findqc.com`

## Development notes

- No build step is required.
- Edit the files directly and reload the extension in Chrome after updates.
- To refresh the extension:
  1. Go to `chrome://extensions/`
  2. Find the extension card
  3. Click the refresh icon

## Local development workflow

```bash
cd findqc-litconverter-extension
```

Then edit files in the folder and reload the extension in Chrome.

## Git workflow

Initialize the repo if needed:

```bash
git init
git add .
git commit -m "Initial FindQC extension release"
```

Add the remote:

```bash
git remote add origin https://github.com/swaggedsecret/findqc-litconverter-extension.git
```

Push to GitHub:

```bash
git branch -M main
git push -u origin main
```

## Troubleshooting

### Extension does not load

- Make sure you selected the correct folder containing `manifest.json`.
- Ensure Developer mode is enabled.
- Reload the extension from `chrome://extensions/`.

### Extension does not activate on FindQC

- Confirm you are on a `findqc.com` domain.
- Hard refresh the page.
- Check the browser console for JavaScript errors.

### URL conversion fails

- Use a direct product page, not a generic search result page.
- Confirm the URL is from a supported marketplace.

## Notes

- The extension is intentionally limited to `findqc.com`.
- It does not run outside FindQC.
- This repo contains the extension source only, not the website app.
- LitConverter Website: litconverter.netlify.app

## License

This project is ready for personal or internal use. If you plan to distribute it publicly, add a license file such as MIT before publishing.
