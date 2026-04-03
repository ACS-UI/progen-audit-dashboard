import {
  getUIAuditMetrics,
  UI_AUDIT_METRICS_UPDATED_EVENT,
  getScoreByKeyFromMetrics
} from '../../scripts/utils.js';

/**
 * Reuses the authored heading node so the rendered block preserves
 * the original heading level instead of forcing a fixed tag.
 *
 * @param {HTMLElement} block
 * @returns {string}
 */
function getHeadingMarkup(block) {
  const heading = block.querySelector('h1, h2, h3, h4, h5, h6');

  if (!heading) {
    return '<h3 id="overall-scores">Overall Scores</h3>';
  }

  return heading.cloneNode(true).outerHTML;
}

/**
 * Reads the authored metric labels from the block rows that follow the heading.
 *
 * @param {HTMLElement} block
 * @returns {string[]}
 */
function getMetricLabels(block) {
  const metricRows = block ? Array.from(block.children).slice(1) : [];
  return metricRows
    .map((row) => row.textContent.trim())
    .filter(Boolean);
}

/**
 * Builds the segmented circular progress meter markup shown in the overview card.
 *
 * @param {number} score
 * @returns {string}
 */
function getProgressMarkup(score) {
  const totalSegments = 36;
  const getSegmentColor = (index) => {
    const segmentScore = Math.round((index / Math.max(totalSegments - 1, 1)) * 100);

    if (segmentScore <= 50) {
      return 'hsl(0 72% 45%)';
    }

    if (segmentScore < 80) {
      const warningProgress = (segmentScore - 50) / 30;
      const warningHue = Math.round(12 + (warningProgress * 30));
      return `hsl(${warningHue} 88% 50%)`;
    }

    const successProgress = (segmentScore - 80) / 20;
    const successHue = Math.round(78 + (successProgress * 42));
    return `hsl(${successHue} 72% 42%)`;
  };

  const segmentsMarkup = Array.from({ length: totalSegments }, (_, index) => `
      <span
        class="overall__graph-segment"
        style="--segment-index:${index}; --segment-color:${getSegmentColor(index)};"
        aria-hidden="true"
      ></span>`).join('');

  return `
    <div class="overall__graph-ring" data-score="${score}" aria-hidden="true">
${segmentsMarkup}
    </div>
    <div class="overall__graph-score" aria-label="Overall score ${score} percent">
      <span class="overall__graph-score-value">0</span>
      <span class="overall__graph-score-unit">%</span>
    </div>
  `;
}

/**
 * Animates the progress meter from zero to the authored score after render.
 *
 * @param {HTMLElement} block
 */
function animateProgressMeter(block) {
  const ring = block.querySelector('.overall__graph-ring');
  const scoreValue = block.querySelector('.overall__graph-score-value');
  const scoreContainer = block.querySelector('.overall__graph-score');

  if (!ring || !scoreContainer || !scoreValue) {
    return;
  }

  const segments = [...ring.querySelectorAll('.overall__graph-segment')];
  const totalSegments = segments.length;
  const targetScore = Number(ring.dataset.score) || 0;
  const duration = 1800;

  const getProgressColor = (progressScore) => {
    const safeScore = Math.max(0, Math.min(progressScore, 100));

    if (safeScore <= 50) {
      return 'hsl(0 72% 45%)';
    }

    if (safeScore < 80) {
      const warningProgress = (safeScore - 50) / 30;
      const warningHue = Math.round(12 + (warningProgress * 30));
      return `hsl(${warningHue} 88% 50%)`;
    }

    const successProgress = (safeScore - 80) / 20;
    const successHue = Math.round(78 + (successProgress * 42));
    return `hsl(${successHue} 72% 42%)`;
  };

  const updateMeter = (progressScore) => {
    const activeSegments = Math.round((progressScore / 100) * totalSegments);
    const progressColor = getProgressColor(progressScore);

    scoreValue.textContent = `${progressScore}`;
    ring.style.setProperty('--overview-progress-color', progressColor);
    scoreContainer.style.setProperty('--overview-progress-color', progressColor);
    segments.forEach((segment, index) => {
      segment.classList.toggle('is-active', index < activeSegments);
    });
  };

  const start = performance.now();

  const tick = (now) => {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const easedProgress = 1 - ((1 - progress) ** 3);
    const currentScore = Math.round(targetScore * easedProgress);

    updateMeter(currentScore);

    if (progress < 1) {
      window.requestAnimationFrame(tick);
    }
  };

  updateMeter(0);
  window.requestAnimationFrame(tick);
}

/**
 * Converts the authored overview block content into the rendered card UI.
 *
 * @param {HTMLElement} block
 * @returns {Promise<void>}
 */
async function renderOverallScoreCards(block, metricsData) {
  // get metrics from localStorage
  let metrics = metricsData;
  if (!metrics) {
    metrics = getUIAuditMetrics();
    if (!metrics) {
      const stored = localStorage.getItem('ui-audit-metrics');
      if (stored) {
        try {
          metrics = JSON.parse(stored);
        } catch (e) {
          // ignore
        }
      }
    }
  }

  const headingMarkup = block.dataset.heading || getHeadingMarkup(block);
  if (!block.dataset.heading) block.dataset.heading = headingMarkup;

  const metricLabels = getMetricLabels(block);
  const scoreMap = getScoreByKeyFromMetrics(metrics);

  const total = Number(scoreMap['summary.overall.total']) || 0;
  const passed = Number(scoreMap['summary.overall.passed']) || 0;
  const failed = Number(scoreMap['summary.overall.failed']) || 0;

  const overallScore = total > 0 ? Math.round((passed / total) * 100) : 0;

  /**
   * The user's labels are: ["Passed", "Failed", "Total"]
   */
  const scores = metricLabels.map((label) => {
    const l = label.toLowerCase();
    if (l.includes('pass')) return passed;
    if (l.includes('fail')) return failed;
    if (l.includes('total')) return total;
    return 0;
  });

  const metricsMarkup = metricLabels.map((label, index) => `
        <div class="overall__metrics-item">
          <span>${label}</span>
          <span class="score">${scores[index] ?? ''}</span>
        </div>`).join('');

  block.innerHTML = `
    ${headingMarkup}
    <div class="overall__graph">
      ${getProgressMarkup(overallScore)}
    </div>
    <div class="overall__metrics-container">
${metricsMarkup}
    </div>
  `;

  block.classList.add('cmp-overview');
  animateProgressMeter(block);
}

/**
 * Adds layout hooks and renders the overview block.
 *
 * @param {HTMLElement} block
 */
export default function decorate(block) {
  block?.closest('.overview-container')?.classList.add('overview-grid');
  renderOverallScoreCards(block);
  // Re-render when metrics are updated
  window.addEventListener(UI_AUDIT_METRICS_UPDATED_EVENT, (e) => {
    renderOverallScoreCards(block, e.detail.metrics);
  });
}
