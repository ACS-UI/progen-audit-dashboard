import {
  getUIAuditMetrics,
  UI_AUDIT_METRICS_UPDATED_EVENT,
  getScoreByKeyFromMetrics
} from '../../scripts/utils.js';

function getHeadingMarkup(block) {
  const heading = block.querySelector('h1, h2, h3, h4, h5, h6');
  if (!heading) return '<h3 id="summary-title">Summary</h3>';
  return heading.cloneNode(true).outerHTML;
}

function getRowCells(row) {
  return [...row.children]
    .map((child) => child.textContent?.trim())
    .filter(Boolean);
}

function getOptionalDescription(block) {
  const legendDescription = [...block.children]
    .slice(1, 4)
    .map((row) => {
      const [label, value] = getRowCells(row);

      if (!label || !value) {
        return '';
      }

      return `${label}: ${value.toLowerCase()}`;
    })
    .filter(Boolean)
    .join(' · ');

  return legendDescription || '';
}

function parseNumber(value) {
  if (value === undefined || value === null) return null;
  const numericValue = Number.parseFloat(String(value).replace(/[^\d.]/g, ''));
  return Number.isFinite(numericValue) ? numericValue : null;
}

function getSummaryData(block, metrics) {
  const scoreMap = getScoreByKeyFromMetrics(metrics);
  const rows = [...block.children];
  const auditRows = rows.slice(1, 4);

  // Extract Overall data
  const overallPassed = Number(scoreMap['summary.overall.passed']) || 0;
  const overallTotal = Number(scoreMap['summary.overall.total']) || 0;
  const overallPassRate = overallTotal > 0 ? Math.round((overallPassed / overallTotal) * 100) : 0;

  // Category mapping
  const categoryKeys = [
    { prefix: 'summary.browserAudit', label: 'Browser Audit' },
    { prefix: 'summary.codeAudit', label: 'Code Audit' },
    { prefix: 'summary.manualAudit', label: 'Manual Audit' },
  ];

  const audits = categoryKeys.map((cat, index) => {
    const passed = Number(scoreMap[`${cat.prefix}.passed`]) || 0;
    const total = Number(scoreMap[`${cat.prefix}.total`]) || 0;
    const value = total > 0 ? Math.round((passed / total) * 100) : 0;

    // Preserve authored labels if possible, otherwise use category label
    const authoredLabel = getRowCells(auditRows[index] || [])[1];

    return {
      label: authoredLabel || cat.label,
      value,
      passed,
      failed: Number(scoreMap[`${cat.prefix}.failed`]) || 0,
      total,
    };
  });

  return {
    passRate: overallPassRate,
    passed: overallPassed,
    failed: Number(scoreMap['summary.overall.failed']) || 0,
    total: overallTotal,
    audits,
    rings: audits.map((audit, index) => ({
      label: audit.label,
      value: audit.value,
      passed: audit.passed,
      failed: audit.failed,
      total: audit.total,
      size: [190, 150, 110][index] ?? 110,
      stroke: 16,
    })),
  };
}

function getRingBackground(value, revealProgress = 1) {
  const safeValue = Math.min(100, Math.max(0, value));
  const safeRevealProgress = Math.min(1, Math.max(0, revealProgress));
  const visibleGreen = Number((safeValue * safeRevealProgress).toFixed(1));
  const visibleRed = Number(((100 - safeValue) * safeRevealProgress).toFixed(1));
  const redStart = visibleGreen;
  const redEnd = Number((visibleGreen + visibleRed).toFixed(1));

  return `conic-gradient(
    var(--summary-ring-green) 0 ${visibleGreen}%,
    var(--summary-ring-red) ${redStart}% ${redEnd}%,
    transparent ${redEnd}% 100%
  )`;
}

function getRingMarkup(ring) {
  const safeValue = ring.value;
  return `
    <div
      class="summary__ring-layer"
      style="--ring-size:${ring.size}px; --ring-thickness:${ring.stroke}px;"
      aria-label="${ring.label} ${ring.value} percent"
      tabindex="0"
      data-label="${ring.label}"
      data-passed="${ring.passed}"
      data-failed="${ring.failed}"
      data-pass-rate="${ring.value}"
      data-ring-value="${safeValue}"
    >
      <div class="summary__ring" style="background:${getRingBackground(safeValue, 0)};"></div>
    </div>
  `;
}

function animateSummaryRings(block) {
  const ringLayers = [...block.querySelectorAll('.summary__ring-layer')];
  const duration = 1200;

  ringLayers.forEach((ringLayer, index) => {
    const ring = ringLayer.querySelector('.summary__ring');
    const targetValue = Number(ringLayer.dataset.ringValue) || 0;

    if (!ring) {
      return;
    }

    const startDelay = index * 120;
    const startTime = performance.now() + startDelay;

    const tick = (now) => {
      if (now < startTime) {
        window.requestAnimationFrame(tick);
        return;
      }

      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = 1 - ((1 - progress) ** 3);
      ring.style.background = getRingBackground(targetValue, easedProgress);

      if (progress < 1) {
        window.requestAnimationFrame(tick);
      }
    };

    window.requestAnimationFrame(tick);
  });
}

function animateAuditBars(block) {
  const barFills = [...block.querySelectorAll('.summary__audit-bar-fill')];

  barFills.forEach((barFill, index) => {
    const { targetWidth } = barFill.dataset;

    if (!targetWidth) {
      return;
    }

    window.setTimeout(() => {
      barFill.style.width = targetWidth;
    }, 180 + (index * 90));
  });
}

