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
