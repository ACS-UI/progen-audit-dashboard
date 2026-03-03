/**
 * Loads Chart.js library dynamically.
 * @returns {Promise<void>}
 */
export async function loadChartJs() {
  if (window.Chart) return;

  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

const LOCAL_STORAGE_CHANGE_EVENT = 'local-storage-change';

/** Window storage namespace for UI audit metrics (replaces localStorage for this flow). */
const UI_AUDIT_METRICS_KEY = 'uiAuditMetrics';
/** Custom event name when metrics are updated (dropdown stores in window and dispatches this). */
export const UI_AUDIT_METRICS_UPDATED_EVENT = 'ui-audit-metrics-updated';

/**
 * Builds report metrics URL from project, year, and quarter: project/year/quarter.
 * @param {string} project - Project slug (e.g. 'myproject').
 * @param {string} year - Year (e.g. '2025').
 * @param {string} quarter - Quarter (e.g. 'q1').
 * @returns {string} Path like /reports/{project}/{year}/{quarter}/ui-audit-metrics.json
 */
export function getReportMetricsUrl(project, year, quarter) {
  const p = (project || '').trim().toLowerCase();
  const y = (year || String(new Date().getFullYear())).trim();
  const q = (quarter || '').trim().toLowerCase();
  if (!p) return '';
  return `/reports/${p}/${y}/${q}/ui-audit-metrics.json`;
}

/**
 * Reads project, year, quarter from current URL search params.
 * @param {{ year?: string, quarter?: string }} [defaults] - Default year and quarter if missing in URL.
 * @returns {{ project: string, year: string, quarter: string }}
 */
export function getReportParamsFromUrl(defaults = {}) {
  const params = new URLSearchParams(window.location.search);
  const currentYear = String(new Date().getFullYear());
  return {
    project: params.get('project') || '',
    year: params.get('year') || defaults.year || currentYear,
    quarter: (params.get('quarter') || defaults.quarter || 'q1').toLowerCase(),
  };
}

/**
 * Fetches report metrics from project/year/quarter URL and stores them (setUIAuditMetrics).
 * Dispatches UI_AUDIT_METRICS_UPDATED_EVENT on success.
 * @param {string} project - Project slug.
 * @param {string} [year] - Year (defaults from getReportParamsFromUrl).
 * @param {string} [quarter] - Quarter (defaults from getReportParamsFromUrl).
 * @returns {Promise<object|null>} Fetched metrics or null if project missing or fetch failed.
 */
export async function fetchReportMetrics(project, year, quarter) {
  const url = getReportMetricsUrl(project, year, quarter);
  if (!url) return null;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      setUIAuditMetrics(null);
      return null;
    }
    const metrics = await response.json();
    setUIAuditMetrics(metrics);
    return metrics;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Error fetching report metrics:', url, e);
    setUIAuditMetrics(null);
    return null;
  }
}

/** Section class names to keep visible when metrics are blank (404). */
const SECTIONS_VISIBLE_WHEN_NO_METRICS = ['dashboard-section', 'period-selector'];

const AUDIT_REPORT_UNAVAILABLE_ID = 'audit-report-unavailable';

/**
 * Hides all main content except dashboard-section and period-selector when metrics are blank.
 * Shows a centered "Audit report not available" message. Reverses when metrics exist.
 * @param {object|object[]|null} metrics - Current metrics (null = hide content).
 */
/** Data attribute on body when metrics are blank (404); loadSection respects this to avoid re-showing hidden sections. */
export const METRICS_BLANK_ATTR = 'data-metrics-blank';

export function setMainVisibilityByMetrics(metrics) {
  const main = document.querySelector('main');
  if (!main) return;
  const hasMetrics = metrics != null && (Array.isArray(metrics) ? metrics.length > 0 : true);
  if (document.body) {
    document.body.setAttribute(METRICS_BLANK_ATTR, hasMetrics ? 'false' : 'true');
  }
  const sections = main.querySelectorAll(':scope > .section');
  sections.forEach((section) => {
    const keepVisible = SECTIONS_VISIBLE_WHEN_NO_METRICS.some((cls) => section.classList.contains(cls));
    if (hasMetrics) {
      section.style.display = '';
    } else if (!keepVisible) {
      section.style.display = 'none';
    }
  });

  let messageEl = document.getElementById(AUDIT_REPORT_UNAVAILABLE_ID);
  if (hasMetrics) {
    if (messageEl) messageEl.style.display = 'none';
  } else {
    if (!messageEl) {
      messageEl = document.createElement('div');
      messageEl.id = AUDIT_REPORT_UNAVAILABLE_ID;
      const p = document.createElement('p');
      p.textContent = 'Audit report not available.';
      messageEl.appendChild(p);
      main.appendChild(messageEl);
    }
    messageEl.style.display = 'block';
  }
}

/**
 * Stores UI audit metrics on the window object and dispatches a custom event.
 * When metrics are null, hides all main sections except dashboard-section and period-selector.
 * @param {object|object[]} metrics - Metrics data (object or array format from API).
 */
export function setUIAuditMetrics(metrics) {
  if (!window.__UI_AUDIT__) {
    window.__UI_AUDIT__ = {};
  }
  window.__UI_AUDIT__[UI_AUDIT_METRICS_KEY] = metrics;
  setMainVisibilityByMetrics(metrics);
  window.dispatchEvent(new CustomEvent(UI_AUDIT_METRICS_UPDATED_EVENT, {
    detail: { metrics },
  }));
}

