import {
  loadChartJs,
  getUIAuditMetrics,
  getScoreByKeyFromMetrics,
  UI_AUDIT_METRICS_UPDATED_EVENT,
} from '../../scripts/utils.js';

const SCORE_KEYS = [
  'trend.totalIssues',
  'trend.criticalIssues',
  'trend.accessibilityCompliance',
  'trend.performanceCompliance',
  'trend.securityCompliance',
  'trend.developmentCompliance',
];

const SCORE_LABELS = [
  'Total Issues',
  'Critical Issues',
  'Accessibility',
  'Performance',
  'Security',
  'Code Quality',
];

const BAR_COLORS = [
  '#EF4444',
  '#3B82F6',
  '#A855F7',
  '#10B981',
  '#F97316',
  '#6366F1',
  '#0EA5E9',
];

export default async function decorate(block) {
  const container = document.createElement('div');
  container.className = 'bar-chart-content';
  block.replaceChildren(container);

  const renderChart = async () => {
    const scoreByKey = getScoreByKeyFromMetrics(getUIAuditMetrics());
    const chartValues = SCORE_KEYS.map((key) => {
      const parsedScore = parseInt(scoreByKey[key], 10);
      if (Number.isNaN(parsedScore)) return null;
      return Math.max(0, Math.min(parsedScore, 100));
    });

    const hasAnyScore = chartValues.some((value) => value !== null);
    if (!hasAnyScore) {
      if (block.barChartInstance) {
        block.barChartInstance.destroy();
        delete block.barChartInstance;
      }
      container.replaceChildren();
      return;
    }

    const chartWrapper = document.createElement('div');
    chartWrapper.className = 'bar-chart-chart';
    const chartCanvas = document.createElement('canvas');
    chartWrapper.append(chartCanvas);
    container.replaceChildren(chartWrapper);

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

    if (block.barChartInstance) {
      block.barChartInstance.destroy();
    }

    // eslint-disable-next-line no-new
    block.barChartInstance = new window.Chart(chartCanvas, {
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
            barThicknessValue: window.innerWidth / SCORE_KEYS.length,
            maxBarThickness: 120,
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
              tickLength: SCORE_KEYS.length,
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
          tooltip: { enabled: true },
        },
      },
      plugins: [dashedGridPlugin],
    });
  };

  // On render: use data from window if present, then listen for custom event
  await renderChart();

  const handleMetricsUpdate = () => {
    renderChart();
  };
  window.addEventListener(UI_AUDIT_METRICS_UPDATED_EVENT, handleMetricsUpdate);

  window.addEventListener('resize', () => {
    if (block.barChartInstance) {
      renderChart();
    }
  });

  block.addEventListener('disconnected', () => {
    window.removeEventListener(
      UI_AUDIT_METRICS_UPDATED_EVENT,
      handleMetricsUpdate,
    );
    if (block.barChartInstance) {
      block.barChartInstance.destroy();
      delete block.barChartInstance;
    }
  });
}
