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
  const navPath = navMeta ? new URL(navMeta, window.location).pathname : '/new-nav';
  const fragment = await loadFragment(navPath);

  // decorate nav DOM
  block.textContent = '';
  const nav = document.createElement('nav');
  nav.id = 'nav';
  nav.classList.add('nav-sidebar');

  // Get the default content wrapper from fragment
  const contentWrapper = fragment.querySelector('.default-content-wrapper');
  if (contentWrapper) {
    // Extract brand/logo (first paragraph)
    const brandParagraph = contentWrapper.querySelector('p');
    if (brandParagraph) {
      const navBrand = document.createElement('div');
      navBrand.classList.add('nav-brand');
      navBrand.appendChild(brandParagraph.cloneNode(true));
      nav.appendChild(navBrand);
    }

    // Extract navigation list
    const navList = contentWrapper.querySelector('ul');
    if (navList) {
      const navMenu = document.createElement('div');
      navMenu.classList.add('nav-menu');

      // Process each navigation item
      navList.querySelectorAll('li').forEach((item) => {
        const link = item.querySelector('a');
        const icon = item.querySelector('.icon');

        if (link) {
          // Create a wrapper for each nav item
          const navItem = document.createElement('div');
          navItem.classList.add('nav-item');

          // Mark Dashboard as active (first item)
          if (link.textContent.includes('Dashboard')) {
            navItem.classList.add('active');
          }

          // Clone the content
          if (icon) {
            navItem.appendChild(icon.cloneNode(true));
          }

          const navLink = document.createElement('a');
          // Clean up href - remove 'https://' if URL starts with 'https://#'
          let cleanHref = link.href;
          if (cleanHref.startsWith('https://#')) {
            cleanHref = cleanHref.replace('https://', '');
          }
          navLink.href = cleanHref;
          navLink.textContent = link.textContent;
          navLink.title = link.title || link.textContent;
          navItem.appendChild(navLink);

          navMenu.appendChild(navItem);
        }
      });

      nav.appendChild(navMenu);
    }
  }

  // hamburger for mobile
  const hamburger = document.createElement('div');
  hamburger.classList.add('nav-hamburger');
  hamburger.innerHTML = `<button type="button" aria-controls="nav" aria-label="Open navigation" aria-expanded="false">
      <span class="nav-hamburger-icon"></span>
    </button>`;
  hamburger.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMenu(nav);
  });

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
  navWrapper.append(hamburger);
  navWrapper.append(nav);
  block.append(navWrapper);
}
