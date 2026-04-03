import {
  loadChartJs,
  getUIAuditMetrics,
  UI_AUDIT_METRICS_UPDATED_EVENT,
  getScoreByKeyFromMetrics
} from '../../scripts/utils.js';

function getHeadingMarkup(block) {
  const heading = block.querySelector('h1, h2, h3, h4, h5, h6');
  if (!heading) return '<h3 id="category-performance-title">Category performance</h3>';
  return heading.cloneNode(true).outerHTML;
}

function getRowCells(row) {
  return [...row.children]
    .map((cell) => cell.textContent?.trim())
    .filter(Boolean);
}

function parseNumber(value) {
  if (value === undefined || value === null) return null;
  const parsedValue = Number.parseFloat(String(value).replace(/[^\d.-]/g, ''));
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function getFallbackData() {
  return [
    { label: 'Discovery', value: 60 },
    { label: 'Content quality', value: 70 },
    { label: 'Internationalization', value: 10 },
    { label: 'Design', value: 20 },
    { label: 'User experience', value: 50 },
    { label: 'Visual design', value: 10 },
    { label: 'Setup', value: 87 },
    { label: 'Development', value: 34 },
    { label: 'Architecture', value: 30 },
    { label: 'Testing', value: 88 },
    { label: 'Security', value: 44 },
    { label: 'Performance', value: 47 },
    { label: 'Accessibility', value: 36 },
    { label: 'Author value', value: 70 },
    { label: 'Pre go live', value: 100 },
    { label: 'Post go live', value: 100 },
    { label: 'Process governance', value: 90 },
  ];
}

function normalizeKey(label) {
  return label.toLowerCase().replace(/[^\w\s]/g, '').trim();
}

function getRiskLabel(value) {
  if (value >= 80) return 'Low';
  if (value >= 50) return 'Moderate';
  return 'High';
}

function getThemeColors(block) {
  const styles = window.getComputedStyle(block);
  return {
    tick: styles.getPropertyValue('--color-chart-tick').trim() || '#98a2b3',
    grid: styles.getPropertyValue('--color-chart-grid').trim() || 'rgb(148 163 184 / 22%)',
    success: styles.getPropertyValue('--color-chart-success').trim() || '#22c55e',
    warning: styles.getPropertyValue('--color-chart-warning').trim() || '#f59e0b',
    danger: styles.getPropertyValue('--color-chart-danger').trim() || '#ef4444',
  };
}

function getBarColor(value, colors) {
  if (value >= 80) return colors.success;
  if (value >= 50) return colors.warning;
  return colors.danger;
}

function truncateLabel(label) {
  return label.length > 14 ? `${label.slice(0, 12)}...` : label;
}

function getChartSizing() {
  const isMobile = window.matchMedia('(max-width: 639px)').matches;
  return {
    barThickness: isMobile ? 8 : 14,
    maxBarThickness: isMobile ? 8 : 14,
    categoryPercentage: isMobile ? 0.42 : 0.6,
    xTickFontSize: isMobile ? 9 : 10,
    xTickRotation: isMobile ? 55 : 35,
  };
}

async function renderChart(block, data) {
  await loadChartJs();
  const canvas = block.querySelector('.category-performance__canvas');
  const tooltipEl = block.querySelector('.category-performance__tooltip');
  if (!canvas || !window.Chart) return;

  const context = canvas.getContext('2d');
  const chartSizing = getChartSizing();
  const externalTooltipHandler = ({ tooltip }) => {
    if (!tooltipEl) return;
    if (tooltip.opacity === 0) {
      tooltipEl.classList.add('hidden');
      tooltipEl.hidden = true;
      return;
    }

    const point = tooltip.dataPoints?.[0];
    const item = point ? data[point.dataIndex] : null;

    if (!item) return;
    tooltipEl.innerHTML = `
      <div class="category-performance__tooltip-title">${item.label}</div>
      <div class="category-performance__tooltip-body">
        <div><span class="category-performance__tooltip-muted">Score</span>: <span class="category-performance__tooltip-value">${item.value}</span></div>
        <div><span class="category-performance__tooltip-muted">Risk</span>: <span class="category-performance__tooltip-value">${getRiskLabel(item.value)}</span></div>
      </div>
    `;
    tooltipEl.style.left = `${tooltip.caretX}px`;
    tooltipEl.style.top = `${tooltip.caretY}px`;
    tooltipEl.classList.remove('hidden');
    tooltipEl.hidden = false;
  };

  const chart = new window.Chart(context, {
    type: 'bar',
    data: {
      labels: data.map((item) => truncateLabel(item.label)),
      datasets: [{
        data: data.map(() => 0),
        backgroundColor: data.map((item) => getBarColor(item.value, getThemeColors(block))),
        borderRadius: { topLeft: 999, topRight: 999, bottomLeft: 0, bottomRight: 0 },
        borderSkipped: false,
        barThickness: chartSizing.barThickness,
        maxBarThickness: chartSizing.maxBarThickness,
        categoryPercentage: chartSizing.categoryPercentage,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 0 },
      animations: {
        y: {
          duration: 700,
          easing: 'easeOutQuart',
          from: 0,
          delay(animationContext) {
            return animationContext.type === 'data' ? animationContext.dataIndex * 80 : 0;
          },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false, external: externalTooltipHandler },
      },
      scales: {
        x: {
          grid: { display: false, drawBorder: false },
          ticks: {
            color: getThemeColors(block).tick,
            maxRotation: chartSizing.xTickRotation,
            minRotation: chartSizing.xTickRotation,
            font: { size: chartSizing.xTickFontSize },
          },
          border: { display: false },
        },
        y: {
          min: 0,
          max: 100,
          ticks: {
            stepSize: 25,
            color: getThemeColors(block).tick,
            font: { size: 10 },
          },
          grid: { color: getThemeColors(block).grid, borderDash: [4, 6], drawBorder: false },
          border: { display: false },
        },
      },
    },
  });

  const applyTheme = () => {
    const colors = getThemeColors(block);
    const nextSizing = getChartSizing();
    chart.data.datasets[0].backgroundColor = data.map((item) => getBarColor(item.value, colors));
    chart.data.datasets[0].barThickness = nextSizing.barThickness;
    chart.data.datasets[0].maxBarThickness = nextSizing.maxBarThickness;
    chart.data.datasets[0].categoryPercentage = nextSizing.categoryPercentage;
    chart.options.scales.x.ticks.color = colors.tick;
    chart.options.scales.x.ticks.maxRotation = nextSizing.xTickRotation;
    chart.options.scales.x.ticks.minRotation = nextSizing.xTickRotation;
    chart.options.scales.x.ticks.font.size = nextSizing.xTickFontSize;
    chart.options.scales.y.ticks.color = colors.tick;
    chart.options.scales.y.grid.color = colors.grid;
    chart.update('none');
  };

  window.requestAnimationFrame(() => {
    chart.data.datasets[0].data = data.map((item) => item.value);
    chart.update();
  });

  const themeObserver = new MutationObserver(() => applyTheme());
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
  if (document.body) themeObserver.observe(document.body, { attributes: true, attributeFilter: ['data-theme', 'class'] });
  window.addEventListener('resize', applyTheme);

  block.chartInstance = chart;
}

async function renderCategoryPerformance(block, metricsData) {
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

  // Get and store authored labels/rows if not already handled
  if (!block.dataset.labels) {
    const rows = [...block.children].slice(1);
    const authoredData = rows.map((row) => getRowCells(row)).filter((cells) => cells.length);
    if (authoredData.length) {
      block.dataset.labels = JSON.stringify(authoredData.map(([label]) => label));
    }
  }

  const authoredLabels = block.dataset.labels ? JSON.parse(block.dataset.labels) : [];

  const keyMapping = {
    discovery: 'scores.discovery',
    contentquality: 'scores.contentQuality',
    internationalization: 'scores.internationalization',
    design: 'scores.design',
    userexperience: 'scores.userExperience',
    visualdesign: 'scores.visualDesign',
    setup: 'scores.setup',
    development: 'scores.development',
    architecture: 'scores.architectureReview',
    architecturereview: 'scores.architectureReview',
    testing: 'scores.testing',
    security: 'scores.security',
    performance: 'scores.performance',
    accessibility: 'scores.accessibility',
    authoring: 'scores.authorValidation',
    authorvalue: 'scores.authorValidation',
    authorvalidation: 'scores.authorValidation',
    pregolive: 'scores.preGoLive',
    postgolive: 'scores.postGoLive',
    processgovernance: 'scores.processGovernance',
  };

  const getTargetData = () => {
    if (authoredLabels.length) {
      return authoredLabels.map((label) => {
        const nl = normalizeKey(label);
        const val = scoreMap[keyMapping[nl]];
        return { label, value: val !== undefined ? Number(val) : 0 };
      });
    }
    // Default categories if nothing authored
    return getFallbackData().map((item) => {
      const nl = normalizeKey(item.label);
      const val = scoreMap[keyMapping[nl]];
      return { label: item.label, value: val !== undefined ? Number(val) : item.value };
    });
  };

  const data = getTargetData();

  if (!block.dataset.heading) block.dataset.heading = getHeadingMarkup(block);

  // If chart already exists, update it, else create
  if (block.chartInstance) {
    block.chartInstance.data.labels = data.map((item) => truncateLabel(item.label));
    block.chartInstance.data.datasets[0].data = data.map((item) => item.value);
    block.chartInstance.data.datasets[0].backgroundColor = data.map((item) => getBarColor(item.value, getThemeColors(block)));
    block.chartInstance.update();
  } else {
    block.innerHTML = `
      ${block.dataset.heading}
      <div class="category-performance__chart-shell" data-chart-host>
        <canvas class="category-performance__canvas" id="chart-categories" role="img" aria-label="Category performance."></canvas>
        <div id="category-chart-tooltip" class="category-performance__tooltip hidden" role="tooltip" hidden></div>
      </div>
    `;
    block.classList.add('cmp-category-performance');
    block?.closest('.category-performance-container')?.classList.add('category-performance-grid');
    await renderChart(block, data);
  }
}

export default async function decorate(block) {
  // Initial render
  await renderCategoryPerformance(block);

  // Live updates
  window.addEventListener(UI_AUDIT_METRICS_UPDATED_EVENT, (e) => {
    renderCategoryPerformance(block, e.detail.metrics);
  });
}
