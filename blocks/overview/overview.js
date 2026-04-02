import {
  getUIAuditMetrics,
  getScoreByKeyFromMetrics,
  shouldDisableDashboardMotion,
  UI_AUDIT_METRICS_UPDATED_EVENT,
} from '../../scripts/utils.js';

function shouldDisableOverviewMotion() {
  return shouldDisableDashboardMotion();
}

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

function getMetricValueByCandidates(scoreByKey, candidates, fallbackValue) {
  const matchingCandidate = candidates.find((candidate) => scoreByKey[candidate] !== undefined);

  if (!matchingCandidate) {
    return fallbackValue;
  }

  return scoreByKey[matchingCandidate];
}

function parseOverviewScore(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const normalizedValue = String(value).trim();

  if (!normalizedValue || normalizedValue.toLowerCase() === 'na' || normalizedValue.toLowerCase() === 'n/a') {
    return null;
  }

  const numericValue = Number.parseFloat(normalizedValue.replace(/[^\d.-]/g, ''));

  return Number.isFinite(numericValue) ? Math.max(0, Math.min(100, numericValue)) : null;
}

function interpolateRgbStops(score, stops) {
  const safeScore = Math.max(0, Math.min(score, 100));
  const upperStopIndex = stops.findIndex((stop) => safeScore <= stop.score);

  if (upperStopIndex <= 0) {
    return stops[0].rgb;
  }

  const lowerStop = stops[upperStopIndex - 1];
  const upperStop = stops[upperStopIndex];
  const scoreRange = upperStop.score - lowerStop.score || 1;
  const progress = (safeScore - lowerStop.score) / scoreRange;

  return lowerStop.rgb.map((value, index) => Math.round(
    value + ((upperStop.rgb[index] - value) * progress),
  ));
}

function getOverviewGlowColor(score) {
  if (!Number.isFinite(score)) {
    return 'rgb(148 163 184 / 20%)';
  }

  const [red, green, blue] = interpolateRgbStops(score, [
    { score: 0, rgb: [220, 38, 38] },
    { score: 50, rgb: [220, 38, 38] },
    { score: 80, rgb: [245, 158, 11] },
    { score: 100, rgb: [22, 163, 74] },
  ]);

  return `rgb(${red} ${green} ${blue} / 32%)`;
}

function getOverviewMetricBackgroundColor(score) {
  if (!Number.isFinite(score)) {
    return 'var(--color-background-color)';
  }

  if (score <= 50) {
    return 'rgb(220 38 38)';
  }

  if (score < 80) {
    return 'rgb(217 119 6)';
  }

  return 'rgb(89 184 30)';
}

