import { loadChartJs } from '../../scripts/utils.js';

const SCORE_KEYS = [
  'overallScores.uiQualityScore',
  'overallScores.accessibilityScore',
  'overallScores.performanceScore',
  'overallScores.codeQualityScore',
  'overallScores.securityScore',
  'overallScores.uxComplianceScore',
];

const SCORE_LABELS = [
  'UI Quality',
  'Accessibility',
  'Performance',
  'Code Quality',
  'Security',
  'UX Compliance',
];

const BAR_COLORS = ['#3B82F6', '#A855F7', '#10B981', '#F97316', '#6366F1', '#0EA5E9'];

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

  const dataArray = Array.isArray(parsedMetrics) ? parsedMetrics : parsedMetrics?.data;
  if (!Array.isArray(dataArray)) return scoreByKey;

  dataArray.forEach((item) => {
    if (item?.key && item?.value !== undefined) {
      scoreByKey[item.key] = item.value;
    }
  });

  return scoreByKey;
}

export default async function decorate(block) {
  const scoreByKey = getScoreByKeyFromStorage();
  const isMobile = window.matchMedia('(max-width: 1200px)').matches;
  const barThickness = isMobile ? 28 : 130;

  const container = document.createElement('div');
  container.className = 'bar-chart-content';

  block.replaceChildren(container);

  const chartValues = SCORE_KEYS.map((key) => {
    const parsedScore = parseInt(scoreByKey[key], 10);
    if (Number.isNaN(parsedScore)) return null;
    return Math.max(0, Math.min(parsedScore, 100));
  });

  const hasAnyScore = chartValues.some((value) => value !== null);
  if (!hasAnyScore) return;

  const existingChart = container.querySelector('.bar-chart-chart');
  if (existingChart) existingChart.remove();

  const chartWrapper = document.createElement('div');
  chartWrapper.className = 'bar-chart-chart';
  const chartCanvas = document.createElement('canvas');
  chartWrapper.append(chartCanvas);
  container.append(chartWrapper);

  await loadChartJs();

  const labels = [];
  const values = [];
  const colors = [];

  chartValues.forEach((value, index) => {
    if (value === null) return;
    labels.push(SCORE_LABELS[index]);
    values.push(value);
    colors.push(BAR_COLORS[index % BAR_COLORS.length]);
  });

  const dashedGridPlugin = {
    id: 'dashed-grid',
    beforeDatasetsDraw: (chart) => {
      const { ctx, chartArea, scales } = chart;
      const xScale = scales.x;
      const yScale = scales.y;
      if (!chartArea || !xScale || !yScale) return;

      ctx.save();
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1;

      yScale.ticks.forEach((_, index) => {
        const y = yScale.getPixelForTick(index);
        ctx.strokeStyle = '#E5E7EB';
        ctx.beginPath();
        ctx.moveTo(chartArea.left, y);
        ctx.lineTo(chartArea.right, y);
        ctx.stroke();
      });

      xScale.ticks.forEach((_, index) => {
        const x = xScale.getPixelForTick(index);
        ctx.strokeStyle = '#E5E7EB';
        ctx.beginPath();
        ctx.moveTo(x, chartArea.top);
        ctx.lineTo(x, chartArea.bottom);
        ctx.stroke();
      });

      ctx.restore();
    },
  };

  // eslint-disable-next-line no-new
  new window.Chart(chartCanvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: colors,
          borderRadius: {
            topLeft: 8,
            topRight: 8,
            bottomLeft: 0,
            bottomRight: 0,
          },
          borderSkipped: false,
          barThickness,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          grid: {
            display: false,
            drawOnChartArea: false,
            drawTicks: true,
            tickLength: 6,
            color: '#E5E7EB',
          },
          border: {
            display: true,
            color: '#E5E7EB',
          },
          ticks: {
            color: '#6B7280',
            font: {
              size: 12,
              weight: 400,
            },
          },
        },
        y: {
          min: 0,
          max: 100,
          ticks: {
            display: true,
            stepSize: 20,
            color: '#6B7280',
            font: {
              size: 12,
              weight: 400,
            },
            callback: (value) => `${value}`,
          },
          grid: {
            display: false,
            color: '#E5E7EB',
            lineWidth: 1,
            drawTicks: true,
          },
          border: {
            display: true,
            color: '#D1D5DB',
          },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false },
      },
    },
    plugins: [dashedGridPlugin],
  });
}
