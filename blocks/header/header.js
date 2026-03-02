import { getMetadata, decorateIcons } from '../../scripts/aem.js';
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
  }

  const navMenu = document.createElement('ul');
  navMenu.classList.add('nav-menu');
  navMenu.setAttribute('role', 'list');

  const navItems = [];

  const template = getMetadata('template');

  if (template === 'audit-dashboard' || document.body.classList.contains('audit-dashboard')) {
    const main = document.querySelector('main');
    const sections = main.querySelectorAll(':scope > .section');

    sections.forEach((section) => {
      const heading = section.querySelector('h1, h2, h3');
      let title = heading ? heading.textContent.trim() : null;
      if (!title && section.dataset.keyword) title = section.dataset.keyword;
      if (!title && section.dataset.style) title = section.dataset.style;

      if (!title || title.toLowerCase() === 'metadata') return;

      const id = section.id || `section-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
      section.id = id;

      const navItem = document.createElement('li');
      navItem.classList.add('nav-item');
      navItem.setAttribute('role', 'listitem');

      const navLink = document.createElement('a');
      navLink.href = `#${id}`;
      navLink.textContent = title;
      navLink.title = title;
      navLink.classList.add('nav-link');

      const iconName = section.dataset.keyword || title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const iconSpan = document.createElement('span');
      iconSpan.classList.add('icon', `icon-${iconName}`);
      navLink.prepend(iconSpan);

      navLink.addEventListener('click', () => {
        if (!isDesktop.matches) toggleMenu(nav, false);
      });

      navItem.appendChild(navLink);
      navMenu.appendChild(navItem);

      navItems.push({
        element: navItem, link: navLink, href: `#${id}`, text: title,
      });
    });

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          navItems.forEach((item) => {
            if (item.href === `#${entry.target.id}`) {
              item.element.classList.add('active');
              item.link.setAttribute('aria-current', 'page');
            } else {
              item.element.classList.remove('active');
              item.link.removeAttribute('aria-current');
            }
          });
        }
      });
    }, { rootMargin: '-20% 0px -79% 0px' });
    sections.forEach((sec) => observer.observe(sec));
  } else {
    const navList = contentWrapper?.querySelector('ul');
    if (navList) {
      navList.querySelectorAll('li').forEach((item) => {
        const link = item.querySelector('a');
        const icon = item.querySelector('.icon');
        if (link) {
          // Create a list item wrapper
          const navItem = document.createElement('li');
          navItem.classList.add('nav-item');
          navItem.setAttribute('role', 'listitem');

          const navLink = document.createElement('a');
          const cleanHref = link.href.startsWith('https://#') ? link.href.replace('https://', '') : link.href;
          navLink.href = cleanHref;
          navLink.textContent = link.textContent;
          navLink.title = link.title || link.textContent;
          navLink.classList.add('nav-link');

          if (icon) {
            const clonedIcon = icon.cloneNode(true);
            clonedIcon.setAttribute('aria-hidden', 'true');
            navLink.prepend(clonedIcon);
          }

          navLink.addEventListener('click', () => {
            if (!isDesktop.matches) toggleMenu(nav, false);
          });

          navItem.appendChild(navLink);
          navMenu.appendChild(navItem);
          navItems.push({
            element: navItem, link: navLink, href: cleanHref, text: link.textContent.trim(),
          });
        }
      });
    }
  }

  nav.appendChild(navMenu);

  const updateActiveNavItem = () => {
    const currentHash = window.location.hash;
    const currentPath = window.location.pathname;
    let hasActiveItem = false;

    navItems.forEach((item) => {
      const { element, link, href } = item;
      let navHash = '';
      let itemNavPath = '';

      if (href.startsWith('#')) {
        navHash = href;
      } else {
        try {
          const url = new URL(href, window.location.origin);
          navHash = url.hash;
          itemNavPath = url.pathname;
        } catch (e) { return; }
      }

      let isActive = false;
      if (currentHash) {
        isActive = navHash && currentHash === navHash;
      } else {
        isActive = itemNavPath && itemNavPath !== '/' && currentPath.includes(itemNavPath);
      }

      if (isActive) {
        element.classList.add('active');
        link.setAttribute('aria-current', 'page');
        hasActiveItem = true;
      } else {
        element.classList.remove('active');
        link.removeAttribute('aria-current');
      }
    });

    if (!hasActiveItem && navItems.length > 0) {
      const dashboardItem = navItems.find((item) => item.text && item.text.toLowerCase().includes('dashboard'));
      if (dashboardItem) {
        dashboardItem.element.classList.add('active');
        dashboardItem.link.setAttribute('aria-current', 'page');
      } else {
        navItems[0].element.classList.add('active');
        navItems[0].link.setAttribute('aria-current', 'page');
      }
    }
  };

  updateActiveNavItem();
  window.addEventListener('hashchange', updateActiveNavItem);

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
  mobileHeader.appendChild(hamburger);
  if (brandElement) {
    mobileHeader.appendChild(brandElement);
  }

  // Desktop toggle button
  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'nav-desktop-toggle';
  toggleBtn.setAttribute('aria-label', 'Toggle Desktop Navigation');
  toggleBtn.innerHTML = '<span class="icon icon-chevron-left"></span>';
  toggleBtn.addEventListener('click', () => {
    nav.classList.toggle('nav-collapsed');
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
      nav.classList.remove('nav-collapsed');
    }
  };

  // Initial setup
  handleResize();
  isDesktop.addEventListener('change', handleResize);

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.append(mobileHeader);
  navWrapper.append(nav);
  navWrapper.append(toggleBtn);
  navWrapper.querySelectorAll('.icon').forEach((icon) => {
    icon.innerHTML = '';
  });
  decorateIcons(navWrapper);

  block.append(navWrapper);
}
