/**
 * Tel-Aqua — Promo offer + validate (Hostinger backend).
 * Prices/codes from API only. Attribution + language from marketing URLs.
 * The eligible offer returned by Discounts admin is auto-applied as the default.
 * Any active promo code may be validated and applied for checkout.
 */
(() => {
  'use strict';

  const API_BASE = () => (
    window.TELAQUA_API_BASE || 'https://lightpink-reindeer-561421.hostingersite.com'
  );

  const OFFER_KEY = 'telaqua-promo-offer-v1';
  const APPLIED_KEY = 'telaqua-promo-applied-v1';
  const DEFAULT_DISMISSED_KEY = 'telaqua-promo-default-dismissed-v1';
  const ATTR_KEY = 'telaqua-promo-attribution-v1';
  const PLATFORM_KEY = 'telaqua_platform';
  const LANGUAGE_KEY = 'telaqua_language';
  const RETIRED_DEFAULT_CODE = 'SN40';

  const SUPPORTED_PLATFORMS = Object.freeze([
    'Facebook', 'Instagram', 'YouTube', 'WhatsApp', 'Website'
  ]);
  const SOCIAL_PLATFORMS = Object.freeze([
    'Facebook', 'Instagram', 'YouTube', 'WhatsApp'
  ]);
  const SUPPORTED_LANGUAGES = Object.freeze([
    'Telugu', 'Hindi', 'Direct'
  ]);

  const LANG_TO_I18N = Object.freeze({
    Telugu: 'te',
    Hindi: 'hi',
    Direct: 'en'
  });

  let offer = null;
  let applied = null;
  let offerStatus = 'idle';
  let offerError = '';
  let attribution = { platform: 'Website', language: 'Direct' };

  const emit = () => {
    document.dispatchEvent(new CustomEvent('telaqua:promo-updated', {
      detail: {
        offer: offer ? { ...offer } : null,
        applied: applied ? { ...applied } : null,
        offerStatus,
        offerError,
        attribution: { ...attribution }
      }
    }));
  };

  const normalizePlatform = value => {
    const raw = String(value || '').trim();
    if(!raw) return '';
    const hit = SUPPORTED_PLATFORMS.find(p => p.toLowerCase() === raw.toLowerCase());
    return hit || '';
  };

  const normalizeLanguage = value => {
    const raw = String(value || '').trim();
    if(!raw) return '';
    const hit = SUPPORTED_LANGUAGES.find(l => l.toLowerCase() === raw.toLowerCase());
    return hit || '';
  };

  /** Infer social platform from document.referrer when URL has no ?platform= */
  const platformFromReferrer = () => {
    try {
      const ref = String(document.referrer || '').trim();
      if(!ref) return '';
      const host = new URL(ref).hostname.toLowerCase().replace(/^www\./, '');
      if(/^(m\.)?facebook\.com$|^fb\.com$|^fb\.me$|^l\.facebook\.com$/.test(host)) return 'Facebook';
      if(/^(l\.)?instagram\.com$/.test(host)) return 'Instagram';
      if(/^youtube\.com$|^m\.youtube\.com$|^youtu\.be$/.test(host)) return 'YouTube';
      if(/^whatsapp\.com$|^wa\.me$|^api\.whatsapp\.com$/.test(host)) return 'WhatsApp';
      if(/^linkedin\.com$|^t\.co$|^twitter\.com$|^x\.com$|^tiktok\.com$/.test(host)) {
        /* Map other social hosts to nearest supported bucket for 35% messaging */
        if(host.includes('linkedin')) return 'Facebook';
        if(host.includes('tiktok') || host.includes('twitter') || host === 't.co' || host === 'x.com') return 'Instagram';
      }
    } catch(error){ /* ignore bad referrer */ }
    return '';
  };

  const isSocialPlatform = platform => SOCIAL_PLATFORMS.includes(normalizePlatform(platform) || platform);

  const readStoredAttribution = () => {
    try {
      const raw = localStorage.getItem(ATTR_KEY);
      if(raw){
        const parsed = JSON.parse(raw);
        const platform = normalizePlatform(parsed.platform) || 'Website';
        const language = normalizeLanguage(parsed.language) || 'Direct';
        return { platform, language };
      }
      const platform = normalizePlatform(localStorage.getItem(PLATFORM_KEY));
      const language = normalizeLanguage(localStorage.getItem(LANGUAGE_KEY));
      if(platform || language){
        return {
          platform: platform || 'Website',
          language: language || 'Direct'
        };
      }
    } catch(error){ /* ignore */ }
    return null;
  };

  const persistAttribution = attr => {
    try {
      localStorage.setItem(ATTR_KEY, JSON.stringify(attr));
      localStorage.setItem(PLATFORM_KEY, attr.platform);
      localStorage.setItem(LANGUAGE_KEY, attr.language);
    } catch(error){ /* ignore */ }
  };

  /**
   * 1) URL ?platform=&language=
   * 2) Stored attribution from earlier marketing visit
   * 3) Social document.referrer
   * 4) Default Website + Direct
   */
  const resolveAttribution = () => {
    const params = new URLSearchParams(window.location.search);
    const urlPlatform = normalizePlatform(params.get('platform'));
    const urlLanguage = normalizeLanguage(params.get('language'));
    const hasUrlPlatform = Boolean(urlPlatform);
    const hasUrlLanguage = Boolean(urlLanguage);
    const stored = readStoredAttribution();
    const referrerPlatform = platformFromReferrer();

    let platform = 'Website';
    let language = 'Direct';

    if(hasUrlPlatform || hasUrlLanguage){
      platform = hasUrlPlatform ? urlPlatform : (stored?.platform || referrerPlatform || 'Website');
      language = hasUrlLanguage ? urlLanguage : (stored?.language || 'Direct');
      attribution = { platform, language };
      persistAttribution(attribution);
      return {
        ...attribution,
        fromUrl: true,
        urlHadLanguage: hasUrlLanguage
      };
    }

    if(stored){
      attribution = stored;
      return { ...attribution, fromUrl: false, urlHadLanguage: false };
    }

    if(referrerPlatform){
      attribution = { platform: referrerPlatform, language: 'Direct' };
      persistAttribution(attribution);
      return { ...attribution, fromUrl: false, urlHadLanguage: false };
    }

    attribution = { platform: 'Website', language: 'Direct' };
    persistAttribution(attribution);
    return { ...attribution, fromUrl: false, urlHadLanguage: false };
  };

  const getAttribution = () => {
    if(!attribution) resolveAttribution();
    return { ...attribution };
  };

  const applyUiLanguageFromMarketing = async language => {
    const i18nCode = LANG_TO_I18N[language];
    if(!i18nCode || !window.TelAquaI18n?.setLanguage) return;
    const current = window.TelAquaI18n.getLanguage?.();
    if(current === i18nCode) return;
    try {
      await window.TelAquaI18n.setLanguage(i18nCode);
    } catch(error){
      console.warn('[promo] language switch failed', error);
    }
  };

  const num = value => {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  };

  /**
   * Normalize offer/validate payloads.
   * Backend returns { success, promo: { code, ... } } — must read data.promo.
   */
  const normalizePromo = (data, fallbackCode = '') => {
    if(!data || typeof data !== 'object') return null;
    const source = data.promo && typeof data.promo === 'object'
      ? data.promo
      : (data.offer && typeof data.offer === 'object'
        ? data.offer
        : (data.data && typeof data.data === 'object' ? data.data : data));

    const code = String(
      source.code ||
      source.promo_code ||
      data.code ||
      data.promo_code ||
      fallbackCode ||
      ''
    ).trim().toUpperCase();

    const original_price = num(source.original_price ?? data.original_price);
    const promo_price = num(source.promo_price ?? data.promo_price);
    const discount_amount = num(source.discount_amount ?? data.discount_amount);

    if(!code) return null;

    return {
      code,
      original_price,
      promo_price,
      discount_amount,
      raw: data
    };
  };

  const readStoredApplied = () => {
    try {
      const raw = localStorage.getItem(APPLIED_KEY);
      if(!raw) return null;
      const parsed = JSON.parse(raw);
      if(!parsed?.code) return null;
      if(String(parsed.code).trim().toUpperCase() === RETIRED_DEFAULT_CODE){
        localStorage.removeItem(APPLIED_KEY);
        return null;
      }
      return {
        code: String(parsed.code).trim().toUpperCase(),
        original_price: num(parsed.original_price),
        promo_price: num(parsed.promo_price),
        discount_amount: num(parsed.discount_amount),
        /* v1 had no source. Only its former automatic default is migrated. */
        source: parsed.source === 'manual' || parsed.source === 'default'
          ? parsed.source
          : (String(parsed.code).trim().toUpperCase() === 'TELAQUA25' ? 'legacy-default' : 'manual')
      };
    } catch(error){
      return null;
    }
  };

  const persistApplied = () => {
    try {
      if(applied){
        localStorage.setItem(APPLIED_KEY, JSON.stringify({
          code: applied.code,
          original_price: applied.original_price,
          promo_price: applied.promo_price,
          discount_amount: applied.discount_amount,
          source: applied.source
        }));
      } else {
        localStorage.removeItem(APPLIED_KEY);
      }
    } catch(error){ /* ignore */ }
  };

  const isDefaultDismissed = () => {
    try { return localStorage.getItem(DEFAULT_DISMISSED_KEY) === '1'; }
    catch(error){ return false; }
  };

  const setDefaultDismissed = dismissed => {
    try {
      if(dismissed) localStorage.setItem(DEFAULT_DISMISSED_KEY, '1');
      else localStorage.removeItem(DEFAULT_DISMISSED_KEY);
    } catch(error){ /* ignore */ }
  };

  const clearApplied = ({ dismissDefault = false } = {}) => {
    applied = null;
    setDefaultDismissed(dismissDefault);
    persistApplied();
    emit();
  };

  const setApplied = (promo, source = 'manual') => {
    applied = { ...promo, source };
    if(source === 'manual' || source === 'default') setDefaultDismissed(false);
    persistApplied();
    emit();
  };

  /**
   * GET /api/promo/offer?platform=&language=
   * Never replace an already-applied coupon; boot applies this only as the default.
   * 404 → hide silently.
   */
  const fetchOffer = async () => {
    const attr = getAttribution();
    offerStatus = 'loading';
    offerError = '';
    emit();

    const url = `${API_BASE()}/api/promo/offer?platform=${encodeURIComponent(attr.platform)}&language=${encodeURIComponent(attr.language)}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' }
      });

      if(response.status === 404){
        offer = null;
        offerStatus = 'empty';
        emit();
        return null;
      }

      let data = null;
      try {
        data = await response.json();
      } catch(parseError){
        data = null;
      }

      if(!response.ok){
        offer = null;
        offerStatus = 'error';
        offerError = data?.message || data?.error || 'Offer unavailable';
        emit();
        return null;
      }

      const normalized = normalizePromo(data);
      if(!normalized){
        offer = null;
        offerStatus = 'empty';
        emit();
        return null;
      }

      offer = normalized;
      offerStatus = 'ready';
      try {
        sessionStorage.setItem(OFFER_KEY, JSON.stringify({
          code: offer.code,
          original_price: offer.original_price,
          promo_price: offer.promo_price,
          discount_amount: offer.discount_amount,
          platform: attr.platform,
          language: attr.language
        }));
      } catch(err){ /* ignore */ }
      emit();
      return offer;
    } catch(error){
      offer = null;
      offerStatus = 'error';
      offerError = '';
      emit();
      return null;
    }
  };

  /**
   * POST /api/promo/validate { code }
   * Accepts any active promo code from the API (not limited to landing /offer).
   * One coupon only — a successful validate replaces any previously applied code.
   * Prices always come from the validate response for that code.
   */
  const validateCode = async (code, { source = 'manual' } = {}) => {
    const normalizedCode = String(code || '').trim().toUpperCase();
    if(!normalizedCode){
      return { ok:false, message: 'Enter a coupon code.' };
    }

    if(applied?.code && applied.code === normalizedCode){
      return { ok:true, promo: applied, message: `Coupon ${applied.code} applied` };
    }

    let response;
    try {
      response = await fetch(`${API_BASE()}/api/promo/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({ code: normalizedCode })
      });
    } catch(error){
      return { ok:false, message: 'Unable to validate coupon. Please try again.' };
    }

    let data = null;
    try {
      data = await response.json();
    } catch(parseError){
      data = null;
    }

    if(!response.ok || (data && data.success === false)){
      return {
        ok: false,
        message: data?.message || data?.error || 'Invalid coupon code.'
      };
    }

    const promo = normalizePromo(data, normalizedCode);
    if(!promo){
      return { ok:false, message: data?.message || 'Invalid coupon code.' };
    }

    setApplied(promo, source);
    return { ok:true, promo, message: `Coupon ${promo.code} applied` };
  };

  /** Re-check a stored applied code via API; clear only if invalid/inactive. */
  const revalidateApplied = async () => {
    const stored = applied || readStoredApplied();
    if(!stored?.code) return null;

    let response;
    try {
      response = await fetch(`${API_BASE()}/api/promo/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({ code: stored.code })
      });
    } catch(error){
      return stored;
    }

    let data = null;
    try {
      data = await response.json();
    } catch(parseError){
      data = null;
    }

    if(!response.ok || (data && data.success === false)){
      clearApplied();
      return null;
    }

    const promo = normalizePromo(data, stored.code);
    if(!promo){
      clearApplied();
      return null;
    }

    setApplied(promo, stored.source === 'default' ? 'default' : 'manual');
    return promo;
  };

  /** Apply the active Discounts-admin offer unless the customer removed it. */
  const applyDefaultOffer = async () => {
    if(!offer?.code || isDefaultDismissed()) return null;
    if(applied?.code) return applied;
    const result = await validateCode(offer.code, { source:'default' });
    return result.ok ? result.promo : null;
  };

  const pricingForQuantity = quantity => {
    const qty = Math.max(1, Number(quantity) || 1);
    if(!applied) return null;
    const unitOriginal = applied.original_price;
    const unitPromo = applied.promo_price;
    const unitDiscount = applied.discount_amount;
    return {
      code: applied.code,
      quantity: qty,
      original_price: unitOriginal,
      promo_price: unitPromo,
      discount_amount: unitDiscount,
      subtotal: unitOriginal != null ? unitOriginal * qty : null,
      discount: unitDiscount != null ? unitDiscount * qty : null,
      total: unitPromo != null ? unitPromo * qty : null
    };
  };

  applied = readStoredApplied();

  const boot = async () => {
    const resolved = resolveAttribution();

    const syncLang = async () => {
      if(resolved.urlHadLanguage){
        await applyUiLanguageFromMarketing(resolved.language);
      }
    };

    if(window.TelAquaI18n?.ready){
      try {
        await window.TelAquaI18n.ready();
      } catch(error){ /* continue */ }
      await syncLang();
    } else {
      await syncLang();
    }

    await fetchOffer();
    if(applied?.source === 'legacy-default'){
      /* Replace the former automatic default, but never overwrite a typed code. */
      clearApplied();
    }
    if(applied?.code) await revalidateApplied();
    else await applyDefaultOffer();
  };

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', () => { boot(); });
  } else {
    boot();
  }

  window.TelAquaPromo = Object.freeze({
    getAttribution,
    isSocialTraffic: () => isSocialPlatform(getAttribution().platform),
    fetchOffer,
    validateCode,
    revalidateApplied,
    applyDefaultOffer,
    clearApplied,
    getOffer: () => (offer ? { ...offer } : null),
    getApplied: () => (applied ? { ...applied } : null),
    getOfferStatus: () => offerStatus,
    pricingForQuantity,
    formatInr: value => {
      if(value == null || !Number.isFinite(Number(value))) return '';
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
      }).format(Number(value));
    }
  });
})();
