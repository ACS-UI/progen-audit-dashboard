import { loadScript } from '../../scripts/aem.js';
import { onLocalStorageKeyChange } from '../../scripts/utils.js';

const STORAGE_KEY = 'ui-audit-metrics';
const PDF_LIB_URL = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';

function getMetricsFromStorage() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

async function downloadReportAsPDF() {
  const metrics = getMetricsFromStorage();
  const data = metrics?.data || [];
  const projectName = data.find((item) => item.key === 'metadata.projectName')?.value || 'Audit_Report';
  const fileName = `${projectName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;

  document.body.classList.add('pdf-export-mode');

  try {
    await loadScript(PDF_LIB_URL);

    const element = document.querySelector('main');
    const options = {
      margin: [10, 0, 10, 0],
      filename: `${fileName}.pdf`,
      image: { type: 'jpeg', quality: 1 },
      html2canvas: {
        scale: 3,
        useCORS: true,
        letterRendering: true,
        logging: false,
        windowWidth: 1100,
        x: 0,
        y: 0,
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
    };

    await window.html2pdf().set(options).from(element).save();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('PDF Export Error:', err);
  } finally {
    document.body.classList.remove('pdf-export-mode');
  }
}

function parseAuthoredLabels(block) {
  const rows = [...block.children];
  let auditLabel = 'Audit';
  let buttonLabel = 'Download Report';

  const firstCell = rows[0]?.querySelector('div:last-child');

  if (rows.length >= 2) {
    auditLabel = rows[0].querySelector('div:last-child')?.textContent.trim() || auditLabel;
    buttonLabel = rows[1].querySelector('div:last-child')?.textContent.trim() || buttonLabel;
  } else if (firstCell) {
    const lines = firstCell.innerText.split('\n').map((t) => t.trim()).filter(Boolean);
    [auditLabel, buttonLabel] = lines;
  }

  return { auditLabel, buttonLabel };
}

export default async function decorate(block) {
  const { auditLabel, buttonLabel } = parseAuthoredLabels(block);
  const container = document.createElement('div');
  container.className = 'report-header';

  const render = () => {
    const metrics = getMetricsFromStorage();
    const data = metrics?.data || [];
    const findVal = (key) => data.find((item) => item.key === key)?.value || '';

    const projectName = findVal('metadata.projectName');
    const commitId = findVal('metadata.commitId');
    const version = findVal('metadata.checklistVersion');
    const date = new Date().toLocaleDateString('en-GB');

    container.innerHTML = `
      <div class="report-header__main">
        <div class="report-header__left">
          <h1 class="report-header__title">${projectName}</h1>
          <div class="report-header__meta">
            ${auditLabel} • ${date} ${commitId ? `• Commit Id - ${commitId}` : ''}
          </div>
        </div>
        <div class="report-header__right">
          <div class="report-header__version">
            <span class="report-header__label">Checklist Version</span>
            <span class="report-header__value">${version}</span>
          </div>
          <button class="report-header__button" aria-label="${buttonLabel}">
            ${buttonLabel}
          </button>
        </div>
      </div>
    `;

    const downloadBtn = container.querySelector('.report-header__button');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', downloadReportAsPDF);
    }
  };

  block.replaceChildren(container);
  render();

  onLocalStorageKeyChange(STORAGE_KEY, render);
}
