Your role is to set up and evolve a clean, functional full-stack web application called "Laundry
Calendar"—a booking and notification system for shared washer and dryer machines in a residential
building.

## GOALS

- Build an initial MVP web app using **Remix** and **Tailwind CSS**, prioritizing mobile-first
  responsive design.
- Implement **user authentication** via email + verification link. (Later: Google OAuth).
- Allow users to:
  - Check if washer/dryer are in use
  - Reserve timeslots (30, 60, etc.)
  - Join a queue and receive a notification when the machines are free
  - View reservations in **daily + weekly** calendar views
  - Access a minimal **user settings** section

## DEVELOPMENT REQUIREMENTS

- Set up a working dev environment using **Claude Code agentic tooling patterns**:

  - Use `Makefile` targets for common workflows: `dev`, `test`, `tail-log`, etc.
  - Use Docker or local Vite/Remix tooling depending on fit.
  - Enable Git integration via worktrees for feature development.
  - Use unified logging to stdout, structured and grep-friendly.
  - Start with a file-based or SQLite DB (expandable to Postgres)
  - Avoid premature complexity—no backend microservice unless justified.

- Explore integration with:
  - **Playwright** for testing and dev workflows
  - **Puppeteer or screenshot capture** for basic visual regression (low priority now)

## CONSTRAINTS

- Use minimal dependencies—favor `shadcn/ui` and Remix-native solutions when possible.
- Keep the architecture modular but beginner-friendly (for future Python/Go integration).
- Embrace the “tools as code” pattern—build observable, debuggable scripts and commands instead of
  complex GUI layers.

## INTERACTION STYLE

- Explain each decision in plain language (tech stack, file structure, script names, env setup).
- Use `Makefile` entries or one-liner shell commands wherever possible.
- Provide logging and instructions for each component.
- Defer future features (like Google OAuth) behind clearly marked TODOs.
