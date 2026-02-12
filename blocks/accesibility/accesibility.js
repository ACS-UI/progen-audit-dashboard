import { fetchFormJson, getFormUrl } from '../../scripts/utils.js';

export default async function decorate(block) {
  const rows = [...block.children];

  const headerRow = rows.shift();

  const icon = headerRow.querySelector('picture')?.outerHTML || '';
  const title = headerRow.querySelector('h2')?.textContent || '';
  const subtitle = headerRow.querySelectorAll('p')[1]?.textContent || '';
  const riskLabel = headerRow.querySelectorAll('p')[2]?.textContent || '';

  const scoreByKey = {};
  const formUrl = getFormUrl() || getFormUrl(block) || null;
  if (formUrl) {
    const formData = await fetchFormJson(formUrl);
    const dataArray = Array.isArray(formData) ? formData : formData?.data;
    if (Array.isArray(dataArray)) {
      dataArray.forEach((item) => {
        if (item?.key && item?.value !== undefined) {
          scoreByKey[item.key] = item.value;
        }
      });
    }
  }

  block.textContent = '';

  const header = document.createElement('div');
  const domainToken = (title || '').toLowerCase().replace(/\s+/g, '-');
  header.className = `${domainToken}-header domain-header`;
  const headerScoreKey = `overallScores.${domainToken}Score`;
  const headerScore = scoreByKey[headerScoreKey];

  header.innerHTML = `
    <div class='header-left'>
      <div class='icon-wrapper'>${icon}</div>
      <div>
        <h2>${title}</h2>
        <p>${subtitle}</p>
      </div>
    </div>
    <div class='risk-wrapper'>
      <div class='risk-score'>${headerScore ?? 72}</div>
      <div class='risk-label'>${riskLabel}</div>
    </div>
  `;

  block.append(header);

  const grid = document.createElement('div');
  grid.className = 'accessibility-grid';

  const formatLabel = (key, domainTok) => {
    const lower = key.toLowerCase();
    let suffix = key;
    const idx = domainTok ? lower.indexOf(domainTok) : -1;
    if (idx !== -1) {
      const after = key.slice(idx + domainTok.length);
      suffix = after || '';
      if (suffix.startsWith('.')) suffix = suffix.slice(1);
    }
    if (!suffix) {
      suffix =
        key
          .replace(new RegExp(`.*${domainTok}.*`, 'i'), '')
          .replace(/^\./, '') || key;
    }
    let label = suffix.replace(/[._\-]/g, ' ');
    label = label.replace(/([a-z])([A-Z])/g, '$1 $2');
    label = label.trim();
    if (!label) label = domainTok ? domainTok : key;
    label = label
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
    return label;
  };

  const domainTokenPresent = domainToken && domainToken.length > 0;

  const domainPrefix = `domains.${domainToken}`;
  let keys = Object.keys(scoreByKey).filter((k) => {
    const lk = k.toLowerCase();
    if (!domainTokenPresent) return false;
    return lk === domainPrefix || lk.startsWith(`${domainPrefix}.`);
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
      const itemsHtml = severities
        .map((s) => {
          const matchKey = wcagKeys.find(
            (k) =>
              k.toLowerCase().endsWith('.' + s) ||
              k.toLowerCase().includes('.' + s),
          );
          const value = matchKey ? scoreByKey[matchKey] : 0;
          const color = severityColors[s] || '#6b7280';
          const label = s.charAt(0).toUpperCase() + s.slice(1);
          return `
            <li class='wcag-${s}'>
              <span class='wcag-label'>${label}</span>
              <span class='wcag-value' style='color:${color}; font-weight:600'>${value}</span>
            </li>
          `;
        })
        .join('');

      wcagCard.innerHTML = `
        <h3>WCAG Violations</h3>
        <ul class='wcag-list'>
          ${itemsHtml}
        </ul>
      `;

      grid.append(wcagCard);
    }

    const otherKeys = keys.filter((k) => !k.toLowerCase().includes('wcag'));
    otherKeys.forEach((k) => {
      const rawValue = scoreByKey[k];
      const value = rawValue === undefined || rawValue === null ? '' : rawValue;

      let label = formatLabel(k, domainToken);
      label = label
        .replace(/\b(Count|Percent|Score|Failures|Issues)\b/gi, '')
        .trim();

      label = label
        .split(/\s+/)
        .map((w) =>
          w.toLowerCase() === 'aria'
            ? 'ARIA'
            : w.charAt(0).toUpperCase() + w.slice(1),
        )
        .join(' ');

      let displayValue = value;
      if (
        k.toLowerCase().includes('percent') ||
        /percent/i.test(k) ||
        String(value).toLowerCase() === 'n/a'
      ) {
        if (String(value).match(/^\d+$/)) displayValue = `${value}%`;
      }

      const card = document.createElement('div');
      card.className = 'metric-card';
      card.innerHTML = `
        <div class='metric-value'>${displayValue}</div>
        <div class='metric-label'>${label}</div>
      `;
      grid.append(card);
    });
  } else {
    rows.forEach((row) => {
      const list = row.querySelector('ul');

      if (list) {
        const title = row.querySelector('p')?.textContent || '';
        const items = [...list.querySelectorAll('li')].map(
          (li) => li.textContent,
        );

        const wcagCard = document.createElement('div');
        wcagCard.className = 'metric-card list-card';

        const itemsHtml = items
          .map((item) => {
            let severity = '0';
            const exactKey = `${domainToken}.${item}`;
            if (scoreByKey[exactKey] !== undefined)
              severity = scoreByKey[exactKey];
            else {
              const match = Object.entries(scoreByKey).find(([k]) =>
                k
                  .toLowerCase()
                  .includes(item.toLowerCase().replace(/\s+/g, '')),
              );
              if (match) severity = match[1];
            }

            const safeClass = item.replace(/[^a-z0-9\-]/gi, '-').toLowerCase();

            return `
              <li class='${safeClass}'>
                <span class='severity-value'>${item}</span>
                <span class='severity-label'>${severity}</span>
              </li>
            `;
          })
          .join('');

        wcagCard.innerHTML = `
          <h3>${title}</h3>
          <ul>
            ${itemsHtml}
          </ul>
        `;

        grid.append(wcagCard);
      } else {
        const text = row.textContent.trim();

        if (!text) return;

        const card = document.createElement('div');
        card.className = 'metric-card';

        card.innerHTML = `
          <div class='metric-value'></div>
          <div class='metric-label'>${text}</div>
        `;

        grid.append(card);
      }
    });
  }

  block.append(grid);
}
