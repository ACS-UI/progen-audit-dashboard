function getHeadingMarkup(block) {
  const heading = block.querySelector('h1, h2, h3, h4, h5, h6');

  if (!heading) {
    return '<h3 id="top-issues">Top issues</h3>';
  }

  return heading.cloneNode(true).outerHTML;
}

function getRowCells(row) {
  return [...row.children]
    .map((cell) => cell.textContent?.trim())
    .filter(Boolean);
}

function getFallbackIssues() {
  return [
    {
      title: 'Semantic-to-div ratio above threshold; pages with >70% generic containers (div/span) flagged',
      details: 'Severity: Critical · Mandatory: Yes · Audit: Code Audit · Phase: Development · Group: HTML Semantics & Structure · Subgroup: Semantics · Evidence: .eslintrc.cjs',
    },
    {
      title: 'Correct heading hierarchy maintained',
      details: 'Severity: Critical · Mandatory: Yes · Audit: Code Audit · Phase: Development · Group: HTML Semantics & Structure · Subgroup: Semantics · Evidence: package.json, .eslintrc.cjs',
    },
    {
      title: 'All inputs have associated labels',
      details: 'Severity: Critical · Mandatory: Yes · Audit: Code Audit · Phase: Development · Group: HTML Forms & Inputs · Subgroup: Forms · Evidence: blocks/browse-filters/browse-filters.js (constructKeywordSearchEl, addLabel)',
    },
    {
      title: 'Error messages programmatically associated with inputs via aria-describedby or aria-errormessage',
      details: 'Severity: Critical · Mandatory: Yes · Audit: Code Audit · Phase: Development · Group: HTML Forms & Inputs · Subgroup: Forms · Evidence: scripts/form-validator.js',
    },
    {
      title: 'Accessible names for interactive elements',
      details: 'Severity: Critical · Mandatory: Yes · Audit: Code Audit · Phase: Development · Group: HTML Forms & Inputs · Subgroup: Forms · Evidence: .eslintrc.cjs',
    },
    {
      title: 'Alt text is not a filename or generic placeholder',
      details: 'Severity: Critical · Mandatory: Yes · Audit: Code Audit · Phase: Development · Group: HTML Media & Data · Subgroup: Images · Evidence: n/a',
    },
    {
      title: 'Page title exists and follows a consistent naming pattern',
      details: 'Severity: Critical · Mandatory: Yes · Audit: Code Audit · Phase: Development · Group: HTML Metadata & Validation · Subgroup: Metadata · Evidence: n/a',
    },
    {
      title: 'No duplicate IDs found in rendered markup',
      details: 'Severity: Critical · Mandatory: Yes · Audit: Code Audit · Phase: Development · Group: HTML Metadata & Validation · Subgroup: IDs · Evidence: package.json',
    },
    {
      title: 'No invalid HTML nesting in audited templates',
      details: 'Severity: Critical · Mandatory: Yes · Audit: Code Audit · Phase: Development · Group: HTML Metadata & Validation · Subgroup: Validation · Evidence: package.json',
    },
    {
      title: 'HTML validates without parser errors',
      details: 'Severity: Critical · Mandatory: Yes · Audit: Code Audit · Phase: Development · Group: HTML Metadata & Validation · Subgroup: Validation · Evidence: package.json',
    },
    {
      title: 'Primary landmark regions are uniquely identifiable',
      details: 'Severity: High · Mandatory: Yes · Audit: Code Audit · Phase: Development · Group: HTML Semantics & Structure · Subgroup: Landmarks · Evidence: templates/base.html',
    },
    {
      title: 'Main content area exists once per page',
      details: 'Severity: High · Mandatory: Yes · Audit: Code Audit · Phase: Development · Group: HTML Semantics & Structure · Subgroup: Landmarks · Evidence: base.html',
    },
    {
      title: 'Buttons expose visible text or accessible names',
      details: 'Severity: Critical · Mandatory: Yes · Audit: Code Audit · Phase: Development · Group: HTML Forms & Inputs · Subgroup: Buttons · Evidence: components/button.js',
    },
    {
      title: 'Links have discernible names in navigation regions',
      details: 'Severity: High · Mandatory: Yes · Audit: Code Audit · Phase: Development · Group: HTML Navigation · Subgroup: Links · Evidence: nav.js',
    },
    {
      title: 'Form controls are grouped with fieldset and legend where appropriate',
      details: 'Severity: Medium · Mandatory: No · Audit: Code Audit · Phase: Development · Group: HTML Forms & Inputs · Subgroup: Groups · Evidence: forms/signup.js',
    },
    {
      title: 'Tables expose header associations for complex layouts',
      details: 'Severity: High · Mandatory: Yes · Audit: Code Audit · Phase: Development · Group: HTML Data Tables · Subgroup: Tables · Evidence: blocks/table/table.js',
    },
    {
      title: 'Dialog components trap focus while open',
      details: 'Severity: Critical · Mandatory: Yes · Audit: Code Audit · Phase: Development · Group: HTML Dialogs & Overlays · Subgroup: Focus · Evidence: modal.js',
    },
    {
      title: 'Dialogs restore focus to invoking control on close',
      details: 'Severity: High · Mandatory: Yes · Audit: Code Audit · Phase: Development · Group: HTML Dialogs & Overlays · Subgroup: Focus · Evidence: modal.js',
    },
    {
      title: 'Carousel controls expose correct aria labels',
      details: 'Severity: Medium · Mandatory: No · Audit: Code Audit · Phase: Development · Group: HTML Widgets · Subgroup: Carousel · Evidence: carousel.js',
    },
    {
      title: 'Skip link is visible on keyboard focus',
      details: 'Severity: High · Mandatory: Yes · Audit: Code Audit · Phase: Development · Group: HTML Navigation · Subgroup: Keyboard · Evidence: styles/a11y.css',
    },
    {
      title: 'Focus order remains logical across interactive regions',
      details: 'Severity: Critical · Mandatory: Yes · Audit: Manual Audit · Phase: Development · Group: Keyboard Support · Subgroup: Focus order · Evidence: manual review',
    },
    {
      title: 'Tab order does not skip actionable elements',
      details: 'Severity: High · Mandatory: Yes · Audit: Manual Audit · Phase: Development · Group: Keyboard Support · Subgroup: Focus order · Evidence: manual review',
    },
    {
      title: 'Contrast ratio for status text meets minimum thresholds',
      details: 'Severity: High · Mandatory: Yes · Audit: Browser Audit · Phase: Development · Group: Color & Contrast · Subgroup: Text · Evidence: axe-core',
    },
    {
      title: 'Interactive hit targets meet minimum sizing guidelines',
      details: 'Severity: Medium · Mandatory: No · Audit: Manual Audit · Phase: Development · Group: Touch Targets · Subgroup: Controls · Evidence: manual review',
    },
    {
      title: 'Video captions are available for embedded media',
      details: 'Severity: High · Mandatory: Yes · Audit: Manual Audit · Phase: Development · Group: Media · Subgroup: Video · Evidence: content audit',
    },
    {
      title: 'Accordion state is conveyed with aria-expanded',
      details: 'Severity: High · Mandatory: Yes · Audit: Code Audit · Phase: Development · Group: HTML Widgets · Subgroup: Accordion · Evidence: accordion.js',
    },
    {
      title: 'Status messages announce changes without moving focus',
      details: 'Severity: Medium · Mandatory: No · Audit: Browser Audit · Phase: Development · Group: Live Regions · Subgroup: Status · Evidence: axe-core',
    },
    {
      title: 'Autocomplete fields expose valid input purpose tokens',
      details: 'Severity: Medium · Mandatory: No · Audit: Code Audit · Phase: Development · Group: Forms · Subgroup: Autocomplete · Evidence: checkout-form.js',
    },
    {
      title: 'Error summary links move focus to invalid fields',
      details: 'Severity: High · Mandatory: Yes · Audit: Manual Audit · Phase: Development · Group: Forms · Subgroup: Validation · Evidence: manual review',
    },
    {
      title: 'Breadcrumb trail identifies current page correctly',
      details: 'Severity: Medium · Mandatory: No · Audit: Code Audit · Phase: Development · Group: Navigation · Subgroup: Breadcrumbs · Evidence: breadcrumb.js',
    },
    {
      title: 'Search results announce total result count',
      details: 'Severity: Medium · Mandatory: No · Audit: Browser Audit · Phase: Development · Group: Search UX · Subgroup: Announcements · Evidence: browser audit',
    },
    {
      title: 'Loading states expose progress semantics where applicable',
      details: 'Severity: Medium · Mandatory: No · Audit: Code Audit · Phase: Development · Group: States & Feedback · Subgroup: Loading · Evidence: spinner.js',
    },
  ];
}

