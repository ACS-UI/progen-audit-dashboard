import { onLocalStorageKeyChange } from '../../scripts/utils.js';

function getScoreByKeyFromStorage() {
  const scoreByKey = {};
  let storedMetrics;

  try {
    storedMetrics = window.localStorage.getItem('ui-audit-metrics');
  } catch (e) {
    storedMetrics = null;
  }

  if (!storedMetrics) return scoreByKey;

  let parsedMetrics;
  try {
    parsedMetrics = JSON.parse(storedMetrics);
  } catch (e) {
    parsedMetrics = null;
  }

  const dataArray = Array.isArray(parsedMetrics)
    ? parsedMetrics
    : parsedMetrics?.data;
  if (!Array.isArray(dataArray)) return scoreByKey;

  dataArray.forEach((item) => {
    if (item?.key && item?.value !== undefined) {
      scoreByKey[item.key] = item.value;
    }
  });

  return scoreByKey;
}

export default async function decorate(block) {
  const authoredRows = [...block.children];
  const section = block.closest('.section');
  const classList = Array.from(block.classList || []);
  const ignoredClasses = new Set(['parameter', 'block', 'decorated', 'section']);
  const normalizeClassToken = (s) => s
    .trim()
    .replace(/-([a-zA-Z0-9])/g, (_m, chr) => chr.toUpperCase())
    .replace(/[^a-zA-Z0-9_.]/g, '');

  let keywords = classList
    .map((c) => normalizeClassToken(c))
    .filter((c) => c && !ignoredClasses.has(c) && !c.startsWith('align') && !c.startsWith('has'));

  if (keywords.length === 0) {
    const keywordString = section?.dataset.keyword || '';
    keywords = keywordString
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);
  }

  const primaryKeyword = keywords[0] || '';

  async function renderMetrics() {
    const rows = [...authoredRows];
    const scoreByKey = getScoreByKeyFromStorage();
    const headerRow = rows.shift();

  const iconNode = headerRow.querySelector('picture')?.cloneNode(true) || null;
    const title = headerRow.querySelector('h1, h2, h3, h4, h5, h6')?.textContent || '';
    const subtitle = headerRow.querySelectorAll('p')[1]?.textContent || '';
    const riskLabel = headerRow.querySelectorAll('p')[2]?.textContent || '';

    block.textContent = '';

    const header = document.createElement('div');
    const titleClass = title.toLowerCase().replace(/ /g, '-');
    header.className = `${titleClass}-header domain-header`;
    const headerScoreKey = `overallScores.${primaryKeyword}Score`;
    const headerScore = scoreByKey[headerScoreKey];
    const riKey = `riskIndex.${primaryKeyword}`;
    const riskindex = scoreByKey[riKey];

    // Build header DOM without using innerHTML
    const headerLeft = document.createElement('div');
    headerLeft.className = 'header-left';

    const iconWrapper = document.createElement('div');
    iconWrapper.className = 'icon-wrapper';
    if (iconNode) iconWrapper.appendChild(iconNode);

    const titleWrap = document.createElement('div');
    const h2 = document.createElement('h2');
    h2.id = titleClass;
    h2.textContent = title;
    const pSubtitle = document.createElement('p');
    pSubtitle.textContent = subtitle;
    titleWrap.append(h2, pSubtitle);

    headerLeft.append(iconWrapper, titleWrap);
    header.appendChild(headerLeft);

    if (headerScore) {
      const riskWrapper = document.createElement('div');
      riskWrapper.className = 'risk-wrapper';

      const riskScoreEl = document.createElement('div');
      riskScoreEl.className = 'risk-score';
      riskScoreEl.textContent = headerScore;

      const riskLabelEl = document.createElement('div');
      riskLabelEl.className = 'risk-label';
      riskLabelEl.textContent = `${riskLabel}${riskindex ? `: ${riskindex}` : ''}`;

      riskWrapper.append(riskScoreEl, riskLabelEl);
      header.appendChild(riskWrapper);
    }

    block.append(header);

    const grid = document.createElement('div');
    grid.className = 'parameter-grid';

    const formatLabel = (key, domainTok) => {
      let suffix = key;
      const idx = domainTok ? key.indexOf(domainTok) : -1;
      if (idx !== -1) {
        const after = key.slice(idx + domainTok.length);
        suffix = after || '';
        if (suffix.startsWith('.')) suffix = suffix.slice(1);
      }
      if (!suffix) {
        suffix = key.replace(new RegExp(`.*${domainTok}.*`, 'i'), '').replace(/^\./, '') || key;
      }
      let label = suffix.replace(/[._-]/g, ' ');
      label = label.replace(/([a-z])([A-Z])/g, '$1 $2');
      label = label.trim();
      if (!label) label = domainTok || key;
      label = label
        .split(/\s+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      return label;
    };

    const domainTokenPresent = keywords.length > 0;

    const domainPrefixes = keywords.map((kw) => `domains.${kw}`);
    let keys = Object.keys(scoreByKey).filter((k) => {
      if (!domainTokenPresent) return false;
      return domainPrefixes.some(
        (prefix) => k === prefix || k.startsWith(`${prefix}.`),
      );
    });
    keys = keys.filter((k) => !k.toLowerCase().endsWith('.score'));
    keys.sort();
    const hasDomainKeys = keys.length > 0 && domainTokenPresent;

    const wcagKeys = keys.filter((k) => k.toLowerCase().includes('wcag'));
    if (hasDomainKeys) {
      if (wcagKeys.length > 0) {
        const severities = ['critical', 'high', 'medium', 'low'];
        const severityColors = {
          critical: '#ef4444',
          high: '#f97316',
          medium: '#F0B100',
          low: '#2B7FFF',
        };

        const wcagCard = document.createElement('div');
        wcagCard.className = 'metric-card wcag-card list-card';
        const h3 = document.createElement('h3');
        h3.textContent = 'WCAG Violations';
        const ulEl = document.createElement('ul');
        ulEl.className = 'wcag-list';

        severities.forEach((s) => {
          const matchKey = wcagKeys.find(
            (k) => k.toLowerCase().endsWith(`.${s}`) || k.toLowerCase().includes(`.${s}`),
          );
          const value = matchKey ? scoreByKey[matchKey] : 0;
          const color = severityColors[s] || '#6b7280';
          const label = s.charAt(0).toUpperCase() + s.slice(1);

          const li = document.createElement('li');
          li.className = `wcag-${s}`;

          const spanLabel = document.createElement('span');
          spanLabel.className = 'wcag-label';
          spanLabel.textContent = label;

          const spanValue = document.createElement('span');
          spanValue.className = 'wcag-value';
          spanValue.style.color = color;
          spanValue.style.fontWeight = '600';
          spanValue.textContent = value;

          li.append(spanLabel, spanValue);
          ulEl.appendChild(li);
        });

        wcagCard.append(h3, ulEl);
        grid.append(wcagCard);
      }

      const otherKeys = keys.filter((k) => !k.toLowerCase().includes('wcag'));
      otherKeys.forEach((k) => {
        const rawValue = scoreByKey[k];
        const value = rawValue === undefined || rawValue === null ? '' : rawValue;
        const matchingKeyword = keywords.find(
          (kw) => k === `domains.${kw}` || k.startsWith(`domains.${kw}.`),
        ) || primaryKeyword;

        let label = formatLabel(k, matchingKeyword);
        label = label
          .replace(/\b(Count|Percent|Score|Failures|Issues)\b/gi, '')
          .trim();

        label = label.split(/\s+/).map((w) => {
          if (w.toLowerCase() === 'aria') return 'ARIA';
          return w.charAt(0).toUpperCase() + w.slice(1);
        }).join(' ');

        let displayValue = value;
        if (
          k.toLowerCase().includes('percent')
          || /percent/i.test(k)
          || String(value).toLowerCase() === 'n/a'
        ) {
          if (String(value).match(/^\d+$/)) displayValue = `${value}%`;
        }

        const card = document.createElement('div');
        card.className = 'metric-card';
        const valDiv = document.createElement('div');
        valDiv.className = 'metric-value';
        valDiv.textContent = displayValue === 'n/a' ? '-' : displayValue;
        const labelDiv = document.createElement('div');
        labelDiv.className = 'metric-label';
        labelDiv.textContent = label;
        card.append(valDiv, labelDiv);
        grid.append(card);
      });
    } else {
      rows.forEach((row) => {
        const list = row.querySelector('ul');

        if (list) {
          const listTitle = row.querySelector('p')?.textContent || '';
          const items = Array.from(
            list.querySelectorAll('li'),
            (li) => li.textContent,
          );

          const wcagCard = document.createElement('div');
          wcagCard.className = 'metric-card list-card';

          const h3 = document.createElement('h3');
          h3.textContent = listTitle;
          const ulEl = document.createElement('ul');

          items.forEach((item) => {
            let severity = '0';
            // try exact matches for each keyword domain (e.g., accessibility.SomeRule)
            const exactKeyMatch = keywords.map((kw) => `${kw}.${item}`).find((candidate) => scoreByKey[candidate] !== undefined);
            if (exactKeyMatch) {
              severity = scoreByKey[exactKeyMatch];
            } else {
              const match = Object.entries(scoreByKey).find(([k]) => k.toLowerCase().includes(item.toLowerCase().replace(/\s+/g, '')));
              if (match) {
                const [, v] = match;
                severity = v;
              }
            }

            const safeClass = item.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
            const li = document.createElement('li');
            li.className = safeClass;

            const spanVal = document.createElement('span');
            spanVal.className = 'severity-value';
            spanVal.textContent = item;
            const spanLabel = document.createElement('span');
            spanLabel.className = 'severity-label';
            spanLabel.textContent = severity;

            li.append(spanVal, spanLabel);
            ulEl.appendChild(li);
          });

          wcagCard.append(h3, ulEl);
          grid.append(wcagCard);
        } else {
          const text = row.textContent.trim();

          if (!text) return;

          const card = document.createElement('div');
          card.className = 'metric-card';
          const valDiv = document.createElement('div');
          valDiv.className = 'metric-value';
          const labelDiv = document.createElement('div');
          labelDiv.className = 'metric-label';
          labelDiv.textContent = text;
          card.append(valDiv, labelDiv);
          grid.append(card);
        }
      });
    }

    block.append(grid);
  }

  await renderMetrics();

  const unsubscribe = onLocalStorageKeyChange('ui-audit-metrics', () => {
    renderMetrics();
  });

  block.addEventListener('disconnected', () => {
    unsubscribe();
  });
}
