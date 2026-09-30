const defaultSettings = {
  litconverter_affiliate: '',
  litconverter_mode: 'direct'
};

const elements = {
  urlInput: document.getElementById('url-input'),
  affiliateInput: document.getElementById('affiliate-input'),
  modeSelect: document.getElementById('mode-select'),
  outputLink: document.getElementById('output-link'),
  convertBtn: document.getElementById('convert-btn'),
  copyBtn: document.getElementById('copy-btn'),
  openLinkBtn: document.getElementById('open-link-btn'),
  openAppBtn: document.getElementById('open-app-btn'),
  status: document.getElementById('status')
};

function setStatus(message, type = '') {
  elements.status.textContent = message || '';
  elements.status.className = 'litconverter-status';
  if (type) {
    elements.status.classList.add(type);
  }
}

async function getCurrentTabInfo() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs && tabs[0];
      if (!tab) {
        resolve({ url: '', title: '' });
        return;
      }
      resolve({ url: tab.url || '', title: tab.title || '' });
    });
  });
}

async function autoPopulateFromCurrentTab() {
  const tab = await getCurrentTabInfo();
  if (!tab.url || !tab.url.includes('findqc.com')) {
    setStatus('Open a FindQC product page to auto-convert.', 'error');
    return;
  }

  const parsed = parseProductUrl(tab.url);
  if (parsed.success) {
    const convertedUrl = buildLitBuyUrl(parsed.platform, parsed.id, elements.affiliateInput.value.trim());
    elements.urlInput.value = tab.url;
    elements.outputLink.value = convertedUrl;
    setStatus(`${parsed.platform.toUpperCase()} product detected on this page`, 'success');
    return;
  }

  try {
    const parsedUrl = new URL(tab.url);
    const path = parsedUrl.pathname.toLowerCase();
    const segments = path.split('/').filter(Boolean);
    const numberSegments = segments.filter((segment) => /^\d+$/.test(segment));
    const productId = numberSegments[0] || null;

    if (!productId) {
      const wdMatch = path.match(/\/wd\/(\d+)/i) || path.match(/\/weidian\/(\d+)/i);
      if (wdMatch) {
        const convertedUrl = buildLitBuyUrl('weidian', wdMatch[1], elements.affiliateInput.value.trim());
        elements.urlInput.value = tab.url;
        elements.outputLink.value = convertedUrl;
        setStatus('WEIDIAN detected from current page', 'success');
        return;
      }

      setStatus('This FindQC page does not expose a supported product ID yet.', 'error');
      return;
    }

    const platform = (
      path.includes('1688') || parsedUrl.searchParams.get('site') === '1688' || parsedUrl.searchParams.get('platform') === '1688'
        ? '1688'
        : path.includes('/tb/') || path.includes('taobao') || parsedUrl.searchParams.get('site') === 'taobao' || parsedUrl.searchParams.get('platform') === 'taobao'
          ? 'taobao'
          : path.includes('/tm/') || path.includes('tmall') || parsedUrl.searchParams.get('site') === 'tmall' || parsedUrl.searchParams.get('platform') === 'tmall'
            ? 'tmall'
            : path.includes('/wd/') || path.includes('weidian') || parsedUrl.searchParams.get('site') === 'weidian' || parsedUrl.searchParams.get('platform') === 'weidian'
              ? 'weidian'
              : path.includes('xianyu') || parsedUrl.searchParams.get('site') === 'xianyu' || parsedUrl.searchParams.get('platform') === 'xianyu'
                ? 'xianyu'
                : null
    );

    if (!platform) {
      setStatus('Could not determine the marketplace from this FindQC page URL.', 'error');
      return;
    }

    const convertedUrl = buildLitBuyUrl(platform, productId, elements.affiliateInput.value.trim());
    elements.urlInput.value = tab.url;
    elements.outputLink.value = convertedUrl;
    setStatus(`${platform.toUpperCase()} detected from current page`, 'success');
  } catch (error) {
    setStatus('Failed to read the current FindQC page URL.', 'error');
  }
}

function getQueryParam(url, param) {
  try {
    const u = new URL(url);
    return u.searchParams.get(param);
  } catch (error) {
    const match = url.match(new RegExp(`[?&]${param}=([^&#]*)`, 'i'));
    return match ? decodeURIComponent(match[1]) : null;
  }
}

function buildLitBuyUrl(platform, id, affiliateCode = '') {
  let url = `https://litbuy.com/product/${encodeURIComponent(platform)}/${encodeURIComponent(id)}`;
  if (affiliateCode && affiliateCode.trim()) {
    url += `?ref=${encodeURIComponent(affiliateCode.trim())}`;
  }
  return url;
}

function parseProductUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { success: false, error: 'Please enter a product URL.' };
  }

  const urlStr = rawUrl.trim();
  if (!/^https?:\/\//i.test(urlStr)) {
    return { success: false, error: 'URL must start with http:// or https://' };
  }

  const agentRegex = /pandabuy\.com|mulebuy\.com|sugargoo\.com|superbuy\.com|cnfans\.com|joyabuy\.com|hoobuy\.com/i;
  if (agentRegex.test(urlStr)) {
    const embedded = getQueryParam(urlStr, 'url') || getQueryParam(urlStr, 'productLink');
    if (embedded) {
      return parseProductUrl(decodeURIComponent(embedded));
    }

    const type = (getQueryParam(urlStr, 'shop_type') || '').toLowerCase();
    const id = getQueryParam(urlStr, 'id');
    if (id && /^\d+$/.test(id)) {
      let platform = 'taobao';
      if (type.includes('weidian') || type === '2') platform = 'weidian';
      if (type.includes('1688') || type === '3') platform = '1688';
      if (type.includes('tmall')) platform = 'tmall';
      return { success: true, platform, id };
    }
  }

  if (urlStr.includes('1688.com')) {
    let id = getQueryParam(urlStr, 'offerId') || getQueryParam(urlStr, 'id');
    if (!id) {
      const match = urlStr.match(/offer\/(\d+)\.html/i) || urlStr.match(/\/(\d{10,13})\.html/i);
      if (match) id = match[1];
    }
    if (id && /^\d+$/.test(id)) {
      return { success: true, platform: '1688', id };
    }
  }

  if (urlStr.includes('taobao.com') || urlStr.includes('tb.cn')) {
    if (urlStr.includes('2.taobao.com') || urlStr.includes('xianyu')) {
      const id = getQueryParam(urlStr, 'id');
      if (id && /^\d+$/.test(id)) {
        return { success: true, platform: 'xianyu', id };
      }
    }

    let id = getQueryParam(urlStr, 'id');
    if (!id) {
      const match = urlStr.match(/i(\d+)\.htm/i) || urlStr.match(/\/(\d+)\.htm/i);
      if (match) id = match[1];
    }
    if (id && /^\d+$/.test(id)) {
      return { success: true, platform: 'taobao', id };
    }
  }

  if (urlStr.includes('tmall.com') || urlStr.includes('tmall.hk')) {
    let id = getQueryParam(urlStr, 'id');
    if (!id) {
      const match = urlStr.match(/\/(\d+)\.htm/i);
      if (match) id = match[1];
    }
    if (id && /^\d+$/.test(id)) {
      return { success: true, platform: 'tmall', id };
    }
  }

  if (urlStr.includes('weidian.com') || urlStr.includes('youshop10.com')) {
    let id = getQueryParam(urlStr, 'itemID') || getQueryParam(urlStr, 'itemid') || getQueryParam(urlStr, 'itemId');
    if (!id) {
      const match = urlStr.match(/item\/(\d+)/i) || urlStr.match(/(\d{8,12})/);
      if (match) id = match[1];
    }
    if (id && /^\d+$/.test(id)) {
      return { success: true, platform: 'weidian', id };
    }
  }

  return {
    success: false,
    error: 'Unsupported link format. Please paste a valid 1688, Taobao, Tmall, Weidian, or Xianyu URL.'
  };
}

function readSettings() {
  chrome.storage.sync.get(defaultSettings, (items) => {
    elements.affiliateInput.value = items.litconverter_affiliate || '';
    elements.modeSelect.value = items.litconverter_mode || 'direct';
  });
}

function saveSettings() {
  const settings = {
    litconverter_affiliate: elements.affiliateInput.value.trim(),
    litconverter_mode: elements.modeSelect.value
  };

  chrome.storage.sync.set(settings, () => {
    setStatus('Settings saved', 'success');
    setTimeout(() => setStatus(''), 1000);
  });
}

function convertCurrentUrl() {
  const rawUrl = elements.urlInput.value.trim();
  if (!rawUrl) {
    setStatus('Please paste a product URL first.', 'error');
    return;
  }

  const parsed = parseProductUrl(rawUrl);
  if (!parsed.success) {
    setStatus(parsed.error, 'error');
    elements.outputLink.value = '';
    return;
  }

  const affiliateCode = elements.affiliateInput.value.trim();
  const convertedUrl = buildLitBuyUrl(parsed.platform, parsed.id, affiliateCode);
  elements.outputLink.value = convertedUrl;
  setStatus(`${parsed.platform.toUpperCase()} link converted`, 'success');
}

function copyCurrentUrl() {
  const value = elements.outputLink.value.trim();
  if (!value) {
    setStatus('Nothing to copy yet.', 'error');
    return;
  }

  navigator.clipboard.writeText(value)
    .then(() => setStatus('Copied to clipboard', 'success'))
    .catch(() => {
      setStatus('Clipboard access unavailable', 'error');
    });
}

function openCurrentUrl() {
  const value = elements.outputLink.value.trim();
  if (!value) {
    setStatus('Please convert a URL first.', 'error');
    return;
  }

  const mode = elements.modeSelect.value;
  const targetUrl = mode === 'webapp' ? `${value}${value.includes('?') ? '&' : '?'}source=litconverter` : value;
  window.open(targetUrl, '_blank', 'noopener,noreferrer');
}

function openAppHomepage() {
  // Open the local website index (sibling folder). Works when testing locally.
  try {
    window.open('../website/index.html', '_blank', 'noopener,noreferrer');
  } catch (e) {
    window.open('https://litbuy.com/', '_blank', 'noopener,noreferrer');
  }
}

// Hook the new badge/button in popup.html (sibling control to Open Site)
document.addEventListener('DOMContentLoaded', () => {
  const extBtn = document.getElementById('open-extension-link');
  if (extBtn) {
    extBtn.addEventListener('click', () => {
      try {
        window.open('../website/extension-notes.html' , '_blank', 'noopener,noreferrer');
      } catch (e) {
        // fallback to website landing
        window.open('../website/index.html', '_blank', 'noopener,noreferrer');
      }
    });
  }
});

readSettings();
autoPopulateFromCurrentTab();

elements.convertBtn.addEventListener('click', convertCurrentUrl);
elements.copyBtn.addEventListener('click', copyCurrentUrl);
elements.openLinkBtn.addEventListener('click', openCurrentUrl);
elements.openAppBtn.addEventListener('click', openAppHomepage);
elements.affiliateInput.addEventListener('input', saveSettings);
elements.modeSelect.addEventListener('change', saveSettings);

elements.urlInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    convertCurrentUrl();
  }
});

setStatus('Ready');