function getIssues(block) {
  const rows = [...block.children].slice(1);
  const authoredIssues = rows.map((row) => {
    const [title, details] = getRowCells(row);

    if (!title) {
      return null;
    }

    return {
      title,
      details: details || '',
    };
  }).filter(Boolean);

  return authoredIssues.length ? authoredIssues : getFallbackIssues();
}

function getIssueMarkup(issue) {
  return `
    <article class="top-issues__item row-issue">
      <div class="top-issues__item-row">
        <span class="top-issues__item-icon icon-box-issue" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </span>
        <div class="top-issues__item-content">
          <p class="top-issues__item-title">${issue.title}</p>
          ${issue.details ? `<p class="top-issues__item-details">${issue.details}</p>` : ''}
        </div>
      </div>
    </article>
  `;
}

const PAGE_SIZE = 2;

function isMobileView() {
  return window.matchMedia('(max-width: 639px)').matches;
}

function getVisiblePageItems(totalPages, currentPage) {
  const maxVisibleButtons = isMobileView() ? 4 : 10;

  if (totalPages <= maxVisibleButtons) {
    return Array.from({ length: totalPages }, (_, index) => index);
  }

  if (isMobileView()) {
    if (currentPage <= 1) {
      return [0, 1, 'ellipsis', totalPages - 1];
    }

    if (currentPage >= totalPages - 2) {
      return [0, 'ellipsis', totalPages - 2, totalPages - 1];
    }

    return [0, 'ellipsis', currentPage, totalPages - 1];
  }

  const startPages = [0, 1];
  const endPages = [totalPages - 2, totalPages - 1];
  const middleStart = Math.max(2, currentPage - 1);
  const middleEnd = Math.min(totalPages - 3, currentPage + 1);
  const middlePages = [];

  for (let index = middleStart; index <= middleEnd; index += 1) {
    middlePages.push(index);
  }

  const pages = [...new Set([...startPages, ...middlePages, ...endPages])]
    .sort((left, right) => left - right);
  const items = [];

  pages.forEach((page, index) => {
    if (index > 0 && page - pages[index - 1] > 1) {
      items.push('ellipsis');
    }

    items.push(page);
  });

  return items;
}

