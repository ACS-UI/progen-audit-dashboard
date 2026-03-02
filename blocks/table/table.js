import { onLocalStorageKeyChange } from '../../scripts/utils.js';

const COLUMNS = ['Severity', 'ID', 'Description', 'Location', 'Category'];
const COMPONENTS_COLUMNS = ['Component', 'Failed Checks', 'Critical Failures', 'Health'];

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

function getMetricsByKeyFromStorage() {
  const metricsByKey = {};
  let storedMetrics;

  try {
    storedMetrics = window.localStorage.getItem('ui-audit-metrics');
  } catch (e) {
    storedMetrics = null;
  }

  if (!storedMetrics) return metricsByKey;

  let parsedMetrics;
  try {
    parsedMetrics = JSON.parse(storedMetrics);
  } catch (e) {
    parsedMetrics = null;
  }

  const dataArray = Array.isArray(parsedMetrics) ? parsedMetrics : parsedMetrics?.data;
  if (!Array.isArray(dataArray)) return metricsByKey;

  dataArray.forEach((item) => {
    if (item?.key && item?.value !== undefined) {
      metricsByKey[item.key] = item.value;
    }
  });

  return metricsByKey;
}

function getTopIssuesFromStorage(metricsByKey) {
  const parsedCount = parseInt(metricsByKey['topIssues.count'], 10);
  const countFromStorage = Number.isNaN(parsedCount) ? 0 : parsedCount;
  const indexedKeys = Object.keys(metricsByKey)
    .map((key) => {
      const match = key.match(/^topIssues\.(\d+)\./);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter((index) => index > 0);
  const maxIndexedRow = indexedKeys.length ? Math.max(...indexedKeys) : 0;
  const rowCount = Math.max(countFromStorage, maxIndexedRow);
  const rows = [];

  for (let index = 1; index <= rowCount; index += 1) {
    const baseKey = `topIssues.${index}`;
    const severity = metricsByKey[`${baseKey}.severity`] || '';
    const id = metricsByKey[`${baseKey}.id`] || '';
    const description = metricsByKey[`${baseKey}.description`] || '';
    const standard = metricsByKey[`${baseKey}.subcategory`] || '';
    const locationFile = metricsByKey[`${baseKey}.location.file`] || '';
    const locationLine = metricsByKey[`${baseKey}.location.line`] || '';
    const category = metricsByKey[`${baseKey}.category`] || '';

    const hasAnyValue = severity
      || id
      || description
      || standard
      || locationFile
      || locationLine
      || category;

    if (hasAnyValue) {
      rows.push({
        severity,
        id,
        description,
        standard,
        location: {
          file: locationFile,
          line: locationLine,
        },
        category,
      });
    }
  }

  return rows;
}

function getComponentsFromStorage(metricsByKey) {
  const parsedCount = parseInt(metricsByKey['componentsRequiringAttention.count'], 10);
  const countFromStorage = Number.isNaN(parsedCount) ? 0 : parsedCount;
  const indexedKeys = Object.keys(metricsByKey)
    .map((key) => {
      const match = key.match(/^componentsRequiringAttention\.(\d+)\./);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter((index) => index > 0);
  const maxIndexedRow = indexedKeys.length ? Math.max(...indexedKeys) : 0;
  const rowCount = Math.max(countFromStorage, maxIndexedRow);
  const rows = [];

  for (let index = 1; index <= rowCount; index += 1) {
    const baseKey = `componentsRequiringAttention.${index}`;
    const component = metricsByKey[`${baseKey}.name`] || '';
    const path = metricsByKey[`${baseKey}.path`] || '';
    const failedChecks = metricsByKey[`${baseKey}.failedChecks`] || '';
    const criticalFailures = metricsByKey[`${baseKey}.criticalFailures`] || '';
    const health = metricsByKey[`${baseKey}.healthScore`] || '';

    const hasAnyValue = component || path || failedChecks || criticalFailures || health;

    if (hasAnyValue) {
      rows.push({
        component,
        path,
        failedChecks,
        criticalFailures,
        health,
      });
    }
  }

  return rows;
}

function renderTopIssuesRows(tbody, rows) {
  tbody.replaceChildren();

  rows.forEach((row) => {
    const tr = document.createElement('tr');
    tr.append(createSeverityCell(row.severity));
    tr.append(createCell('td', row.id));
    tr.append(createDescriptionCell(row.description, row.standard));
    tr.append(createLocationCell(row.location.file, row.location.line));
    tr.append(createCategoryCell(row.category));
    tbody.append(tr);
  });
}

function renderComponentRows(tbody, rows) {
  tbody.replaceChildren();

  rows.forEach((row) => {
    const tr = document.createElement('tr');
    tr.append(createComponentCell(row.component, row.path));
    tr.append(createMetricCell(row.failedChecks, 'failed-checks'));
    tr.append(createMetricCell(row.criticalFailures, 'critical-failures'));
    tr.append(createHealthCell(Number(row.health)));
    tbody.append(tr);
  });
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

  const applyMetrics = () => {
    const metricsByKey = getMetricsByKeyFromStorage();

    if (isComponentsVariation) {
      const rows = getComponentsFromStorage(metricsByKey);
      renderComponentRows(tbody, rows);
    } else {
      const rows = getTopIssuesFromStorage(metricsByKey);
      renderTopIssuesRows(tbody, rows);
    }
  };

  applyMetrics();

  const unsubscribe = onLocalStorageKeyChange('ui-audit-metrics', () => {
    applyMetrics();
  });

  block.addEventListener('disconnected', () => {
    unsubscribe();
  });

  table.append(thead, tbody);
  container.append(table);
  block.replaceChildren(container);
}
