import { createOptimizedPicture } from '../../scripts/aem.js';
import { getUIAuditMetrics, getScoreByKeyFromMetrics, UI_AUDIT_METRICS_UPDATED_EVENT } from '../../scripts/utils.js';

const SUMMARY_KEYS = [
  'summary.totalChecks',
  'summary.passed',
  'summary.failed',
  'summary.criticalFailed',
  'summary.notApplicable',
];

function buildCardsList(block) {
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
  ul.querySelectorAll('picture > img').forEach((img) => {
    img.closest('picture').replaceWith(
      createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]),
    );
  });

  return ul;
}

function renderSummaryCards(ul, scoreByKey) {
  const cards = [...ul.querySelectorAll('li')];
  cards.forEach((card, index) => {
    const summaryKey = SUMMARY_KEYS[index];
    const summaryValue = scoreByKey[summaryKey];
    if (summaryValue === undefined || summaryValue === null) return;

    const cardBody = card.querySelector('.cards-card-body');

    const existingSummaryValue = card.querySelector('.cards-summary-value');
    if (existingSummaryValue) existingSummaryValue.remove();

    const summaryValueEl = document.createElement('span');
    summaryValueEl.className = 'cards-summary-value';
    summaryValueEl.textContent = summaryValue;

    const imageContainer = card.querySelector('.cards-card-image');
    if (imageContainer) {
      imageContainer.insertAdjacentElement('afterend', summaryValueEl);
    } else if (cardBody) {
      const picture = cardBody.querySelector('picture');
      if (picture) {
        const pictureWrapper = picture.closest('p') || picture;
        pictureWrapper.insertAdjacentElement('afterend', summaryValueEl);
      } else {
        cardBody.prepend(summaryValueEl);
      }
    }
  });
}

async function renderOverallScoreCards(block) {
  // block.innerHTML = '';
  console.log(block);
  block.classList.add('cmp-card');
}

export default async function decorate(block) {
  const isOverallScoresBlock = !!block.classList.contains('overall-scores');
  const isSummaryBlock = !!block.classList.contains('summary');

  const applyMetrics = async () => {
    const scoreByKey = getScoreByKeyFromMetrics(getUIAuditMetrics());

    if (isSummaryBlock) {
      const ul = buildCardsList(block);
      block.replaceChildren(ul);
      renderSummaryCards(ul, scoreByKey);
    }

    if (isOverallScoresBlock) {
      await renderOverallScoreCards(block);
    }
  };

  // On render: use data from window if present, then listen for custom event
  await applyMetrics();

  const handleMetricsUpdate = () => {
    applyMetrics();
  };
  window.addEventListener(UI_AUDIT_METRICS_UPDATED_EVENT, handleMetricsUpdate);

  block.addEventListener('disconnected', () => {
    window.removeEventListener(UI_AUDIT_METRICS_UPDATED_EVENT, handleMetricsUpdate);
  });
}
