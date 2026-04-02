import { attachMetricsGate } from '../../scripts/utils.js';

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
  if (!value) {
    return null;
  }

  const parsedValue = Number.parseFloat(String(value).replace(/[^\d.-]/g, ''));
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function getFallbackValue(label) {
  const normalizedLabel = label.toLowerCase();
  const fallbackValues = {
    'rag rating': 'Amber',
    'go live ready': 'No',
    'total blocking issues': '138',
    'mandatory pass percent': '53.3%',
    'critical pass rate': '36.0%',
    'high pass rate': '60.4%',
  };

  return fallbackValues[normalizedLabel] || '--';
}

function getStatusTone(label, value) {
  const normalizedLabel = label.toLowerCase();
  const normalizedValue = value.toLowerCase();
  const numericValue = parseNumber(value);

  if (normalizedLabel === 'rag rating') {
    if (normalizedValue.includes('green')) {
      return 'success';
    }

    if (normalizedValue.includes('amber')) {
      return 'warning';
    }

    return 'danger';
  }

  if (normalizedLabel === 'go live ready') {
    return normalizedValue === 'yes' ? 'success' : 'danger';
  }

  if (normalizedLabel === 'total blocking issues') {
    return numericValue === 0 ? 'success' : 'danger';
  }

  if (numericValue === null) {
    return 'neutral';
  }

  if (numericValue >= 80) {
    return 'success';
  }

  if (numericValue >= 60) {
    return 'warning';
  }

  return 'danger';
}

function getStatusCards(block) {
  const authoredContainer = block.querySelector('.program-status, .overall-status') || block;
  const rows = [...authoredContainer.children]
    .map((row) => getRowCells(row))
    .filter((cells) => cells.length);

  return rows.map((cells) => {
    const label = cells[0]?.textContent?.trim() || '';
    const explicitValue = cells[1]?.querySelector('ol, ul')
      ? getSelectedListValue(cells[1])
      : cells[1]?.textContent?.trim();
    const value = explicitValue || getFallbackValue(label);

    return {
      label,
      value,
      tone: getStatusTone(label, value),
    };
  });
}

function getCardMarkup({ label, value, tone }) {
  return `
    <article class="program-status__card is-${tone}">
      <div class="program-status__card-label">${label}</div>
      <div class="program-status__card-value">${value}</div>
    </article>
  `;
}

function getLoadingMarkup() {
  return `
    <div class="program-status__grid">
      ${Array.from({ length: 6 }, () => `
        <article class="program-status__card is-loading">
          <span class="program-status__skeleton program-status__skeleton--label dashboard-skeleton"></span>
          <span class="program-status__skeleton program-status__skeleton--value dashboard-skeleton"></span>
        </article>
      `).join('')}
    </div>
  `;
}

export default function decorate(block) {
  const headingMarkup = getHeadingMarkup(block);
  const cards = getStatusCards(block);
  let rendered = false;

  const renderFinalState = () => {
    if (rendered) {
      return;
    }

    rendered = true;
    block.innerHTML = `
      ${headingMarkup}
      <div class="program-status__grid">
        ${cards.map((card) => getCardMarkup(card)).join('')}
      </div>
    `;

    block.classList.add('cmp-program-status');
    block.classList.remove('is-loading');
  };

  block?.closest('.program-status-container, .overall-status-container')?.classList.add('program-status-grid');
  attachMetricsGate({
    renderLoading: () => {
      block.innerHTML = `
        ${headingMarkup}
        ${getLoadingMarkup()}
      `;
      block.classList.add('cmp-program-status', 'is-loading');
    },
    renderFinal: () => {
      renderFinalState();
    },
  });
}
