import {
  getReportParamsFromUrl,
  fetchReportMetrics,
  setUIAuditMetrics,
  setLocalStorageItem,
} from '../../scripts/utils.js';
import { decorateIcons } from '../../scripts/aem.js';

function getCurrentQuarter() {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return 'q2';
  if (month >= 5 && month <= 7) return 'q3';
  if (month >= 8 && month <= 10) return 'q4';
  return 'q1';
}

async function fetchAndStoreReport(projectFolder) {
  const { year, quarter } = getReportParamsFromUrl({ quarter: getCurrentQuarter() });

  const metricsData = await fetchReportMetrics(projectFolder, year, quarter);

  if (metricsData) {
    console.log(metricsData)
    setLocalStorageItem('ui-audit-metrics', metricsData);
    setUIAuditMetrics(metricsData);
  }
}

async function handleProjectData(dropdownContainer, projectListLink) {
  const buttonText = dropdownContainer.querySelector('.dropdown__selected-text');
  const list = dropdownContainer.querySelector('.dropdown__list');
  try {
    const resp = await fetch(projectListLink);
    if (!resp.ok) throw new Error('Failed to fetch projects');
    const json = await resp.json();
    const projects = Array.isArray(json) ? json : (json.data || []);

    const { project: urlProject } = getReportParamsFromUrl();
    const activeProject = projects.find((p) => {
      const folder = (p.Folder || p.folder || '').toLowerCase();
      return folder === (urlProject || '').toLowerCase();
    }) || projects[0];

    const activeFolder = activeProject ? (activeProject.Folder || activeProject.folder) : '';
    if (activeProject) {
      buttonText.textContent = activeProject.Title || activeProject.title;
    }

    list.innerHTML = '';
    projects.forEach((proj) => {
      const folder = proj.Folder || proj.folder;
      const title = proj.Title || proj.title;
      const li = document.createElement('li');
      const isSelected = folder.toLowerCase() === (activeFolder || '').toLowerCase();

      li.className = isSelected ? 'dropdown__option is-selected' : 'dropdown__option';
      li.innerHTML = `
        <span class="option-text">${title}</span>
        <span class="icon icon-check"></span>
      `;
      li.addEventListener('click', (e) => {
        e.stopPropagation();
        const url = new URL(window.location.href);
        url.searchParams.set('project', folder.toLowerCase());
        window.location.href = url.href;
      });
      list.append(li);
    });

    await decorateIcons(list);
  } catch (err) {
    buttonText.textContent = 'Select Project';
  }
}

function createDropdown(className, defaultValue, options, onSelect) {
  const dropdown = document.createElement('div');
  dropdown.className = `header__custom-dropdown ${className}`;
  dropdown.innerHTML = `
    <button class="dropdown__button" type="button">
      <span class="dropdown__selected-text">${defaultValue}</span>
      <span class="icon icon-chevron-down"></span>
    </button>
    <div class="dropdown__menu"><ul class="dropdown__list"></ul></div>`;

  const list = dropdown.querySelector('.dropdown__list');
  options.forEach((opt) => {
    const li = document.createElement('li');
    const isSelected = String(opt.value).toLowerCase() === String(defaultValue).toLowerCase();
    li.className = isSelected ? 'dropdown__option is-selected' : 'dropdown__option';
    li.innerHTML = `
      <span class="option-text">${opt.label}</span>
      <span class="icon icon-check"></span>
    `;
    li.addEventListener('click', (e) => {
      e.stopPropagation();
      onSelect(opt.value);
    });
    list.append(li);
  });

  dropdown.querySelector('.dropdown__button').addEventListener('click', (e) => {
    e.stopPropagation();
    // Close other dropdowns
    document.querySelectorAll('.header__custom-dropdown').forEach((d) => {
      if (d !== dropdown) d.classList.remove('is-open');
    });
    dropdown.classList.toggle('is-open');
  });

  return dropdown;
}