/**
 * Reads UI audit metrics from the window object.
 * Other blocks use this on render: if data present, update view; then listen for UI_AUDIT_METRICS_UPDATED_EVENT.
 * @returns {object|object[]|null} Stored metrics or null.
 */
export function getUIAuditMetrics() {
  if (!window.__UI_AUDIT__) return null;
  return window.__UI_AUDIT__[UI_AUDIT_METRICS_KEY] ?? null;
}

/**
 * Builds a scoreByKey map from metrics (array or { data: array } of { key, value }).
 * @param {object|object[]|null} metrics - From getUIAuditMetrics().
 * @returns {Record<string, *>} Map of key -> value.
 */
export function getScoreByKeyFromMetrics(metrics) {
  const scoreByKey = {};
  if (metrics == null) return scoreByKey;
  const dataArray = Array.isArray(metrics) ? metrics : metrics?.data;
  if (!Array.isArray(dataArray)) return scoreByKey;
  dataArray.forEach((item) => {
    if (item?.key && item?.value !== undefined) {
      scoreByKey[item.key] = item.value;
    }
  });
  return scoreByKey;
}

/**
 * Writes a value to localStorage and emits a same-tab change event.
 * @param {string} key - Storage key.
 * @param {string|object|number|boolean|null} value - Value to store.
 */
export function setLocalStorageItem(key, value) {
  const oldValue = window.localStorage.getItem(key);
  const newValue = typeof value === 'string' ? value : JSON.stringify(value);

  window.localStorage.setItem(key, newValue);

  window.dispatchEvent(new CustomEvent(LOCAL_STORAGE_CHANGE_EVENT, {
    detail: {
      key,
      oldValue,
      newValue,
      storageArea: 'localStorage',
      source: 'same-tab',
    },
  }));
}

/**
 * Subscribes to localStorage changes.
 * Works for both same-tab updates (custom event) and cross-tab updates (native storage event).
 * @param {(change: {
 *   key: string|null,
 *   oldValue: string|null,
 *   newValue: string|null,
 *   storageArea: string,
 *   source: 'same-tab'|'cross-tab',
 * }) => void} callback - Called on storage change.
 * @param {{ key?: string }} [options] - Optional key filter.
 * @returns {() => void} Cleanup function that removes listeners.
 */
export function onLocalStorageChange(callback, options = {}) {
  const { key: keyFilter } = options;

  const invokeCallback = (change) => {
    if (keyFilter && change.key !== keyFilter) return;
    callback(change);
  };

  const handleCustomChange = (event) => {
    if (!event.detail) return;
    invokeCallback(event.detail);
  };

  const handleNativeStorage = (event) => {
    if (event.storageArea !== window.localStorage) return;

    invokeCallback({
      key: event.key,
      oldValue: event.oldValue,
      newValue: event.newValue,
      storageArea: 'localStorage',
      source: 'cross-tab',
    });
  };

  window.addEventListener(LOCAL_STORAGE_CHANGE_EVENT, handleCustomChange);
  window.addEventListener('storage', handleNativeStorage);

  return () => {
    window.removeEventListener(LOCAL_STORAGE_CHANGE_EVENT, handleCustomChange);
    window.removeEventListener('storage', handleNativeStorage);
  };
}

/**
 * Subscribes to a specific localStorage key.
 * @param {string} key - Storage key to watch.
 * @param {(change: {
 *   key: string|null,
 *   oldValue: string|null,
 *   newValue: string|null,
 *   storageArea: string,
 *   source: 'same-tab'|'cross-tab',
 * }) => void} callback - Called on matching key changes.
 * @returns {() => void} Cleanup function.
 */
export function onLocalStorageKeyChange(key, callback) {
  return onLocalStorageChange(callback, { key });
}

/**
 * Extracts form definition from a document body.
 * @param {HTMLElement} body - The document body element.
 * @returns {{formDef?: HTMLFormElement}} Object containing the form definition.
 */
function extractFormDefinition(body) {
  const formDef = {};
  const form = body.querySelector('form');
  if (form) {
    formDef.formDef = form;
  }
  return formDef;
}

/**
 * Fetches JSON data from a form path.
 * @param {string} pathname - The path to fetch the form from.
 * @returns {Promise<object|HTMLElement|null>} The form data as JSON, parsed form, or null.
 */
export async function fetchFormJson(pathname) {
  let data;
  let path = pathname;

  if (path.startsWith(window.location.origin) && !path.endsWith('.json')) {
    if (path.endsWith('.html')) {
      path = path.substring(0, path.lastIndexOf('.html'));
    }
    path += '/jcr:content/root/section/form.html';
  }

  let resp = await fetch(path);

  if (resp?.headers?.get('Content-Type')?.includes('application/json')) {
    data = await resp.json();
  } else if (resp?.headers?.get('Content-Type')?.includes('text/html')) {
    resp = await fetch(path);
    data = await resp.text().then((html) => {
      try {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        if (doc) {
          return extractFormDefinition(doc.body).formDef;
        }
        return doc;
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Unable to fetch form definition for path', pathname, path);
        return null;
      }
    });
  }

  return data;
}

/**
 * Gets form URL from a cards container.
 * @param {ParentNode} [root=document] - Root node to query from.
 * @returns {string|null} The form URL or null if not found.
 */
export function getFormUrl(root = document) {
  const cardsContainer = root.querySelector('.cards-container');
  if (cardsContainer) {
    return cardsContainer.getAttribute('data-form-link');
  }
  return null;
}
