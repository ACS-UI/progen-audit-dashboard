import { shouldDisableDashboardMotion } from '../utils.js';

const DASHBOARD_BLOCK_SELECTORS = [
  '.overview-grid',
  '.summary-grid',
  '.program-status-grid',
  '.category-performance-grid',
  '.check-summary-grid',
  '.top-issues-grid',
];

const DASHBOARD_AUTHOR_SELECTORS = [
  '.overview',
  '.summary',
  '.program-status',
  '.category-performance',
  '.check-summary',
  '.top-issues',
];

export function hasDashboardIntro(main) {
  return DASHBOARD_AUTHOR_SELECTORS.some((selector) => main.querySelector(selector));
}

function getDashboardMotionTargets(main) {
  return DASHBOARD_BLOCK_SELECTORS
    .map((selector) => main.querySelector(selector))
    .filter(Boolean);
}

function getOverviewMotionTarget(main) {
  return main.querySelector('.overview-grid');
}

function getSummaryMotionTarget(main) {
  return main.querySelector('.summary-grid');
}

function getCategoryPerformanceMotionTarget(main) {
  return main.querySelector('.category-performance-grid');
}

function getProgramStatusMotionTarget(main) {
  return main.querySelector('.program-status-grid');
}

function getCheckSummaryMotionTarget(main) {
  return main.querySelector('.check-summary-grid');
}

function waitForAnimationFrame() {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
}

function waitForTimeout(timeoutMs) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, timeoutMs);
  });
}

