import {
  getUIAuditMetrics,
  UI_AUDIT_METRICS_UPDATED_EVENT,
  getScoreByKeyFromMetrics
} from '../../scripts/utils.js';

function getHeadingMarkup(block) {
  const heading = block.querySelector('h1, h2, h3, h4, h5, h6');

  if (!heading) {
    return '<h3 id="program-status">Program Status</h3>';
  }

  return heading.cloneNode(true).outerHTML;
}

function getRowCells(row) {
  return [...row.children];
}

function getSelectedListValue(cell) {
  if (!cell) {
    return '';
  }

  const selectedItem = cell.querySelector('li[aria-current="true"], li.selected, li.is-selected, li strong');

  if (selectedItem) {
    return selectedItem.textContent.trim();
  }

  const items = [...cell.querySelectorAll('li')]
    .map((item) => item.textContent.trim())
    .filter(Boolean);

  if (items.length > 1) {
    return items[1];
  }

  return items[0] || '';
}

function parseNumber(value) {
  if (value === undefined || value === null) return null;
  const parsedValue = Number.parseFloat(String(value).replace(/[^\d.-]/g, ''));
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function getStatusTone(label, value) {
  const normalizedLabel = label?.toLowerCase() || '';
  const normalizedValue = String(value).toLowerCase();
  const numericValue = parseNumber(value);

  if (normalizedLabel.includes('rag rating')) {
    if (normalizedValue.includes('green')) return 'success';
    if (normalizedValue.includes('amber')) return 'warning';
    return 'danger';
  }

  if (normalizedLabel.includes('go live ready')) {
    return normalizedValue === 'yes' ? 'success' : 'danger';
  }

  if (normalizedLabel.includes('total blocking issues')) {
    return numericValue === 0 ? 'success' : 'danger';
  }

  if (numericValue === null) return 'neutral';
  if (numericValue >= 80) return 'success';
  if (numericValue >= 60) return 'warning';
  return 'danger';
}

function getCardMarkup({ label, value, tone }) {
  const displayValue = (label.toLowerCase().includes('rate') || label.toLowerCase().includes('percent')) && !String(value).includes('%')
    ? `${value}%`
    : value;

  return `
    <article class="program-status__card is-${tone}">
      <div class="program-status__card-label">${label}</div>
      <div class="program-status__card-value">${displayValue}</div>
    </article>
  `;
}

async function renderStatusCards(block, metricsData) {
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
  const authoredContainer = block.querySelector('.program-status, .overall-status') || block;
  const rows = [...authoredContainer.children]
    .map((row) => getRowCells(row))
    .filter((cells) => cells.length);

  // Define keys mapping
  const keyMapping = {
    'rag rating': 'status.ragRating',
    'go live ready': 'status.goLiveReady',
    'mandatory pass percent': 'status.mandatoryPassRate',
    'mandatory pass rate': 'status.mandatoryPassRate',
    'critical pass rate': 'status.criticalPassRate',
    'high pass rate': 'status.highPassRate',
    'total blocking issues': 'status.totalBlockingIssues',
  };

  const cards = rows.map((cells) => {
    const label = cells[0]?.textContent?.trim() || '';
    const normalizedLabel = label.toLowerCase().replace(/[^\w\s]/g, '').trim();
    const metricKey = keyMapping[normalizedLabel];

    // Use dynamic value if available, else check authored content
    let value = scoreMap[metricKey];
    if (value === undefined || value === null) {
      value = cells[1]?.querySelector('ol, ul')
        ? getSelectedListValue(cells[1])
        : cells[1]?.textContent?.trim();
    }

    return {
      label,
      value: value || '--',
      tone: getStatusTone(label, value || ''),
    };
  });

  if (!block.dataset.heading) block.dataset.heading = getHeadingMarkup(block);

  block.innerHTML = `
    ${block.dataset.heading}
    <div class="program-status__grid">
      ${cards.map((card) => getCardMarkup(card)).join('')}
    </div>
  `;

  block.classList.add('cmp-program-status');
  block?.closest('.program-status-container, .overall-status-container')?.classList.add('program-status-grid');
}

export default async function decorate(block) {
  // Initial render
  await renderStatusCards(block);

  // Live updates
  window.addEventListener(UI_AUDIT_METRICS_UPDATED_EVENT, (e) => {
    renderStatusCards(block, e.detail.metrics);
  });
}
