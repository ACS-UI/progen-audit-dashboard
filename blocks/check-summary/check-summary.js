function getHeadingMarkup(block) {
  const heading = block.querySelector('h1, h2, h3, h4, h5, h6');

  if (!heading) {
    return '<h3 id="check-summary">Check Summary</h3>';
  }

  return heading.cloneNode(true).outerHTML;
}

function getListItems(block) {
  return [...block.querySelectorAll('ol li')]
    .map((item) => item.textContent?.trim())
    .filter(Boolean);
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
  const normalizedLabel = normalizeKey(label);

  if (normalizedLabel === 'passed') {
    return 'is-success';
  }

  if (normalizedLabel === 'failed' || normalizedLabel === 'critical failed') {
    return 'is-danger';
  }

  if (normalizedLabel === 'mandatory failed' || normalizedLabel === 'high failed' || normalizedLabel === 'medium failed') {
    return 'is-warning';
  }

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

export default function decorate(block) {
  const headingMarkup = getHeadingMarkup(block);
  const items = getItems(block);

  block.innerHTML = `
    ${headingMarkup}
    <h2 id="summary-heading" class="check-summary__sr-only"></h2>
    <div class="check-summary__grid">
      ${items.map((item) => getItemMarkup(item)).join('')}
    </div>
  `;

  block.classList.add('cmp-check-summary');
  block?.closest('.check-summary-container')?.classList.add('check-summary-grid');
}