export async function runDashboardIntro(main) {
  const motionTargets = getDashboardMotionTargets(main);
  const overviewTarget = getOverviewMotionTarget(main);
  const summaryTarget = getSummaryMotionTarget(main);
  const categoryPerformanceTarget = getCategoryPerformanceMotionTarget(main);
  const programStatusTarget = getProgramStatusMotionTarget(main);
  const checkSummaryTarget = getCheckSummaryMotionTarget(main);
  const overviewBlock = overviewTarget?.querySelector('.cmp-overview');

  if (!motionTargets.length || !overviewTarget || !overviewBlock) {
    document.body.classList.remove('dashboard-intro-pending');
    return;
  }

  if (shouldDisableDashboardMotion() || !overviewTarget.animate) {
    document.body.classList.remove('dashboard-intro-pending');
    document.body.classList.add('dashboard-intro-complete');
    return;
  }

  motionTargets.forEach((target) => target.classList.add('dashboard-intro-target'));
  overviewTarget.classList.add('dashboard-intro-hero');
  document.body.classList.add('dashboard-intro-active');

  await waitForAnimationFrame();

  const overviewRect = overviewTarget.getBoundingClientRect();
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;
  const overviewCenterX = overviewRect.left + (overviewRect.width / 2);
  const overviewCenterY = overviewRect.top + (overviewRect.height / 2);
  const deltaX = centerX - overviewCenterX;
  const deltaY = centerY - overviewCenterY;

  const overviewSettleAnimation = overviewTarget.animate(
    [
      {
        opacity: 0,
        transform: `translate(${deltaX}px, ${deltaY}px) scale(1.85)`,
        filter: 'blur(12px)',
      },
      {
        opacity: 1,
        transform: `translate(${deltaX}px, ${deltaY}px) scale(2)`,
        filter: 'blur(0)',
      },
    ],
    {
      duration: 520,
      easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
      fill: 'both',
    },
  );

  await overviewSettleAnimation.finished;

  const overviewIntroComplete = new Promise((resolve) => {
    overviewBlock.addEventListener('overview:intro-complete', () => resolve(), { once: true });
  });

  overviewBlock.dispatchEvent(new CustomEvent('dashboard:intro-overview-start', {
    bubbles: true,
  }));

  await Promise.race([
    overviewIntroComplete,
    waitForTimeout(5600),
  ]);

  await waitForTimeout(100);

  const overviewMoveAnimation = overviewTarget.animate(
    [
      {
        opacity: 1,
        transform: `translate(${deltaX}px, ${deltaY}px) scale(2)`,
        filter: 'blur(0)',
      },
      {
        opacity: 1,
        transform: `translate(${Math.round(deltaX * 0.2)}px, ${Math.round(deltaY * 0.2)}px) scale(1.2)`,
        filter: 'blur(0)',
        offset: 0.68,
      },
      {
        opacity: 1,
        transform: 'translate(0, 0) scale(0.965)',
        filter: 'blur(0)',
        offset: 0.88,
      },
      {
        opacity: 1,
        transform: 'translate(0, 0) scale(1)',
        filter: 'blur(0)',
      },
    ],
    {
      duration: 1520,
      easing: 'cubic-bezier(0.2, 0.9, 0.24, 1)',
      fill: 'both',
    },
  );

  await overviewMoveAnimation.finished;
  overviewBlock.dispatchEvent(new CustomEvent('dashboard:intro-overview-landed', {
    bubbles: true,
  }));

  if (summaryTarget) {
    const summaryBlock = summaryTarget.querySelector('.cmp-summary');
    const summaryRect = summaryTarget.getBoundingClientRect();
    const summaryCenterX = summaryRect.left + (summaryRect.width / 2);
    const summaryCenterY = summaryRect.top + (summaryRect.height / 2);
    const summaryDeltaX = overviewCenterX - summaryCenterX;
    const summaryDeltaY = overviewCenterY - summaryCenterY;
    const summaryAnimationDuration = 920;
    const summaryAnimation = summaryTarget.animate(
      [
        {
          opacity: 0,
          transform: `translate(${summaryDeltaX}px, ${summaryDeltaY}px) scale(0.94)`,
          filter: 'blur(10px)',
        },
        {
          opacity: 1,
          transform: 'translate(0, 0) scale(1.02)',
          filter: 'blur(0)',
          offset: 0.84,
        },
        {
          opacity: 1,
          transform: 'translate(0, 0) scale(1)',
          filter: 'blur(0)',
        },
      ],
      {
        duration: summaryAnimationDuration,
        delay: 120,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
        fill: 'both',
      },
    );

    if (summaryBlock) {
      window.setTimeout(() => {
        summaryBlock.dispatchEvent(new CustomEvent('dashboard:intro-summary-start', {
          bubbles: true,
        }));
      }, 120 + Math.round(summaryAnimationDuration * 0.22));
    }

    await summaryAnimation.finished;
  }

  if (categoryPerformanceTarget) {
    const categoryPerformanceBlock = categoryPerformanceTarget.querySelector('.cmp-category-performance');
    const categoryPerformanceAnimationDuration = 960;
    const categoryPerformanceAnimation = categoryPerformanceTarget.animate(
      [
        {
          opacity: 0,
          transform: 'translateY(56px) scale(0.97)',
          filter: 'blur(14px)',
        },
        {
          opacity: 1,
          transform: 'translateY(0) scale(1.015)',
          filter: 'blur(0)',
          offset: 0.84,
        },
        {
          opacity: 1,
          transform: 'translateY(0) scale(1)',
          filter: 'blur(0)',
        },
      ],
      {
        duration: categoryPerformanceAnimationDuration,
        delay: 140,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        fill: 'both',
      },
    );

    if (categoryPerformanceBlock) {
      window.setTimeout(() => {
        categoryPerformanceBlock.dispatchEvent(new CustomEvent('dashboard:intro-category-performance-start', {
          bubbles: true,
        }));
      }, 140 + Math.max(categoryPerformanceAnimationDuration - 1000, 0));
    }

    await categoryPerformanceAnimation.finished;
  }

  const rightToLeftTargets = [programStatusTarget, checkSummaryTarget].filter(Boolean);
  const rightToLeftAnimations = rightToLeftTargets.map((target, index) => target.animate(
    [
      {
        opacity: 0,
        transform: 'translateX(42px) scale(0.985)',
        filter: 'blur(10px)',
      },
      {
        opacity: 1,
        transform: 'translateX(0) scale(1.018)',
        filter: 'blur(0)',
        offset: 0.82,
      },
      {
        opacity: 1,
        transform: 'translateX(0) scale(1)',
        filter: 'blur(0)',
      },
    ],
    {
      duration: 700,
      delay: 90 + (index * 70),
      easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
      fill: 'both',
    },
  ));

  await Promise.allSettled(rightToLeftAnimations.map((animation) => animation.finished));

  const supportingAnimations = motionTargets
    .filter((target) => (
      target !== overviewTarget
      && target !== summaryTarget
      && target !== categoryPerformanceTarget
      && target !== programStatusTarget
      && target !== checkSummaryTarget
    ))
    .map((target, index) => target.animate(
      [
        {
          opacity: 0,
          transform: 'translateY(34px) scale(0.985)',
          filter: 'blur(10px)',
        },
        {
          opacity: 1,
          transform: 'translateY(0) scale(1.015)',
          filter: 'blur(0)',
          offset: 0.82,
        },
        {
          opacity: 1,
          transform: 'translateY(0) scale(1)',
          filter: 'blur(0)',
        },
      ],
      {
        duration: 820,
        delay: 320 + (index * 90),
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
        fill: 'both',
      },
    ));

  await Promise.allSettled(supportingAnimations.map((animation) => animation.finished));

  overviewTarget.classList.remove('dashboard-intro-hero');
  document.body.classList.remove('dashboard-intro-pending', 'dashboard-intro-active');
  document.body.classList.add('dashboard-intro-complete');
}