function getOverviewData(metrics, metricLabels = []) {
  const scoreByKey = getScoreByKeyFromMetrics(metrics);
  const fallbackValues = {
    overallScore: 70,
    passed: '130',
    failed: '124',
    total: '254',
  };
  const overallScore = parseOverviewScore(getMetricValueByCandidates(scoreByKey, [
    'overallScores.overallScore',
    'overallScores.uiScore',
    'overview.overallScore',
    'overview.score',
    'overallScore',
  ], fallbackValues.overallScore)) ?? fallbackValues.overallScore;
  const metricValueMap = {
    passed: getMetricValueByCandidates(scoreByKey, [
      'checkSummary.passed',
      'summary.passed',
      'passed',
    ], fallbackValues.passed),
    failed: getMetricValueByCandidates(scoreByKey, [
      'checkSummary.failed',
      'summary.failed',
      'failed',
    ], fallbackValues.failed),
    total: getMetricValueByCandidates(scoreByKey, [
      'checkSummary.totalChecks',
      'summary.totalChecks',
      'totalChecks',
      'total',
    ], fallbackValues.total),
  };
  const scores = metricLabels.map((label) => {
    const normalizedLabel = label.trim().toLowerCase();

    if (normalizedLabel === 'passed') {
      return String(metricValueMap.passed);
    }

    if (normalizedLabel === 'failed') {
      return String(metricValueMap.failed);
    }

    if (normalizedLabel === 'total' || normalizedLabel === 'total checks') {
      return String(metricValueMap.total);
    }

    return '';
  });

  return {
    overallScore,
    scores,
  };
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

function getLoadingMarkup(metricLabels) {
  const metricsMarkup = metricLabels.map(() => `
        <div class="overall__metrics-item overall__metrics-item--loading">
          <span class="overall__metric-skeleton overall__metric-skeleton--label" aria-hidden="true"></span>
          <span class="overall__metric-skeleton overall__metric-skeleton--value" aria-hidden="true"></span>
        </div>`).join('');

  return `
    <div class="overall__graph overall__graph--loading" aria-hidden="true">
      <div class="overall__graph-loading-ring"></div>
      <div class="overall__graph-loading-score">
        <span class="overall__graph-loading-line overall__graph-loading-line--value"></span>
      </div>
    </div>
    <div class="overall__metrics-container">
${metricsMarkup}
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
  const score = block.querySelector('.overall__graph-score');
  const scoreValue = block.querySelector('.overall__graph-score-value');

  if (!ring || !score || !scoreValue) {
    return Promise.resolve();
  }

  if (block.dataset.progressAnimated === 'true') {
    return Promise.resolve();
  }

  const segments = [...ring.querySelectorAll('.overall__graph-segment')];
  const totalSegments = segments.length;
  const targetScore = Number(ring.dataset.score) || 0;
  const duration = 2400;

  block.dataset.progressAnimated = 'true';

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
    const progressGlow = getOverviewGlowColor(progressScore);
    const progressMetricBackground = getOverviewMetricBackgroundColor(progressScore);

    scoreValue.textContent = `${progressScore}`;
    block.style.setProperty('--overview-progress-color', progressColor);
    ring.style.setProperty('--overview-progress-color', progressColor);
    score.style.setProperty('--overview-progress-color', progressColor);
    block.style.setProperty('--overview-card-glow', progressGlow);
    block.style.setProperty('--overview-metric-bg', progressMetricBackground);

    segments.forEach((segment, index) => {
      segment.classList.toggle('is-active', index < activeSegments);
    });
  };

  const start = performance.now();

  return new Promise((resolve) => {
    const tick = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = 1 - ((1 - progress) ** 3);
      const currentScore = Math.round(targetScore * easedProgress);

      updateMeter(currentScore);

      if (progress < 1) {
        window.requestAnimationFrame(tick);
        return;
      }

      block.dispatchEvent(new CustomEvent('overview:score-complete', {
        bubbles: true,
      }));
      resolve();
    };

    updateMeter(0);
    window.requestAnimationFrame(tick);
  });
}

function animateOverviewMetrics(block) {
  const metricItems = [...block.querySelectorAll('.overall__metrics-item')];

  if (!metricItems.length || block.dataset.metricsAnimated === 'true') {
    return Promise.resolve();
  }

  block.dataset.metricsAnimated = 'true';

  metricItems.forEach((item) => {
    item.classList.add('is-hidden');
  });

  return new Promise((resolve) => {
    let completedCount = 0;

    metricItems.forEach((item, index) => {
      window.setTimeout(() => {
        item.classList.remove('is-hidden');
        item.classList.add('is-visible');

        completedCount += 1;

        if (completedCount === metricItems.length) {
          block.dispatchEvent(new CustomEvent('overview:intro-complete', {
            bubbles: true,
          }));
          resolve();
        }
      }, 140 + (index * 140));
    });
  });
}

function applyOverviewLandingShadow(block) {
  const ring = block.querySelector('.overall__graph-ring');
  const rawScore = ring?.dataset.score;
  const parsedScore = parseOverviewScore(rawScore);

  block.style.setProperty('--overview-card-glow', getOverviewGlowColor(parsedScore));
  block.style.setProperty('--overview-metric-bg', getOverviewMetricBackgroundColor(parsedScore));
  block.classList.add('is-landed');
}

function startOverviewSequence(block) {
  if (shouldDisableOverviewMotion()) {
    const ring = block.querySelector('.overall__graph-ring');
    const score = block.querySelector('.overall__graph-score');
    const scoreValue = block.querySelector('.overall__graph-score-value');
    const targetScore = Number(ring?.dataset.score) || 0;
    let progressColor = 'hsl(0 72% 45%)';

    if (targetScore < 80 && targetScore > 50) {
      progressColor = `hsl(${Math.round(12 + (((targetScore - 50) / 30) * 30))} 88% 50%)`;
    } else if (targetScore >= 80) {
      progressColor = `hsl(${Math.round(78 + (((targetScore - 80) / 20) * 42))} 72% 42%)`;
    }

    scoreValue.textContent = `${targetScore}`;
    block.style.setProperty('--overview-progress-color', progressColor);
    block.style.setProperty('--overview-card-glow', getOverviewGlowColor(targetScore));
    block.style.setProperty('--overview-metric-bg', getOverviewMetricBackgroundColor(targetScore));
    ring?.style.setProperty('--overview-progress-color', progressColor);
    score?.style.setProperty('--overview-progress-color', progressColor);
    [...block.querySelectorAll('.overall__graph-segment')].forEach((segment, index, segments) => {
      segment.classList.toggle('is-active', index < Math.round((targetScore / 100) * segments.length));
    });
    [...block.querySelectorAll('.overall__metrics-item')].forEach((item) => {
      item.classList.remove('is-hidden');
      item.classList.add('is-visible');
    });
    block.dispatchEvent(new CustomEvent('overview:intro-complete', {
      bubbles: true,
    }));
    return Promise.resolve();
  }

  return animateProgressMeter(block)
    .then(() => animateOverviewMetrics(block));
}

/**
 * Converts the authored overview block content into the rendered card UI.
 *
 * @param {HTMLElement} block
 * @returns {Promise<void>}
 */
async function renderOverallScoreCards(block, overviewData, headingMarkup, metricLabels) {
  const shouldHideMetricsForIntro = document.body.classList.contains('dashboard-intro-pending')
    && !shouldDisableOverviewMotion();
  const { overallScore, scores } = overviewData;

  const metricsMarkup = metricLabels.map((label, index) => `
        <div class="overall__metrics-item${shouldHideMetricsForIntro ? ' is-hidden' : ''}">
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
  block.classList.remove('is-loading');
}

function renderOverviewLoadingState(block) {
  const headingMarkup = block.dataset.overviewHeadingMarkup || getHeadingMarkup(block);
  const metricLabels = JSON.parse(block.dataset.overviewMetricLabels || '[]');

  block.innerHTML = `
    ${headingMarkup}
    ${getLoadingMarkup(metricLabels)}
  `;

  block.classList.add('cmp-overview', 'is-loading');
}

/**
 * Adds layout hooks and renders the overview block.
 *
 * @param {HTMLElement} block
 */
export default function decorate(block) {
  block?.closest('.overview-container')?.classList.add('overview-grid');
  const authoredHeadingMarkup = getHeadingMarkup(block);
  const authoredMetricLabels = getMetricLabels(block);
  block.dataset.overviewHeadingMarkup = authoredHeadingMarkup;
  block.dataset.overviewMetricLabels = JSON.stringify(authoredMetricLabels);
  const shouldWaitForDashboardIntro = document.body.classList.contains('dashboard-intro-pending')
    && !shouldDisableOverviewMotion();
  let shouldStartWhenReady = !shouldWaitForDashboardIntro;
  let shouldApplyLandingWhenReady = false;
  let hasRenderedMetrics = false;
  let fallbackTimerId = null;

  const renderWithMetrics = (metrics) => {
    if (fallbackTimerId) {
      window.clearTimeout(fallbackTimerId);
      fallbackTimerId = null;
    }

    const overviewData = getOverviewData(metrics, authoredMetricLabels);
    renderOverallScoreCards(block, overviewData, authoredHeadingMarkup, authoredMetricLabels);
    hasRenderedMetrics = true;

    if (shouldApplyLandingWhenReady) {
      applyOverviewLandingShadow(block);
    }

    if (shouldStartWhenReady) {
      startOverviewSequence(block);
      shouldStartWhenReady = false;
    }
  };

  const initialMetrics = getUIAuditMetrics();

  if (initialMetrics) {
    renderWithMetrics(initialMetrics);
  } else {
    renderOverviewLoadingState(block);
    fallbackTimerId = window.setTimeout(() => {
      renderWithMetrics(null);
    }, 2000);
  }

  const handleMetricsUpdate = (event) => {
    const metrics = event?.detail?.metrics;

    if (!metrics) {
      return;
    }

    renderWithMetrics(metrics);
  };

  window.addEventListener(UI_AUDIT_METRICS_UPDATED_EVENT, handleMetricsUpdate);

  block.addEventListener('disconnected', () => {
    window.removeEventListener(UI_AUDIT_METRICS_UPDATED_EVENT, handleMetricsUpdate);
  });

  if (shouldWaitForDashboardIntro) {
    block.addEventListener('dashboard:intro-overview-start', () => {
      if (hasRenderedMetrics) {
        startOverviewSequence(block);
        return;
      }

      shouldStartWhenReady = true;
    }, { once: true });
    block.addEventListener('dashboard:intro-overview-landed', () => {
      if (hasRenderedMetrics) {
        applyOverviewLandingShadow(block);
        return;
      }

      shouldApplyLandingWhenReady = true;
    }, { once: true });
    return;
  }

  if (hasRenderedMetrics) {
    startOverviewSequence(block);
    shouldStartWhenReady = false;
  }
}
