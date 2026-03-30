# ProGen Audit Dashboard
The ProGen UI Audit Dashboard provides a centralized, data-driven view of UI quality, compliance, and consistency across the application. Built on top of a comprehensive UI audit checklist (200+ evaluation points), the dashboard transforms raw audit data into actionable insights for design, development, and product teams.

## Environments
- Preview: https://main--progen-audit-dashboard--acs-ui.aem.page/
- Live: https://main--progen-audit-dashboard--acs-ui.aem.live/

## Documentation

Before using the aem-boilerplate, we recommand you to go through the documentation on https://www.aem.live/docs/ and more specifically:
1. [Developer Tutorial](https://www.aem.live/developer/tutorial)
2. [The Anatomy of a Project](https://www.aem.live/developer/anatomy-of-a-project)
3. [Web Performance](https://www.aem.live/developer/keeping-it-100)
4. [Markup, Sections, Blocks, and Auto Blocking](https://www.aem.live/developer/markup-sections-blocks)

## Installation

```sh
npm i
```

## Git Hooks

Install the repo-managed hooks with:

```sh
npm run hooks:install
```

The `post-merge` hook runs only when a merge completes on the `dev` branch.
It deletes generated `blocks/**/*.css` files first, while preserving `blocks/**/*.tw.css`, and then runs `npm run build` so the CSS is recreated cleanly and merge conflicts are reduced.

## Linting

```sh
npm run lint
```

## Local development

1. Create a new repository based on the `aem-boilerplate` template
1. Add the [AEM Code Sync GitHub App](https://github.com/apps/aem-code-sync) to the repository
1. Install the [AEM CLI](https://github.com/adobe/helix-cli): `npm install -g @adobe/aem-cli`
1. Start AEM Proxy: `aem up` (opens your browser at `http://localhost:3000`)
1. Open the `{repo}` directory in your favorite IDE and start coding :)
