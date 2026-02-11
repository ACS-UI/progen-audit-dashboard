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
  // Check if the block has the "project-selector" class
  const isProjectSelector = block.classList.contains('project-selector');

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
      // Assuming the JSON data is an array or has a 'data' property with an array
      const items = Array.isArray(data) ? data : (data.data || []);

      // Create custom dropdown container with proper semantics
      const dropdownContainer = document.createElement('div');
      dropdownContainer.className = 'drop-down-custom';
      dropdownContainer.setAttribute('role', 'combobox');
      dropdownContainer.setAttribute('aria-haspopup', 'listbox');
      dropdownContainer.setAttribute('aria-expanded', 'false');

      // Add label for accessibility
      const dropdownId = `dropdown-${Math.random().toString(36).substr(2, 9)}`;
      const labelId = `${dropdownId}-label`;
      const listboxId = `${dropdownId}-listbox`;

      // Create the selected display area (acts as button)
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
      selectedStatus.textContent = 'Active';
      selectedStatus.setAttribute('aria-live', 'polite');

      selectedDisplay.appendChild(selectedTitle);
      selectedDisplay.appendChild(selectedStatus);

      // Create dropdown arrow
      const arrow = document.createElement('span');
      arrow.className = 'drop-down-arrow';
      arrow.setAttribute('aria-hidden', 'true');

      // Create options container
      const optionsContainer = document.createElement('ul');
      optionsContainer.className = 'drop-down-options';
      optionsContainer.id = listboxId;
      optionsContainer.setAttribute('role', 'listbox');
      optionsContainer.setAttribute('aria-labelledby', labelId);

      // Function to fetch project data and store in localStorage
      const fetchProjectData = async (selectedValue) => {
        if (!isProjectSelector) return;

        try {
          // Fetch both API endpoints
          const [metricsResponse, checklistResponse] = await Promise.all([
            fetch(`/reports/${selectedValue.toLowerCase()}/ui-audit-metrics.json`),
            fetch(`/reports/${selectedValue.toLowerCase()}/ui-audit-checklist.json`),
          ]);

          if (!metricsResponse.ok) {
            throw new Error(`Failed to fetch metrics: ${metricsResponse.status}`);
          }
          if (!checklistResponse.ok) {
            throw new Error(`Failed to fetch checklist: ${checklistResponse.status}`);
          }

          const metricsData = await metricsResponse.json();
          const checklistData = await checklistResponse.json();

          // Store in localStorage
          localStorage.setItem('ui-audit-metrics', JSON.stringify(metricsData));
          localStorage.setItem('ui-audit-checklist', JSON.stringify(checklistData));

          // Dispatch custom event with both data
          block.dispatchEvent(new CustomEvent('project-data-loaded', {
            detail: {
              project: selectedValue,
              metrics: metricsData,
              checklist: checklistData,
            },
            bubbles: true,
          }));
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('Error loading project data:', error);
        }
      };

      // Function to select an option
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

        // Fetch project data if this is a project-selector using folder value
        await fetchProjectData(folderValue);

        // Dispatch custom event
        block.dispatchEvent(new CustomEvent('dropdown-change', {
          detail: {
            value: titleValue,
            folder: folderValue,
          },
          bubbles: true,
        }));
      };

      // Function to open dropdown
      const openDropdown = () => {
        dropdownContainer.classList.add('open');
        dropdownContainer.setAttribute('aria-expanded', 'true');
        // Focus the selected option
        const selectedOption = optionsContainer.querySelector('.drop-down-option.selected');
        if (selectedOption) {
          selectedOption.focus();
        }
      };

      // Function to close dropdown
      const closeDropdown = () => {
        dropdownContainer.classList.remove('open');
        dropdownContainer.setAttribute('aria-expanded', 'false');
        selectedDisplay.focus();
      };

      // Populate options
      let firstOptionFolder = null;
      items.forEach((item, index) => {
        const option = document.createElement('li');
        option.className = 'drop-down-option';
        option.setAttribute('role', 'option');
        option.setAttribute('tabindex', '-1');

        // Try to use Title first (case-sensitive), then other common names
        const titleValue = item.Title || item.title || item.label
          || item.name || item.value || JSON.stringify(item);

        // Extract folder value for API calls
        const folderValue = item.Folder || item.folder || titleValue;

        option.textContent = titleValue;
        option.dataset.value = titleValue;
        option.dataset.folder = folderValue;
        option.id = `${listboxId}-option-${index}`;

        // Select the first item by default
        if (index === 0) {
          firstOptionFolder = folderValue;
          selectedTitle.textContent = titleValue;
          option.classList.add('selected');
          option.setAttribute('aria-selected', 'true');
          selectedDisplay.setAttribute('aria-activedescendant', option.id);
        } else {
          option.setAttribute('aria-selected', 'false');
        }

        // Add click handler
        option.addEventListener('click', () => {
          selectOption(option);
        });

        optionsContainer.appendChild(option);
      });

      // Fetch project data for the initially selected option
      if (firstOptionFolder) {
        fetchProjectData(firstOptionFolder);
      }

      // Toggle dropdown on click
      selectedDisplay.addEventListener('click', (e) => {
        e.stopPropagation();
        if (dropdownContainer.classList.contains('open')) {
          closeDropdown();
        } else {
          openDropdown();
        }
      });

      // Keyboard navigation
      selectedDisplay.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
          e.preventDefault();
          openDropdown();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          closeDropdown();
        }
      });

      // Keyboard navigation within options
      optionsContainer.addEventListener('keydown', (e) => {
        const options = Array.from(optionsContainer.querySelectorAll('.drop-down-option'));
        const currentIndex = options.indexOf(document.activeElement);

        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault();
            if (currentIndex < options.length - 1) {
              options[currentIndex + 1].focus();
            }
            break;
          case 'ArrowUp':
            e.preventDefault();
            if (currentIndex > 0) {
              options[currentIndex - 1].focus();
            }
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
            if (currentIndex >= 0) {
              selectOption(options[currentIndex]);
            }
            break;
          case 'Escape':
            e.preventDefault();
            closeDropdown();
            break;
          default:
            break;
        }
      });

      // Close dropdown when clicking outside
      const handleClickOutside = (e) => {
        if (!dropdownContainer.contains(e.target)) {
          closeDropdown();
        }
      };

      document.addEventListener('click', handleClickOutside);

      // Cleanup function to remove event listener
      block.addEventListener('disconnected', () => {
        document.removeEventListener('click', handleClickOutside);
      });

      // Assemble the dropdown
      dropdownContainer.appendChild(selectedDisplay);
      dropdownContainer.appendChild(arrow);
      dropdownContainer.appendChild(optionsContainer);

      // Append dropdown as a sibling to drop-down-content
      // Ensure it's added to the block, not inside drop-down-content
      block.appendChild(dropdownContainer);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error loading dropdown data:', error);
      // Show error message to user with proper ARIA live region
      const errorMsg = document.createElement('div');
      errorMsg.className = 'drop-down-error';
      errorMsg.setAttribute('role', 'alert');
      errorMsg.setAttribute('aria-live', 'assertive');
      errorMsg.textContent = 'Failed to load dropdown options';
      block.appendChild(errorMsg);
    }
  } else {
    // For non-dynamic dropdowns, handle static content
    // eslint-disable-next-line no-console
    console.log('Static drop-down block', block);
  }
}
