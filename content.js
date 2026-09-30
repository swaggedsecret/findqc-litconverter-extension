(() => {
  const SETTINGS_DEFAULTS = {
    litconverter_affiliate: '',
    litconverter_mode: 'direct'
  };

  const state = {
    affiliate: '',
    mode: 'direct',
    observer: null
  };

  // Ensure this content script only runs on FindQC hosts.
  try {
    const host = (location && location.hostname && String(location.hostname).toLowerCase()) || '';
    if (!host.includes('findqc.com')) {
      console.info('LitConverter content script not initialized — not a findqc.com page:', host);
      return;
    }
  } catch (e) {
    // If anything goes wrong determining hostname, bail out for safety.
    console.info('LitConverter content script aborting due to hostname check error', e);
    return;
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

  function parseFindqcProductUrl(url) {
    if (!url) return null;

    try {
      const u = new URL(url);
      const host = u.hostname.toLowerCase();
      if (!host.includes('findqc.com')) {
        return null;
      }

      const path = u.pathname.toLowerCase();
      const segments = path.split('/').filter(Boolean);

      const platformMap = {
        taobao: 'taobao',
        tb: 'taobao',
        tbaobao: 'taobao',
        ttaobao: 'taobao',
        t1688: '1688',
        1688: '1688',
        tmall: 'tmall',
        tm: 'tmall',
        weidian: 'weidian',
        wd: 'weidian',
        xianyu: 'xianyu'
      };

      for (let i = 0; i < segments.length; i += 1) {
        const seg = segments[i];
        const segLower = seg.toLowerCase();
        const directPlatform = platformMap[segLower] || (
          segLower === 'tb' || segLower === 'taobao' ? 'taobao' :
          segLower === 'wd' || segLower === 'weidian' ? 'weidian' :
          segLower === 'tm' || segLower === 'tmall' ? 'tmall' :
          segLower.includes('weidian') ? 'weidian' :
          segLower.includes('1688') ? '1688' :
          segLower.includes('taobao') ? 'taobao' :
          segLower.includes('tb') ? 'taobao' :
          segLower.includes('tm') ? 'tmall' :
          segLower.includes('xianyu') ? 'xianyu' :
          null
        );

        if (directPlatform) {
          const next = segments[i + 1];
          const candidateId = (next && /^\d+$/.test(next)) ? next : segments[i + 2];
          if (candidateId && /^\d+$/.test(String(candidateId))) {
            return { success: true, platform: directPlatform, id: String(candidateId) };
          }
        }

        if (seg === 'detail' || seg === 'item' || seg === 'product') {
          const next = segments[i + 1];
          if (next) {
            const normalized = next.toLowerCase();
            const platform = platformMap[normalized] || (
              normalized === 'tb' ? 'taobao' :
              normalized === 'wd' ? 'weidian' :
              normalized === 'tm' ? 'tmall' :
              null
            );
            const idCandidate = segments[i + 2] || getQueryParam(url, 'id') || getQueryParam(url, 'itemid') || getQueryParam(url, 'itemId') || getQueryParam(url, 'offerId');
            if (platform && idCandidate && /^\d+$/.test(String(idCandidate))) {
              return { success: true, platform, id: String(idCandidate) };
            }
          }
        }
      }

      const queryPlatform = getQueryParam(url, 'platform') || getQueryParam(url, 'site') || getQueryParam(url, 'src');
      const queryId = getQueryParam(url, 'id') || getQueryParam(url, 'itemid') || getQueryParam(url, 'itemId') || getQueryParam(url, 'offerId');
      if (queryPlatform && queryId && /^\d+$/.test(String(queryId))) {
        const normalized = String(queryPlatform).toLowerCase();
        const mapped = platformMap[normalized] || (
          normalized.includes('1688') ? '1688' :
          normalized.includes('taobao') ? 'taobao' :
          normalized.includes('tmall') ? 'tmall' :
          normalized.includes('weidian') || normalized.includes('wd') ? 'weidian' :
          normalized.includes('xianyu') ? 'xianyu' : null
        );
        if (mapped) return { success: true, platform: mapped, id: String(queryId) };
      }

      const anchorMatches = Array.from(document.querySelectorAll('a[href]'))
        .map((link) => link.href)
        .filter(Boolean)
        .find((href) => hasKnownMarketplace(href));

      if (anchorMatches) {
        return parseProductUrl(anchorMatches);
      }
    } catch (error) {
      return null;
    }

    return null;
  }

  function getCurrentPageConversion() {
    const candidate = parseFindqcProductUrl(location.href);
    if (candidate && candidate.success) {
      return { ...candidate, url: buildLitBuyUrl(candidate.platform, candidate.id, state.affiliate) };
    }

    return null;
  }

  function injectBadge(anchor) {
    if (!anchor || !anchor.href || anchor.dataset.litconverterInjected === 'true') {
      return;
    }

    const href = anchor.href;
    if (!hasKnownMarketplace(href)) {
      return;
    }

    const info = parseProductUrl(href);
    if (!info.success) {
      return;
    }

    if (anchor.parentNode && anchor.parentNode.querySelector('.litconverter-findqc-badge')) {
      return;
    }

    anchor.dataset.litconverterInjected = 'true';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'litconverter-findqc-badge';
    button.setAttribute('aria-label', `Convert this ${info.platform} item to LitBuy`);
    button.innerHTML = '<span class="litconverter-findqc-badge-dot">⚡</span> LitConverter';

    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      const targetUrl = getTargetUrl(info.platform, info.id);
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    });

    if (anchor.nextSibling && anchor.nextSibling.classList && anchor.nextSibling.classList.contains('litconverter-findqc-badge')) {
      anchor.parentNode.insertBefore(button, anchor.nextSibling);
      return;
    }

    anchor.parentNode.insertBefore(button, anchor.nextSibling);
  }

  function scanPage() {
    const anchors = document.querySelectorAll('a[href]');
    anchors.forEach((anchor) => {
      injectBadge(anchor);
    });
  }

  function loadSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(SETTINGS_DEFAULTS, (items) => {
        state.affiliate = items.litconverter_affiliate || '';
        state.mode = items.litconverter_mode || 'direct';
        resolve();
      });
    });
  }

  function insertQuickConvertButton() {
    const existing = document.querySelector('.litconverter-quick-action');
    if (existing) return;

    const current = getCurrentPageConversion();
    if (!current) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'litconverter-quick-action';
    button.innerHTML = '<span>⚡</span> LitBuy';
    button.title = `Open ${current.platform} product in LitBuy`;

    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      const target = state.mode === 'webapp'
        ? `${current.url}${current.url.includes('?') ? '&' : '?'}source=litconverter`
        : current.url;
      window.open(target, '_blank', 'noopener,noreferrer');
    });

    const anchorContainer = document.querySelector('header, .header, .topbar, .app-header, main, body');
    if (anchorContainer) {
      anchorContainer.appendChild(button);
    }
  }

  async function init() {
    await loadSettings();
    scanPage();
    insertQuickConvertButton();

    if (!state.observer) {
      state.observer = new MutationObserver(() => {
        scanPage();
        insertQuickConvertButton();
      });
      state.observer.observe(document.body || document.documentElement, {
        childList: true,
        subtree: true,
        attributes: false,
        characterData: false
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