function getPageButtons(totalPages, currentPage) {
  return getVisiblePageItems(totalPages, currentPage)
    .map((item) => {
      if (item === 'ellipsis') {
        return `
          <button
            type="button"
            class="top-issues__page-button top-issues__page-button--ellipsis"
            disabled
            aria-hidden="true"
          >
            ...
          </button>
        `;
      }

      return `
        <button
          type="button"
          class="top-issues__page-button${item === currentPage ? ' is-active' : ''}"
          data-page="${item}"
          aria-label="Go to page ${item + 1}"
          aria-current="${item === currentPage ? 'page' : 'false'}"
        >
          ${item + 1}
        </button>
      `;
    })
    .join('');
}

function getJumpMarkup(totalPages, currentPage) {
  if (totalPages <= 10) {
    return '';
  }

  const options = Array.from({ length: totalPages }, (_, index) => `
    <option value="${index}" ${index === currentPage ? 'selected' : ''}>
      ${index + 1}
    </option>
  `).join('');

  return `
    <label class="top-issues__jump-label" for="top-issues-page-jump">
      Go to page
    </label>
    <select
      id="top-issues-page-jump"
      class="top-issues__jump-select"
      data-pagination="jump"
      aria-label="Jump to a specific page"
    >
      ${options}
    </select>
  `;
}

