const MOCK_AUDIT_DATA = [
  {
    severity: 'Critical',
    id: 'A11Y-001',
    description: 'Missing alt text on product images',
    standard: 'WCAG 2.1 AA',
    location: {
      file: 'ProductCard.tsx',
      line: 45,
    },
    category: 'Accessibility',
  },
  {
    severity: 'Critical',
    id: 'PERF-003',
    description: 'Large JavaScript bundle (>500KB)',
    standard: 'Core Web Vitals',
    location: {
      file: 'App.tsx',
      line: 1,
    },
    category: 'Performance',
  },
  {
    severity: 'Critical',
    id: 'A11Y-008',
    description: 'Modal dialog not keyboard accessible',
    standard: 'Keyboard Navigation',
    location: {
      file: 'Modal.tsx',
      line: 23,
    },
    category: 'Accessibility',
  },
  {
    severity: 'High',
    id: 'CODE-012',
    description: 'High cyclomatic complexity in checkout function',
    standard: 'Complexity',
    location: {
      file: 'checkout.ts',
      line: 78,
    },
    category: 'Code Quality',
  },
  {
    severity: 'High',
    id: 'UX-005',
    description: 'Missing error messages on form inputs',
    standard: 'Form Validation',
    location: {
      file: 'CheckoutForm.tsx',
      line: 34,
    },
    category: 'UX',
  },
  {
    severity: 'Quick Win',
    id: 'A11Y-004',
    description: 'Button text has insufficient contrast',
    standard: 'Color Contrast',
    location: {
      file: 'Button.tsx',
      line: 12,
    },
    category: 'Accessibility',
  },
  {
    severity: 'Quick Win',
    id: 'SEO-002',
    description: 'Missing meta description',
    standard: 'Meta Tags',
    location: {
      file: 'index.html',
      line: 6,
    },
    category: 'SEO',
  },
];

const COLUMNS = ['Severity', 'ID', 'Description', 'Location', 'Category'];
const COMPONENTS_COLUMNS = ['Component', 'Failed Checks', 'Critical Failures', 'Health'];
const MOCK_COMPONENTS_DATA = [
  {
    component: 'ProductCard.tsx',
    path: '/src/components/ProductCard.tsx',
    failedChecks: 12,
    criticalFailures: 3,
    health: 10,
  },
  {
    component: 'CheckoutForm.tsx',
    path: '/src/components/CheckoutForm.tsx',
    failedChecks: 9,
    criticalFailures: 2,
    health: 35,
  },
  {
    component: 'Modal.tsx',
    path: '/src/components/Modal.tsx',
    failedChecks: 7,
    criticalFailures: 1,
    health: 55,
  },
];

function getSeverityClassName(value) {
  return `table-severity-${value.toLowerCase().replace(/\s+/g, '-')}`;
}

function getCategoryClassName(value) {
  return `table-category-${value.toLowerCase().replace(/\s+/g, '-')}`;
}

function createCell(tagName, text, className = '') {
  const cell = document.createElement(tagName);
  if (className) cell.className = className;
  cell.textContent = text;
  return cell;
}

function createSeverityCell(severity) {
  const cell = document.createElement('td');
  cell.className = `table-severity ${getSeverityClassName(severity)}`;

  const pill = document.createElement('span');
  pill.className = 'table-severity-pill';
  const label = document.createElement('span');
  label.className = 'table-severity-label';
  label.textContent = severity;
  pill.append(label);

  cell.append(pill);
  return cell;
}

function createCategoryCell(category) {
  const cell = document.createElement('td');
  cell.className = `table-category ${getCategoryClassName(category)}`;

  const pill = document.createElement('span');
  pill.className = 'table-category-pill';
  pill.textContent = category;

  cell.append(pill);
  return cell;
}

function createDescriptionCell(description, standard) {
  const cell = document.createElement('td');
  cell.className = 'table-description';

  const descriptionText = document.createElement('div');
  descriptionText.className = 'table-description-text';
  descriptionText.textContent = description;

  const standardText = document.createElement('div');
  standardText.className = 'table-description-standard';
  standardText.textContent = standard;

  cell.append(descriptionText, standardText);
  return cell;
}

function createLocationCell(file, line) {
  const cell = document.createElement('td');
  cell.className = 'table-location';

  const fileText = document.createElement('div');
  fileText.className = 'table-location-file';
  const fileLabel = document.createElement('span');
  fileLabel.className = 'table-location-file-label';
  fileLabel.textContent = file;
  fileText.append(fileLabel);

  const lineText = document.createElement('div');
  lineText.className = 'table-location-line';
  lineText.textContent = `Line ${line}`;

  cell.append(fileText, lineText);
  return cell;
}

function createComponentCell(component, path) {
  const cell = document.createElement('td');
  cell.className = 'table-component';

  const content = document.createElement('div');
  content.className = 'table-component-content';

  const componentName = document.createElement('div');
  componentName.className = 'table-component-name';
  componentName.textContent = component;

  const componentPath = document.createElement('div');
  componentPath.className = 'table-component-path';
  componentPath.textContent = path;

  content.append(componentName, componentPath);
  cell.append(content);
  return cell;
}

function createMetricCell(value, type) {
  const cell = document.createElement('td');
  cell.className = `table-metric table-metric-${type}`;

  const metricValue = document.createElement('span');
  metricValue.className = 'table-metric-value';
  metricValue.textContent = String(value);

  cell.append(metricValue);
  return cell;
}

function createHealthCell(health) {
  const cell = document.createElement('td');
  cell.className = 'table-health';

  const meter = document.createElement('div');
  meter.className = 'table-health-meter';
  meter.style.setProperty('--health', String(health));
  let healthColor = '#E7000B';
  if (health > 75) {
    healthColor = '#2B7FFF';
  } else if (health > 50) {
    healthColor = '#F0B100';
  }
  meter.style.setProperty('--health-color', healthColor);

  const track = document.createElement('span');
  track.className = 'table-health-track';

  const value = document.createElement('span');
  value.className = 'table-health-value';
  value.textContent = String(health);

  meter.append(track, value);
  cell.append(meter);
  return cell;
}

export default function decorate(block) {
  const container = document.createElement('div');
  container.className = 'table-container';

  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');
  const isComponentsVariation = block.classList.contains('components');

  const headerRow = document.createElement('tr');
  const columns = isComponentsVariation ? COMPONENTS_COLUMNS : COLUMNS;
  columns.forEach((column) => {
    headerRow.append(createCell('th', column));
  });
  thead.append(headerRow);

  if (isComponentsVariation) {
    MOCK_COMPONENTS_DATA.forEach((row) => {
      const tr = document.createElement('tr');
      tr.append(createComponentCell(row.component, row.path));
      tr.append(createMetricCell(row.failedChecks, 'failed-checks'));
      tr.append(createMetricCell(row.criticalFailures, 'critical-failures'));
      tr.append(createHealthCell(row.health));
      tbody.append(tr);
    });
  } else {
    MOCK_AUDIT_DATA.forEach((row) => {
      const tr = document.createElement('tr');

      const severityCell = createSeverityCell(row.severity);
      tr.append(severityCell);
      tr.append(createCell('td', row.id));
      tr.append(createDescriptionCell(row.description, row.standard));
      tr.append(createLocationCell(row.location.file, row.location.line));
      tr.append(createCategoryCell(row.category));

      tbody.append(tr);
    });
  }

  table.append(thead, tbody);
  container.append(table);
  block.replaceChildren(container);
}
