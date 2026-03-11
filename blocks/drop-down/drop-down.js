import {
  setUIAuditMetrics,
  getReportMetricsUrl,
  getReportParamsFromUrl,
  fetchReportMetrics,
} from '../../scripts/utils.js';

/**
 * Fiscal quarter by month: Q1 Dec–Feb, Q2 Mar–May, Q3 Jun–Aug, Q4 Sep–Nov.
 * @returns {'q1'|'q2'|'q3'|'q4'}
 */
function getCurrentQuarter() {
  const month = new Date().getMonth(); // 0–11
  if (month >= 2 && month <= 4) return 'q2';
  if (month >= 5 && month <= 7) return 'q3';
  if (month >= 8 && month <= 10) return 'q4';
  return 'q1'; // Dec(11), Jan(0), Feb(1)
}

export default async function decorate(block) {
  // Add class to the inner wrapper div if it exists
  const innerDiv = block.querySelector('div');
  if (innerDiv && !innerDiv.className) {
    innerDiv.classList.add('drop-down-content');
  }

  // Clean up button-container if AEM auto-generated it
  const buttonContainer = block.querySelector('.button-container');
  if (buttonContainer) {
    // Replace button-container with just a div
    const cleanDiv = document.createElement('div');
    cleanDiv.innerHTML = buttonContainer.innerHTML;
    buttonContainer.replaceWith(cleanDiv);
  }

  // Remove 'button' class from anchor if it exists
  const anchor = block.querySelector('a');
  if (anchor) {
    anchor.classList.remove('button');
  }

  // Check if the block has the "dynamic" class
  const isDynamic = block.classList.contains('dynamic');
  const isYear = block.classList.contains('year-selector');
  const isQuarter = block.classList.contains('quarter-selector');
  // Check if the block has the "project-selector" class
  const isProjectSelector = block.classList.contains('project-selector');

  /** Build items array for dropdown. Fetched for dynamic, built for year/quarter. */
  let items = [];

  if (isDynamic) {
    // Verify anchor element exists (already queried above)
    if (!anchor) {
      // eslint-disable-next-line no-console
      console.error('No anchor element found in drop-down block');
      return;
    }

    const dataUrl = anchor.getAttribute('href');

    if (!dataUrl) {
      // eslint-disable-next-line no-console
      console.error('No href attribute found in anchor element');
      return;
    }

    try {
      // Fetch data from the URL
      const response = await fetch(dataUrl);

      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Populate the dropdown with data
      items = Array.isArray(data) ? data : (data.data || []);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error loading dropdown data:', error);
      const errorMsg = document.createElement('div');
      errorMsg.className = 'drop-down-error';
      errorMsg.setAttribute('role', 'alert');
      errorMsg.setAttribute('aria-live', 'assertive');
      errorMsg.textContent = 'Failed to load dropdown options';
      block.appendChild(errorMsg);
      return;
    }
  } else if (isYear) {
    const currentYear = new Date().getFullYear();
    items = Array.from({ length: 5 }, (_, i) => ({
      Title: String(currentYear - i),
      Folder: String(currentYear - i),
    }));
  } else if (isQuarter) {
    // Quarter: block direct children are rows; each row has 2 divs (data-value, display-value)
    const rows = [...block.children].filter((row) => row.children.length >= 2);
    items = rows.map((row) => {
      const firstCol = row.children[0];
      const secondCol = row.children[1];
      const dataValue = (firstCol?.textContent?.trim() ?? '').trim();
      const displayValue = (secondCol?.textContent?.trim() ?? dataValue).trim();
      return { Title: displayValue, Folder: dataValue };
    }).filter((item) => item.Folder || item.Title);
  }

  if (items.length > 0) {
    const dropdownContainer = document.createElement('div');
    dropdownContainer.className = 'drop-down-custom';
    dropdownContainer.setAttribute('role', 'combobox');
    dropdownContainer.setAttribute('aria-haspopup', 'listbox');
    dropdownContainer.setAttribute('aria-expanded', 'false');

    const dropdownId = `dropdown-${Math.random().toString(36).substr(2, 9)}`;
    const labelId = `${dropdownId}-label`;
    const listboxId = `${dropdownId}-listbox`;

    const selectedDisplay = document.createElement('button');
    selectedDisplay.className = 'drop-down-selected';
    selectedDisplay.setAttribute('type', 'button');
    selectedDisplay.setAttribute('aria-labelledby', labelId);
    selectedDisplay.setAttribute('aria-controls', listboxId);

    const selectedTitle = document.createElement('span');
    selectedTitle.className = 'drop-down-title';
    selectedTitle.id = labelId;

    const selectedStatus = document.createElement('span');
    selectedStatus.className = 'drop-down-status';

    if (isProjectSelector) {
      selectedStatus.textContent = 'Project';
    } else if (isYear) {
      selectedStatus.textContent = 'Year';
    } else if (isQuarter) {
      selectedStatus.textContent = 'Quarter';
    } else {
      selectedStatus.textContent = 'Active';
    }

    selectedStatus.setAttribute('aria-live', 'polite');

    selectedDisplay.appendChild(selectedTitle);
    selectedDisplay.appendChild(selectedStatus);

    const arrow = document.createElement('span');
    arrow.className = 'drop-down-arrow';
    arrow.setAttribute('aria-hidden', 'true');

    const optionsContainer = document.createElement('ul');
    optionsContainer.className = 'drop-down-options';
    optionsContainer.id = listboxId;
    optionsContainer.setAttribute('role', 'listbox');
    optionsContainer.setAttribute('aria-labelledby', labelId);

    const fetchProjectData = async (selectedValue) => {
      if (!isProjectSelector) return;

      const { year, quarter } = getReportParamsFromUrl({
        quarter: getCurrentQuarter(),
      });
      const url = getReportMetricsUrl(selectedValue, year, quarter);
      if (!url) return;

      try {
        const metricsResponse = await fetch(url);
        if (!metricsResponse.ok) {
          setUIAuditMetrics(null);
          throw new Error(`Failed to fetch metrics: ${metricsResponse.status}`);
        }
        const metricsData = await metricsResponse.json();
        setUIAuditMetrics(metricsData);
        block.dispatchEvent(new CustomEvent('project-data-loaded', {
          detail: {
            project: selectedValue,
            year,
            quarter,
            metrics: metricsData,
          },
          bubbles: true,
        }));
      } catch (error) {
        setUIAuditMetrics(null);
        // eslint-disable-next-line no-console
        console.error('Error loading project data:', error);
      }
    };

    const selectOption = async (option) => {
      // Check if this option is already selected
      if (option.classList.contains('selected')) {
        // eslint-disable-next-line no-use-before-define
        closeDropdown();
        return;
      }

      const titleValue = option.dataset.value;
      const folderValue = option.dataset.folder;
      selectedTitle.textContent = titleValue;

      // Update selected state
      optionsContainer.querySelectorAll('.drop-down-option').forEach((opt) => {
        opt.classList.remove('selected');
        opt.setAttribute('aria-selected', 'false');
      });
      option.classList.add('selected');
      option.setAttribute('aria-selected', 'true');
      selectedDisplay.setAttribute('aria-activedescendant', option.id);

      // Close dropdown
      // eslint-disable-next-line no-use-before-define
      closeDropdown();

      // Update query params on change
      const url = new URL(window.location.href);
      if (isProjectSelector) {
        url.searchParams.set('project', folderValue.toLowerCase());
      }
      if (isYear) {
        url.searchParams.set('year', folderValue);
      }
      if (isQuarter) {
        url.searchParams.set('quarter', folderValue.toLowerCase());
      }
      if (isProjectSelector || isYear || isQuarter) {
        window.history.replaceState({}, '', url);
      }

      if (isProjectSelector) {
        await fetchProjectData(folderValue);
      } else if (isYear || isQuarter) {
        const { project, year, quarter } = getReportParamsFromUrl({ quarter: getCurrentQuarter() });
        if (project) {
          await fetchReportMetrics(project, year, quarter);
        }
      }

      // Dispatch custom event
      block.dispatchEvent(new CustomEvent('dropdown-change', {
        detail: {
          value: titleValue,
          folder: folderValue,
        },
        bubbles: true,
      }));
    };

    const openDropdown = () => {
      dropdownContainer.classList.add('open');
      dropdownContainer.setAttribute('aria-expanded', 'true');
      // Focus the selected option
      const selectedOption = optionsContainer.querySelector('.drop-down-option.selected');
      if (selectedOption) {
        selectedOption.focus();
      }
    };

    const closeDropdown = () => {
      dropdownContainer.classList.remove('open');
      dropdownContainer.setAttribute('aria-expanded', 'false');
      selectedDisplay.focus();
    };

    const urlParams = new URLSearchParams(window.location.search);
    let queryParamValue = null;
    if (isProjectSelector) {
      queryParamValue = urlParams.get('project');
    } else if (isYear) {
      queryParamValue = urlParams.get('year') || String(new Date().getFullYear());
    } else if (isQuarter) {
      queryParamValue = (urlParams.get('quarter') || getCurrentQuarter()).toLowerCase();
    }

    let matchedOption = null;
    let firstOption = null;

    items.forEach((item, index) => {
      const option = document.createElement('li');
      option.className = 'drop-down-option';
      option.setAttribute('role', 'option');
      option.setAttribute('tabindex', '-1');

      const titleValue = item.Title || item.title || item.label
        || item.name || item.value || JSON.stringify(item);
      const folderValue = item.Folder || item.folder || titleValue;

      option.textContent = titleValue;
      option.dataset.value = titleValue;
      option.dataset.folder = folderValue;
      option.id = `${listboxId}-option-${index}`;

      if (index === 0) firstOption = { option, folderValue, titleValue };
      if (queryParamValue && folderValue.toLowerCase() === queryParamValue.toLowerCase()) {
        matchedOption = { option, folderValue, titleValue };
      }

      option.setAttribute('aria-selected', 'false');
      option.addEventListener('click', () => selectOption(option));
      optionsContainer.appendChild(option);
    });

    const selectedOptionData = matchedOption || firstOption;

    if (selectedOptionData) {
      selectedTitle.textContent = selectedOptionData.titleValue;
      selectedOptionData.option.classList.add('selected');
      selectedOptionData.option.setAttribute('aria-selected', 'true');
      selectedDisplay.setAttribute('aria-activedescendant', selectedOptionData.option.id);

      const url = new URL(window.location.href);
      if (isProjectSelector) {
        url.searchParams.set('project', selectedOptionData.folderValue.toLowerCase());
      }
      if (isYear) {
        url.searchParams.set('year', selectedOptionData.folderValue);
      }
      if (isQuarter) {
        url.searchParams.set('quarter', selectedOptionData.folderValue.toLowerCase());
      }
      if (isProjectSelector || isYear || isQuarter) {
        window.history.replaceState({}, '', url);
      }
      fetchProjectData(selectedOptionData.folderValue);
    }

    selectedDisplay.addEventListener('click', (e) => {
      e.stopPropagation();
      if (dropdownContainer.classList.contains('open')) closeDropdown();
      else openDropdown();
    });

    selectedDisplay.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        openDropdown();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closeDropdown();
      }
    });

    optionsContainer.addEventListener('keydown', (e) => {
      const options = Array.from(optionsContainer.querySelectorAll('.drop-down-option'));
      const currentIndex = options.indexOf(document.activeElement);

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          if (currentIndex < options.length - 1) options[currentIndex + 1].focus();
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (currentIndex > 0) options[currentIndex - 1].focus();
          break;
        case 'Home':
          e.preventDefault();
          options[0].focus();
          break;
        case 'End':
          e.preventDefault();
          options[options.length - 1].focus();
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (currentIndex >= 0) selectOption(options[currentIndex]);
          break;
        case 'Escape':
          e.preventDefault();
          closeDropdown();
          break;
        default:
          break;
      }
    });

    const handleClickOutside = (e) => {
      if (!dropdownContainer.contains(e.target)) closeDropdown();
    };
    document.addEventListener('click', handleClickOutside);
    block.addEventListener('disconnected', () => {
      document.removeEventListener('click', handleClickOutside);
    });

    dropdownContainer.appendChild(selectedDisplay);
    dropdownContainer.appendChild(arrow);
    dropdownContainer.appendChild(optionsContainer);
    block.appendChild(dropdownContainer);

    // Remove default/authored content from block; only the custom dropdown remains
    [...block.children].forEach((child) => {
      if (child !== dropdownContainer) child.remove();
    });
  }
}
