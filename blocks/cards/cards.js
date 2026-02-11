import { createOptimizedPicture } from '../../scripts/aem.js';
import {
  fetchFormJson,
  getFormUrl,
  loadChartJs,
} from '../../scripts/utils.js';

const SCORE_KEYS = [
  'overallScores.uiQualityScore',
  'overallScores.accessibilityScore',
  'overallScores.performanceScore',
  'overallScores.codeQualityScore',
  'overallScores.securityScore',
  'overallScores.uxComplianceScore',
];

function getScoreColor(score) {
  const parsedScore = parseInt(score, 10) || 0;
  const scoreNum = Math.max(0, Math.min(parsedScore, 100));

  if (scoreNum >= 75) return '#2B7FFF';
  if (scoreNum >= 60) return '#F0B100';
  return '#ef4444';
}

function createProgressChart(canvas, score) {
  canvas.height = 20;
  canvas.width = canvas.parentElement ? canvas.parentElement.offsetWidth : 200;

  const parsedScore = parseInt(score, 10) || 0;
  const scoreNum = Math.max(0, Math.min(parsedScore, 100));
  const remaining = 100 - scoreNum;
  const color = getScoreColor(scoreNum);

  // eslint-disable-next-line no-new
  new window.Chart(canvas, {
    type: 'bar',
    data: {
      labels: ['UI Quality Score'],
      datasets: [
        {
          data: [scoreNum],
          backgroundColor: color,
          borderWidth: 0,
          borderRadius: 50,
          borderSkipped: false,
          barThickness: 40,
        },
        {
          data: [remaining],
          backgroundColor: '#E5E7EB',
          borderWidth: 0,
          borderRadius: 10,
          borderSkipped: false,
          barThickness: 40,
        },
      ],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          min: 0,
          max: 100,
          stacked: true,
          grid: { display: false },
          ticks: { display: false },
          border: { display: false },
        },
        y: {
          stacked: true,
          grid: { display: false },
          ticks: { display: false },
          border: { display: false },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false },
      },
    },
    plugins: [{
      id: 'scoreLabel',
      afterDraw: (chart) => {
        const { ctx, chartArea } = chart;
        ctx.save();
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#374151';
        ctx.fillText(`${scoreNum}%`, chartArea.right + 35, (chartArea.top + chartArea.bottom) / 2);
        ctx.restore();
      },
    }],
  });
}

export default async function decorate(block) {
  // Fetch form JSON
  const formUrl = await getFormUrl();
  const scoreByKey = {};

  if (formUrl) {
    const formData = await fetchFormJson(formUrl);

    // Get the data array (might be at root level or inside a 'data' property)
    const dataArray = Array.isArray(formData) ? formData : formData?.data;

    if (Array.isArray(dataArray)) {
      dataArray.forEach((item) => {
        if (item?.key && item?.value !== undefined) {
          scoreByKey[item.key] = item.value;
        }
      });
    }
  }

  /* change to ul, li */
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    const body = document.createElement('div');
    body.className = 'cards-card-body';

    while (row.firstElementChild) {
      const child = row.firstElementChild;
      const isImageOnly = child.children.length === 1 && child.querySelector('picture');

      if (isImageOnly) {
        child.className = 'cards-card-image';
        li.append(child);
      } else {
        while (child.firstElementChild) body.append(child.firstElementChild);
        child.remove();
      }
    }

    if (body.childElementCount > 0) li.append(body);
    ul.append(li);
  });
  ul.querySelectorAll('picture > img').forEach((img) => img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }])));
  block.replaceChildren(ul);

  const scoreValues = SCORE_KEYS.map((key) => scoreByKey[key]).filter((value) => value !== undefined && value !== null);
  if (scoreValues.length === 0) return;

  // Load Chart.js once and build score UI on each card based on SCORE_KEYS order.
  await loadChartJs();

  const cards = [...ul.querySelectorAll('li')];
  cards.forEach((card, index) => {
    const scoreKey = SCORE_KEYS[index];
    const scoreValue = scoreByKey[scoreKey];
    if (scoreValue === undefined || scoreValue === null) return;

    const cardBody = card.querySelector('.cards-card-body');
    if (!cardBody) return;

    const existingScoreNumber = cardBody.querySelector('.cards-ui-quality-score-number');
    if (existingScoreNumber) existingScoreNumber.remove();

    const existingChart = cardBody.querySelector('.cards-ui-quality-score');
    if (existingChart) existingChart.remove();

    const scoreNumber = document.createElement('span');
    scoreNumber.className = 'cards-ui-quality-score-number';
    scoreNumber.textContent = scoreValue;
    cardBody.prepend(scoreNumber);

    const chartContainer = document.createElement('div');
    chartContainer.className = 'cards-ui-quality-score';
    const canvas = document.createElement('canvas');
    chartContainer.appendChild(canvas);
    cardBody.append(chartContainer);

    createProgressChart(canvas, scoreValue);
  });
}
