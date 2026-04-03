import {
  getUIAuditMetrics,
  UI_AUDIT_METRICS_UPDATED_EVENT,
  getScoreByKeyFromMetrics
} from '../../scripts/utils.js';

function getHeadingMarkup(block) {
  const heading = block.querySelector('h1, h2, h3, h4, h5, h6');

  if (!heading) {
    return '<h3 id="check-summary">Check Summary</h3>';
  }

  return heading.cloneNode(true).outerHTML;
}

function getListItems(block) {
  // If we already parsed and stored labels, use them
  if (block.dataset.labels) {
    return JSON.parse(block.dataset.labels);
  }
  const labels = [...block.querySelectorAll('ol li')]
    .map((item) => item.textContent?.trim())
    .filter(Boolean);

  // Store labels to prevent losing them on re-render
  if (labels.length) {
    block.dataset.labels = JSON.stringify(labels);
  }
  return labels;
}

function normalizeKey(label) {
  return label.toLowerCase();
}

function getFallbackValue(label) {
  const fallbackValues = {
    'total checks': '254',
    passed: '130',
    failed: '124',
    'critical failed': '32',
    'mandatory failed': '106',
    'high failed': '59',
    'medium failed': '33',
  };

  return fallbackValues[normalizeKey(label)] || '--';
}

function getItemTone(label) {
  const nl = normalizeKey(label);
  if (nl === 'passed') return 'is-success';
  if (nl === 'failed' || nl === 'critical failed') return 'is-danger';
  if (nl === 'mandatory failed' || nl === 'high failed' || nl === 'medium failed') return 'is-warning';
  return '';
}

function getItems(block) {
  return getListItems(block).map((label) => ({
    label,
    value: getFallbackValue(label),
    tone: getItemTone(label),
  }));
}

function getItemMarkup(item) {
  return `
    <article class="check-summary__item ${item.tone}">
      <div class="check-summary__item-label">${item.label}</div>
      <div class="check-summary__item-value ${item.tone}">${item.value}</div>
    </article>
  `;
}

async function renderCheckSummary(block, metricsData) {
  // Use provided metrics or use localStorage
  let metrics = metricsData;
  if (!metrics) {
    metrics = getUIAuditMetrics();
    if (!metrics) {
      const stored = localStorage.getItem('ui-audit-metrics');
      if (stored) {
        try { metrics = JSON.parse(stored); } catch (e) { /* ignore */ }
      }
    }
  }

  const scoreMap = getScoreByKeyFromMetrics(metrics);
  const labels = getListItems(block);

  const keyMapping = {
    'total checks': 'summary.overall.total',
    'passed': 'summary.overall.passed',
    'failed': 'summary.overall.failed',
    'critical failed': 'summary.overall.criticalFailed',
    'mandatory failed': 'summary.overall.mandatoryFailed',
    'high failed': 'summary.overall.highFailed',
    'medium failed': 'summary.overall.mediumFailed',
  };

  const items = labels.map((label) => {
    const nl = normalizeKey(label);
    const metricKey = keyMapping[nl];
    const value = scoreMap[metricKey];

    return {
      label,
      value: value !== undefined && value !== null ? value : '--',
      tone: getItemTone(label),
    };
  });

  if (!block.dataset.heading) block.dataset.heading = getHeadingMarkup(block);

  block.innerHTML = `
    ${block.dataset.heading}
    <h2 id="summary-heading" class="check-summary__sr-only"></h2>
    <div class="check-summary__grid">
      ${items.map((item) => getItemMarkup(item)).join('')}
    </div>
  `;

  block.classList.add('cmp-check-summary');
  block?.closest('.check-summary-container')?.classList.add('check-summary-grid');
}

export default async function decorate(block) {
  // Initial render
  await renderCheckSummary(block);

  // Live updates
  window.addEventListener(UI_AUDIT_METRICS_UPDATED_EVENT, (e) => {
    renderCheckSummary(block, e.detail.metrics);
  });
}
