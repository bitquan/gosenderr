# Copilot Instructions for the Restructured Marketplace App Architecture

## Overview
The Copilot instructions for the restructured marketplace-app architecture aim to provide guidance on utilizing GitHub Copilot effectively in this context. This includes best practices, coding standards, and examples relevant to the architecture.

## Project Structure
The marketplace-app has been restructured into several microservices, each with its own responsibility.

- **User Service**: Manages user profiles, authentication, and authorization.
- **Product Service**: Handles product listings, details, and search functionality.
- **Order Service**: Manages the order processing and payment workflows.
- **Notification Service**: Responsible for sending email and push notifications.

## Using GitHub Copilot
1. **Setup**: Ensure that GitHub Copilot is enabled in your IDE.
2. **Context Awareness**: Write clear comments and code to provide context for Copilot.
3. **Write Functions**: When writing functions in the User Service, for example, include comments that describe what the function is supposed to do.
4. **Iterate**: Use Copilot suggestions as a starting point, and iterate on them to fit your specific needs.

## Best Practices
- **Be Descriptive**: The more descriptive your comments and variable names, the better suggestions you'll receive.
- **Review Suggestions**: Always review Copilot’s suggestions for accuracy and relevance.
- **Contextual Use**: Copilot works best when given clear tasks within the context of your file.

## Example Usage
```javascript
// Function to create a new user
function createUser(data) {
    // Copilot can suggest relevant implementation here
}
```

## Project Reorganization (v2) — Documentation & Repo Actions

When adding or updating high-level project-plan documentation (e.g. `docs/project-plan/*`), follow these steps to keep the repo and CI healthy:

- Linkability & discoverability
  - Add or update `docs/project-plan/README.md` and ensure it is linked from `README.md` and `docs/_sidebar.md` so teammates can find it easily.
- Local verification
  - Run `pnpm run verify:docs` and fix any missing canonical docs (the script checks for `ARCHITECTURE.md`, `DEVELOPMENT.md`, `DEPLOYMENT.md`, `API_REFERENCE.md`).
  - Run `npx -y cspell "docs/**/*.md" --exclude "docs/archive/**"` and whitelist new technical words in `cspell.json` when appropriate.
  - Run a link-checker (e.g., `markdown-link-check` or `lychee`) and fix broken links.
- Changelog & PRs
  - Add a short `CHANGELOG.md` entry summarizing the documentation addition or change in the same PR.
  - Include a short PR checklist: docs links added, `verify:docs` passes locally, `cspell` updated if needed, and follow-up issues created for migration tasks.
- Publishing
  - If you host docs (VitePress/VuePress/DocSite), update the docs sidebar or site config and build the site to confirm rendering.
- Governance
  - Update `CODEOWNERS` for new docs areas if reviewer responsibilities change.

## Conclusion
By following these guidelines and the project-plan steps, Copilot and contributors will have a clear, discoverable source of truth for the v2 reorganization. Update this file when the plan evolves so Copilot always has the latest operational context.