function getPaginationMarkup(totalPages, currentPage) {
  if (totalPages <= 1) {
    return '';
  }

  const pages = getPageButtons(totalPages, currentPage);
  const jumpControl = getJumpMarkup(totalPages, currentPage);

  return `
    <div class="top-issues__pagination" aria-label="Top issues pagination">
      <button
        type="button"
        class="top-issues__nav-button"
        data-pagination="prev"
        ${currentPage === 0 ? 'disabled' : ''}
      >
        Previous
      </button>
      <div class="top-issues__page-list">
        ${pages}
      </div>
      <div class="top-issues__pagination-actions">
        ${jumpControl}
        <button
          type="button"
          class="top-issues__nav-button"
          data-pagination="next"
          ${currentPage === totalPages - 1 ? 'disabled' : ''}
        >
          Next
        </button>
      </div>
    </div>
  `;
}

function renderIssues(block, issues, currentPage = 0) {
  const totalPages = Math.ceil(issues.length / PAGE_SIZE);
  const start = currentPage * PAGE_SIZE;
  const pagedIssues = issues.slice(start, start + PAGE_SIZE);
  const list = block.querySelector('.top-issues__list');
  const pagination = block.querySelector('.top-issues__pagination-shell');

  if (list) {
    list.innerHTML = pagedIssues.map((issue) => getIssueMarkup(issue)).join('');
  }

  if (pagination) {
    pagination.innerHTML = getPaginationMarkup(totalPages, currentPage);
  }

  block.dataset.currentPage = String(currentPage);
}

export default function decorate(block) {
  const headingMarkup = getHeadingMarkup(block);
  const issues = getIssues(block);

  block.innerHTML = `
    ${headingMarkup}
    <div class="top-issues__list"></div>
    <div class="top-issues__pagination-shell"></div>
  `;

  block.classList.add('cmp-top-issues');
  block?.closest('.top-issues-container')?.classList.add('top-issues-grid');

  renderIssues(block, issues, 0);

  block.addEventListener('click', (event) => {
    const pageButton = event.target.closest('[data-page]');
    const navButton = event.target.closest('[data-pagination]');
    const currentPage = Number(block.dataset.currentPage || '0');
    const totalPages = Math.ceil(issues.length / PAGE_SIZE);

    if (pageButton) {
      renderIssues(block, issues, Number(pageButton.dataset.page || '0'));
      return;
    }

    if (!navButton) {
      return;
    }

    if (navButton.dataset.pagination === 'prev' && currentPage > 0) {
      renderIssues(block, issues, currentPage - 1);
    }

    if (navButton.dataset.pagination === 'next' && currentPage < totalPages - 1) {
      renderIssues(block, issues, currentPage + 1);
    }
  });

  block.addEventListener('change', (event) => {
    const jumpSelect = event.target.closest('[data-pagination="jump"]');

    if (!jumpSelect) {
      return;
    }

    const nextPage = Number(jumpSelect.value);

    if (Number.isNaN(nextPage)) {
      return;
    }

    renderIssues(block, issues, nextPage);
  });

  const mediaQuery = window.matchMedia('(max-width: 639px)');
  mediaQuery.addEventListener('change', () => {
    const currentPage = Number(block.dataset.currentPage || '0');
    renderIssues(block, issues, currentPage);
  });
}
