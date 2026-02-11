import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

// media query match that indicates desktop width
const isDesktop = window.matchMedia('(min-width: 900px)');

function closeOnEscape(e) {
  if (e.code === 'Escape') {
    const nav = document.getElementById('nav');
    if (!nav) return;
    const expanded = nav.getAttribute('aria-expanded') === 'true';
    if (expanded && !isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleMenu(nav);
      const hamburger = document.querySelector('.nav-hamburger button');
      if (hamburger) hamburger.focus();
    }
  }
}

function closeOnClickOutside(e) {
  const nav = document.getElementById('nav');
  const hamburger = document.querySelector('.nav-hamburger');
  if (!nav || !hamburger) return;

  const expanded = nav.getAttribute('aria-expanded') === 'true';
  if (expanded && !isDesktop.matches && !nav.contains(e.target) && !hamburger.contains(e.target)) {
    // eslint-disable-next-line no-use-before-define
    toggleMenu(nav);
  }
}

/**
 * Toggles the sidebar navigation
 * @param {Element} nav The navigation element
 * @param {*} forceExpanded Optional param to force nav expand behavior when not null
 */
function toggleMenu(nav, forceExpanded = null) {
  const expanded = forceExpanded !== null ? !forceExpanded : nav.getAttribute('aria-expanded') === 'true';
  const button = document.querySelector('.nav-hamburger button');

  // On mobile, prevent body scroll when menu is open
  if (!isDesktop.matches) {
    document.body.style.overflowY = expanded ? '' : 'hidden';
  }

  nav.setAttribute('aria-expanded', expanded ? 'false' : 'true');
  if (button) {
    button.setAttribute('aria-label', expanded ? 'Open navigation' : 'Close navigation');
    button.setAttribute('aria-expanded', expanded ? 'false' : 'true');
  }

  // Handle event listeners for closing menu
  if (!expanded && !isDesktop.matches) {
    window.addEventListener('keydown', closeOnEscape);
    document.addEventListener('click', closeOnClickOutside);
  } else {
    window.removeEventListener('keydown', closeOnEscape);
    document.removeEventListener('click', closeOnClickOutside);
  }
}

