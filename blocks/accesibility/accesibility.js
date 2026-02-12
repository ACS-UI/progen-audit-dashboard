import { fetchFormJson, getFormUrl } from '../../scripts/utils.js';

export default async function decorate(block) {
  const rows = [...block.children];

  const headerRow = rows.shift();

  const icon = headerRow.querySelector("picture")?.outerHTML || "";
  const title = headerRow.querySelector("h2")?.textContent || "";
  const subtitle = headerRow.querySelectorAll("p")[1]?.textContent || "";
  const riskLabel = headerRow.querySelectorAll("p")[2]?.textContent || "";

  const scoreByKey = {};
  try {
    const formUrl = getFormUrl() || getFormUrl(block) || null;
    if (formUrl) {
      window.__auditDataCache = window.__auditDataCache || {};
      let dataArray = window.__auditDataCache[formUrl];
      if (!dataArray) {
        const formData = await fetchFormJson(formUrl);
        dataArray = Array.isArray(formData) ? formData : formData?.data;
        window.__auditDataCache[formUrl] = dataArray;
      }
      if (Array.isArray(dataArray)) {
        for (let i = 0; i < dataArray.length; i += 1) {
          const item = dataArray[i];
          if (item?.key && item?.value !== undefined) scoreByKey[item.key] = item.value;
        }
      }
    }
  } catch (e) {
    /* noop */
  }

  block.textContent = "";

  const header = document.createElement("div");
  const domainTokenForClass = (title || '').toLowerCase().replace(/\s+/g, '-');
  header.className = `${domainTokenForClass}-header domain-header`;

  const domainToken = (title || '').toLowerCase().replace(/\s+/g, '');
  const headerScoreKey = `overallScores.${domainToken}Score`;
  const headerScore = scoreByKey[headerScoreKey];

  header.innerHTML = `
    <div class="header-left">
      <div class="icon-wrapper">${icon}</div>
      <div>
        <h2>${title}</h2>
        <p>${subtitle}</p>
      </div>
    </div>
    <div class="risk-wrapper">
      <div class="risk-score">${headerScore ?? 72}</div>
      <div class="risk-label">${riskLabel}</div>
    </div>
  `;

  block.append(header);

  const grid = document.createElement('div');
  grid.className = 'accessibility-grid';
  const fragment = document.createDocumentFragment();

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
      suffix = key.replace(new RegExp(`.*${domainTok}.*`, 'i'), '').replace(/^\./, '') || key;
    }
    let label = suffix.replace(/[._\-]/g, ' ');
    label = label.replace(/([a-z])([A-Z])/g, '$1 $2');
    label = label.trim();
    if (!label) label = domainTok ? domainTok : key;
    label = label.split(/\s+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    return label;
  };

  const domainTokenPresent = domainToken && domainToken.length > 0;

  const domainPrefix = `domains.${domainToken}`;
  let keys = Object.keys(scoreByKey)
    .filter((k) => {
      const lk = k.toLowerCase();
      if (lk.startsWith('riskindex.')) return false;
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
      const severityColors = { critical: '#ef4444', high: '#f97316', medium: '#F0B100', low: '#2B7FFF' };
      const wcagCard = document.createElement('div');
      wcagCard.className = 'metric-card wcag-card list-card';
      const h3 = document.createElement('h3');
      h3.textContent = 'WCAG Violations';
      const ul = document.createElement('ul');
      ul.className = 'wcag-list';
      const wcagBase = `${domainPrefix}.wcagViolations`;
      for (let i = 0; i < severities.length; i += 1) {
        const s = severities[i];
        const li = document.createElement('li');
        li.className = `wcag-${s}`;
        const label = document.createElement('span');
        label.className = 'wcag-label';
        label.textContent = s.charAt(0).toUpperCase() + s.slice(1);
        const valueEl = document.createElement('span');
        valueEl.className = 'wcag-value';
        valueEl.style.color = severityColors[s] || '#6b7280';
        valueEl.style.fontWeight = '600';
        const key = `${wcagBase}.${s}`;
        const value = scoreByKey[key] !== undefined ? scoreByKey[key] : 0;
        valueEl.textContent = value;
        li.append(label, valueEl);
        ul.append(li);
      }
      wcagCard.append(h3, ul);
      fragment.appendChild(wcagCard);
    }

    const otherKeys = keys.filter((k) => !k.toLowerCase().includes('wcag'));
    for (let i = 0; i < otherKeys.length; i += 1) {
      const k = otherKeys[i];
      const rawValue = scoreByKey[k];
      const value = rawValue === undefined || rawValue === null ? '' : rawValue;
      let label = formatLabel(k, domainToken);
      label = label.replace(/\b(Count|Percent|Score|Failures|Issues)\b/gi, '').trim();
      label = label.split(/\s+/).map((w) => (w.toLowerCase() === 'aria' ? 'ARIA' : (w.charAt(0).toUpperCase() + w.slice(1)))).join(' ');
      let displayValue = value;
      const lk = k.toLowerCase();
      if (lk.includes('percent') || String(value).toLowerCase() === 'n/a') {
        if (String(value).match(/^\d+$/)) displayValue = `${value}%`;
      }
      const card = document.createElement('div');
      card.className = 'metric-card';
      const valEl = document.createElement('div');
      valEl.className = 'metric-value';
      valEl.textContent = displayValue;
      const lblEl = document.createElement('div');
      lblEl.className = 'metric-label';
      lblEl.textContent = label;
      card.append(valEl, lblEl);
      fragment.appendChild(card);
    }
  } else {
    rows.forEach((row) => {
      const list = row.querySelector('ul');

      if (list) {
        const title = row.querySelector('p')?.textContent || '';
        const items = [...list.querySelectorAll('li')].map((li) => li.textContent);

        const wcagCard = document.createElement('div');
        wcagCard.className = 'metric-card list-card';
        const h3 = document.createElement('h3');
        h3.textContent = title;
        const ul = document.createElement('ul');
        for (let j = 0; j < items.length; j += 1) {
          const item = items[j];
          let severity = '5';
          const exactKey = `${domainToken}.${item}`;
          if (scoreByKey[exactKey] !== undefined) severity = scoreByKey[exactKey];
          else {
            const entries = Object.entries(scoreByKey);
            for (let e = 0; e < entries.length; e += 1) {
              const [k, v] = entries[e];
              if (k.toLowerCase().includes(item.toLowerCase().replace(/\s+/g, ''))) {
                severity = v; break;
              }
            }
          }
          const li = document.createElement('li');
          li.className = item.replace(/[^a-z0-9\-]/gi, '-').toLowerCase();
          const spanVal = document.createElement('span');
          spanVal.className = 'severity-value';
          spanVal.textContent = item;
          const spanLabel = document.createElement('span');
          spanLabel.className = 'severity-label';
          spanLabel.textContent = severity;
          li.append(spanVal, spanLabel);
          ul.append(li);
        }
        wcagCard.append(h3, ul);
        fragment.appendChild(wcagCard);
      } else {
        const text = row.textContent.trim();

        if (!text) return;

        const card = document.createElement('div');
        card.className = 'metric-card';
        const valEl = document.createElement('div');
        valEl.className = 'metric-value';
        const lblEl = document.createElement('div');
        lblEl.className = 'metric-label';
        lblEl.textContent = text;
        card.append(valEl, lblEl);
        fragment.appendChild(card);
      }
    });
  }
  grid.appendChild(fragment);
  block.append(grid);
}