function attachRingPopoverPositioning(block) {
  const graph = block.querySelector('.summary__graph');
  const ringLayers = [...block.querySelectorAll('.summary__ring-layer')];
  const popover = block.querySelector('.summary__graph-popover');

  if (!graph || !popover) {
    return;
  }

  const title = popover.querySelector('[data-popover-title]');
  const passed = popover.querySelector('[data-popover-passed]');
  const failed = popover.querySelector('[data-popover-failed]');
  const passRate = popover.querySelector('[data-popover-rate]');

  const setPopoverContent = (ringLayer) => {
    if (!title || !passed || !failed || !passRate) {
      return;
    }

    title.textContent = ringLayer.dataset.label || '';
    passed.textContent = `Passed: ${ringLayer.dataset.passed || '0'}`;
    failed.textContent = `Failed: ${ringLayer.dataset.failed || '0'}`;
    passRate.textContent = `${ringLayer.dataset.passRate || '0'}% pass rate`;
  };

  const setPopoverPosition = (clientX, clientY) => {
    const graphRect = graph.getBoundingClientRect();
    const offsetX = clientX - graphRect.left + 14;
    const offsetY = clientY - graphRect.top + 14;

    popover.style.left = `${offsetX}px`;
    popover.style.top = `${offsetY}px`;
  };

  const getHoveredRingLayer = (clientX, clientY) => {
    const graphRect = graph.getBoundingClientRect();
    const centerX = graphRect.left + (graphRect.width / 2);
    const centerY = graphRect.top + (graphRect.height / 2);
    const distance = Math.hypot(clientX - centerX, clientY - centerY);

    return ringLayers.find((ringLayer) => {
      const size = Number.parseFloat(ringLayer.style.getPropertyValue('--ring-size')) || 0;
      const thickness = Number.parseFloat(ringLayer.style.getPropertyValue('--ring-thickness')) || 0;
      const outerRadius = size / 2;
      const innerRadius = outerRadius - thickness;

      return distance <= outerRadius && distance >= innerRadius;
    }) || null;
  };

  graph.addEventListener('mousemove', (event) => {
    const hoveredRingLayer = getHoveredRingLayer(event.clientX, event.clientY);

    if (!hoveredRingLayer) {
      popover.dataset.visible = 'false';
      return;
    }

    setPopoverContent(hoveredRingLayer);
    setPopoverPosition(event.clientX, event.clientY);
    popover.dataset.visible = 'true';
  });

  graph.addEventListener('mouseleave', () => {
    popover.dataset.visible = 'false';
  });
}

async function renderSummaryCards(block, metricsData) {
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

  if (!block.dataset.heading) block.dataset.heading = getHeadingMarkup(block);
  if (!block.dataset.description) block.dataset.description = getOptionalDescription(block);

  const summaryData = getSummaryData(block, metrics);

  const metricsMarkup = summaryData.audits.map((audit) => {
    const passedRate = Number(audit.value.toFixed(1));
    const failedRate = Number((100 - audit.value).toFixed(1));
    const accentClass = passedRate >= 100 ? 'is-complete' : '';

    return `
      <article class="summary__audit-card ${accentClass}">
        <h4 class="summary__audit-title">${audit.label}</h4>
        <p class="summary__audit-rate">Pass rate: ${passedRate.toFixed(1)}%</p>
        <div class="summary__audit-metrics">
          <div class="summary__audit-metric">
            <div class="summary__audit-metric-label">Passed</div>
            <div class="summary__audit-bar">
              <span class="summary__audit-bar-fill is-passed" data-target-width="${passedRate}%" style="width:0%;"></span>
            </div>
            <div class="summary__audit-metric-value">${audit.passed}</div>
          </div>
          <div class="summary__audit-metric">
            <div class="summary__audit-metric-label">Failed</div>
            <div class="summary__audit-bar">
              <span class="summary__audit-bar-fill is-failed" data-target-width="${failedRate}%" style="width:0%;"></span>
            </div>
            <div class="summary__audit-metric-value">${audit.failed}</div>
          </div>
        </div>
      </article>
    `;
  }).join('');

  block.innerHTML = `
    ${block.dataset.heading}
    <p class="summary__description">${block.dataset.description}</p>
    <div class="summary__content">
      <div class="summary__graph">
        <div class="summary__graph-rings">
          ${summaryData.rings.map((ring) => getRingMarkup(ring)).join('')}
        </div>
        <div class="summary__graph-popover" role="presentation" data-visible="false">
          <div class="summary__ring-popover-title" data-popover-title></div>
          <div class="summary__ring-popover-row">
            <span class="summary__ring-popover-dot is-passed"></span>
            <span data-popover-passed></span>
          </div>
          <div class="summary__ring-popover-row">
            <span class="summary__ring-popover-dot is-failed"></span>
            <span data-popover-failed></span>
          </div>
          <div class="summary__ring-popover-rate" data-popover-rate></div>
        </div>
        <div class="summary__graph-score" aria-label="Pass rate ${summaryData.passRate} percent">
          <span class="summary__graph-score-value">${summaryData.passRate}</span>
          <span class="summary__graph-score-unit">%</span>
        </div>
      </div>
      <div class="summary__metrics-container">
        ${metricsMarkup}
      </div>
    </div>
  `;

  block.classList.add('cmp-summary');
  attachRingPopoverPositioning(block);
  animateSummaryRings(block);
  animateAuditBars(block);
}

export default async function decorate(block) {
  block?.closest('.summary-container')?.classList.add('summary-grid');

  await renderSummaryCards(block);

  window.addEventListener(UI_AUDIT_METRICS_UPDATED_EVENT, (e) => {
    renderSummaryCards(block, e.detail.metrics);
  });
}
