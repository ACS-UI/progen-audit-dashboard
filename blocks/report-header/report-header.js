import { loadScript, decorateIcons } from '../../scripts/aem.js';
import { getUIAuditMetrics, UI_AUDIT_METRICS_UPDATED_EVENT } from '../../scripts/utils.js';

const PDF_LIB_URL = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';

async function downloadReportAsPDF() {
  const metrics = getUIAuditMetrics();
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
    const metrics = getUIAuditMetrics();
    const data = metrics?.data || [];
    const findVal = (key) => data.find((item) => item.key === key)?.value || '';

    const projectName = findVal('metadata.projectName');
    const version = findVal('metadata.checklistVersion');
    const date = new Date().toLocaleDateString('en-GB');

    const rawStatus = findVal('overallStatus.ragRating');

    const normalizedStatus = rawStatus
      ? rawStatus.toString().trim().toLowerCase()
      : '';

    const isValidStatus = ['green', 'amber', 'red'].includes(normalizedStatus);
    container.replaceChildren();

    const headerMain = document.createElement('div');
    headerMain.className = 'report-header-main';

    const headerLeft = document.createElement('div');
    headerLeft.className = 'report-header-left';

    const headerTitle = document.createElement('h1');
    headerTitle.className = 'report-header-title';
    headerTitle.setAttribute('aria-label', `Project name: ${projectName}`);
    headerTitle.textContent = projectName;

    if (isValidStatus) {
      const statusLabelTextMap = {
        green: 'Green',
        amber: 'Amber',
        red: 'Red',
      };

      const projectBadge = document.createElement('span');
      projectBadge.className = `project-status-badge status-${normalizedStatus}`;
      projectBadge.setAttribute('role', 'status');
      projectBadge.setAttribute('aria-label', `Project status: ${statusLabelTextMap[normalizedStatus]}`);
      projectBadge.textContent = statusLabelTextMap[normalizedStatus];

      headerTitle.appendChild(projectBadge);
    }
    const headerMeta = document.createElement('div');
    headerMeta.className = 'report-header-meta';
    headerMeta.textContent = `${auditLabel} • ${date} | Checklist Version: ${version}`;

    headerLeft.append(headerTitle, headerMeta);

    const headerRight = document.createElement('div');
    headerRight.className = 'report-header-right';

    const headerButton = document.createElement('button');
    headerButton.className = 'report-header-button';
    headerButton.setAttribute('aria-label', buttonLabel);
    headerButton.textContent = buttonLabel;
    headerButton.addEventListener('click', downloadReportAsPDF);
    headerMeta.append(headerButton);
    headerMain.append(headerLeft, headerRight);
    container.append(headerMain);
    decorateIcons(container);
  };

  block.replaceChildren(container);
  render();

  window.addEventListener(UI_AUDIT_METRICS_UPDATED_EVENT, render);
  block.addEventListener('disconnected', () => {
    window.removeEventListener(UI_AUDIT_METRICS_UPDATED_EVENT, render);
  });
}