/**
 * loads and decorates the header, mainly the nav
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  // load nav as fragment
  const navMeta = getMetadata('nav');
  const navPath = navMeta ? new URL(navMeta, window.location).pathname : '/nav';
  const fragment = await loadFragment(navPath);

  // decorate nav DOM
  block.textContent = '';
  const nav = document.createElement('nav');
  nav.id = 'nav';
  nav.classList.add('nav-sidebar');
  nav.setAttribute('role', 'navigation');
  nav.setAttribute('aria-label', 'Main navigation');

  // Get the default content wrapper from fragment
  const contentWrapper = fragment.querySelector('.default-content-wrapper');
  let brandElement = null;

  if (contentWrapper) {
    // Extract brand/logo (first paragraph)
    const brandParagraph = contentWrapper.querySelector('p');
    if (brandParagraph) {
      const navBrand = document.createElement('div');
      navBrand.classList.add('nav-brand');
      navBrand.appendChild(brandParagraph.cloneNode(true));
      nav.appendChild(navBrand);
      // Store brand for mobile header
      brandElement = navBrand.cloneNode(true);
    }

    // Extract navigation list
    const navList = contentWrapper.querySelector('ul');
    if (navList) {
      const navMenu = document.createElement('ul');
      navMenu.classList.add('nav-menu');
      navMenu.setAttribute('role', 'list');

      const navItems = [];

      // Function to update active navigation item based on current URL
      const updateActiveNavItem = () => {
        // Get current URL hash (e.g., #dashboard, #reports)
        const currentHash = window.location.hash;
        const currentPath = window.location.pathname;
        let hasActiveItem = false;

        navItems.forEach((item) => {
          const { element, link, href } = item;

          // Extract the hash or path from the nav item's href
          let navHash = '';
          let itemNavPath = '';

          if (href.startsWith('#')) {
            navHash = href;
          } else {
            try {
              const url = new URL(href, window.location.origin);
              navHash = url.hash;
              itemNavPath = url.pathname;
            } catch (e) {
              // If href is invalid, skip this item
              return;
            }
          }

          // Check if this nav item matches the current URL
          let isActive = false;

          if (currentHash) {
            // If there's a hash in the URL, match against nav item's hash
            isActive = navHash && currentHash === navHash;
          } else {
            // If no hash, match against pathname
            isActive = itemNavPath && itemNavPath !== '/' && currentPath.includes(itemNavPath);
          }

          // Update active state
          if (isActive) {
            element.classList.add('active');
            link.setAttribute('aria-current', 'page');
            hasActiveItem = true;
          } else {
            element.classList.remove('active');
            link.removeAttribute('aria-current');
          }
        });

        // If no item is active, highlight Dashboard by default
        if (!hasActiveItem) {
          const dashboardItem = navItems.find((item) => item.text.toLowerCase().includes('dashboard'));
          if (dashboardItem) {
            dashboardItem.element.classList.add('active');
            dashboardItem.link.setAttribute('aria-current', 'page');
          }
        }
      };

      // Process each navigation item
      navList.querySelectorAll('li').forEach((item) => {
        const link = item.querySelector('a');
        const icon = item.querySelector('.icon');

        if (link) {
          // Create a list item wrapper
          const navItem = document.createElement('li');
          navItem.classList.add('nav-item');
          navItem.setAttribute('role', 'listitem');

          // Create the nav link
          const navLink = document.createElement('a');
          // Clean up href - remove 'https://' if URL starts with 'https://#'
          let cleanHref = link.href;
          if (cleanHref.startsWith('https://#')) {
            cleanHref = cleanHref.replace('https://', '');
          }
          navLink.href = cleanHref;
          navLink.textContent = link.textContent;
          navLink.title = link.title || link.textContent;
          navLink.classList.add('nav-link');

          // Clone the icon and add to link
          if (icon) {
            const clonedIcon = icon.cloneNode(true);
            clonedIcon.setAttribute('aria-hidden', 'true');
            navLink.insertBefore(clonedIcon, navLink.firstChild);
          }

          navItem.appendChild(navLink);
          navMenu.appendChild(navItem);

          // Store reference for active state management
          navItems.push({
            element: navItem,
            link: navLink,
            href: cleanHref,
            text: link.textContent.trim(),
          });
        }
      });

      nav.appendChild(navMenu);

      // Set initial active state
      updateActiveNavItem();

      // Update active state when hash changes (browser back/forward or link clicks)
      window.addEventListener('hashchange', updateActiveNavItem);
    }
  }

  // hamburger for mobile
  const hamburger = document.createElement('div');
  hamburger.classList.add('nav-hamburger');
  hamburger.innerHTML = `<button type="button" aria-controls="nav" aria-label="Open navigation" aria-expanded="false">
      <span class="nav-hamburger-icon" aria-hidden="true"></span>
    </button>`;
  hamburger.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMenu(nav);
  });

  // Create mobile header with logo and hamburger
  const mobileHeader = document.createElement('div');
  mobileHeader.classList.add('nav-mobile-header');
  mobileHeader.setAttribute('role', 'banner');
  if (brandElement) {
    mobileHeader.appendChild(brandElement);
  }
  mobileHeader.appendChild(hamburger);

  nav.setAttribute('aria-expanded', 'false');

  // Handle responsive behavior
  const handleResize = () => {
    if (isDesktop.matches) {
      // On desktop, always show nav and reset body overflow
      nav.setAttribute('aria-expanded', 'true');
      document.body.style.overflowY = '';
      window.removeEventListener('keydown', closeOnEscape);
      document.removeEventListener('click', closeOnClickOutside);
    } else {
      // On mobile, close nav by default
      toggleMenu(nav, false);
    }
  };

  // Initial setup
  handleResize();
  isDesktop.addEventListener('change', handleResize);

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.append(mobileHeader);
  navWrapper.append(nav);
  block.append(navWrapper);
}