export default async function decorate(block) {
  const section = block.closest('.section');
  if (section) section.classList.add('audit-header-container', 'full-width-section', 'period-selector');

  const rows = [...block.children];
  const logoContent = rows[0]?.querySelector('p, div')?.textContent.trim();
  const logoName = logoContent.replace(/:/g, '');
  const authoredTitle = (rows[1]?.querySelector('h1, h2, h3, p')?.textContent || '').replace(/^#\s*/, '');
  const authoredMeta = rows[2]?.querySelector('p')?.textContent || '';
  const projectListLink = rows[3]?.querySelector('a')?.href;
  const exportText = rows[4]?.querySelector('p, div')?.textContent || 'Export';

  block.textContent = '';
  block.className = 'cmp-audit-header';

  // Left Side
  const left = document.createElement('div');
  left.className = 'header__left';
  const logoBox = document.createElement('div');
  logoBox.className = 'header__logo';
  const logoIcon = document.createElement('span');
  logoIcon.className = `icon icon-${logoName} header__logo-img`;
  logoBox.append(logoIcon);
  const info = document.createElement('div');
  info.className = 'header__info';
  const h2 = document.createElement('h2');
  h2.className = 'header__title';
  h2.textContent = authoredTitle;
  const p = document.createElement('p');
  p.className = 'header__meta';
  p.textContent = authoredMeta;
  info.append(h2, p);
  left.append(logoBox, info);

  // Right Side
  const right = document.createElement('div');
  right.className = 'header__right';
  const actions = document.createElement('div');
  actions.className = 'header__actions';

  const { project: urlProject, year: urlYear, quarter: urlQuarter } = getReportParamsFromUrl();

  const projectDropdown = document.createElement('div');
  projectDropdown.className = 'header__custom-dropdown dropdown-project';
  projectDropdown.innerHTML = `
    <button class="dropdown__button" type="button">
      <span class="dropdown__selected-text">Loading...</span>
      <span class="icon icon-chevron-down"></span>
    </button>
    <div class="dropdown__menu"><ul class="dropdown__list"></ul></div>`;

  projectDropdown.querySelector('.dropdown__button').addEventListener('click', (e) => {
    e.stopPropagation();
    document.querySelectorAll('.header__custom-dropdown').forEach((d) => {
      if (d !== projectDropdown) d.classList.remove('is-open');
    });
    projectDropdown.classList.toggle('is-open');
  });

  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear - 1, currentYear - 2].map((y) => ({ label: String(y), value: String(y) }));
  const yearDropdown = createDropdown('dropdown-year', urlYear, years, (val) => {
    const url = new URL(window.location.href);
    url.searchParams.set('year', val);
    window.location.href = url.href;
  });

  const quarters = ['Q1', 'Q2', 'Q3', 'Q4'].map((q) => ({ label: q, value: q.toLowerCase() }));
  const quarterDropdown = createDropdown('dropdown-quarter', urlQuarter.toUpperCase(), quarters, (val) => {
    const url = new URL(window.location.href);
    url.searchParams.set('quarter', val.toLowerCase());
    window.location.href = url.href;
  });

  const exportBtn = document.createElement('button');
  exportBtn.className = 'header__btn-export';
  exportBtn.setAttribute('title', exportText);
  exportBtn.innerHTML = `<span class="icon icon-calendar"></span> <span>${exportText}</span>`;

  const themeBtn = document.createElement('button');
  themeBtn.className = 'header__btn-theme';

  const updateThemeIcon = (theme, decorate = true) => {
    themeBtn.innerHTML = `<span class="icon icon-${theme === 'dark' ? 'sun' : 'moon'}"></span>`;
    if (decorate) decorateIcons(themeBtn);
  };

  const savedTheme = localStorage.getItem('page-theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme, false);

  actions.append(projectDropdown, yearDropdown, quarterDropdown, exportBtn, themeBtn);
  right.append(actions);
  block.append(left, right);

  if (projectListLink) handleProjectData(projectDropdown, projectListLink);

  await decorateIcons(block);

  document.addEventListener('click', () => {
    document.querySelectorAll('.header__custom-dropdown').forEach((d) => d.classList.remove('is-open'));
  });

  themeBtn.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const next = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    setLocalStorageItem('page-theme', next);
    updateThemeIcon(next);
  });

  if (urlProject) await fetchAndStoreReport(urlProject);
}
