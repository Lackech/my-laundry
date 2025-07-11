# Development Tooling Configuration

This document outlines the development tooling setup for the Laundry Calendar application.

## Overview

The development tooling has been configured to provide a streamlined workflow for:

- Code quality and formatting
- Git worktree management
- Build and test automation
- Development environment setup

## Components Implemented

### 1. Makefile (`/Users/alechabar/my-laundry/Makefile`)

A comprehensive Makefile providing unified interface for all development tasks:

**Core Development Commands:**

- `make dev` - Start development server
- `make build` - Build for production
- `make start` - Start production server
- `make clean` - Clean build artifacts and cache

**Code Quality Commands:**

- `make lint` - Run ESLint
- `make lint-fix` - Run ESLint with auto-fix
- `make format` - Format code with Prettier
- `make format-check` - Check code formatting
- `make typecheck` - Run TypeScript type checking
- `make test` - Run tests (placeholder for future implementation)

**Git Worktree Commands:**

- `make worktree-add BRANCH=feature-name` - Create new worktree
- `make worktree-list` - List all worktrees
- `make worktree-remove BRANCH=feature-name` - Remove worktree

**Database Commands (prepared for future):**

- `make db-migrate` - Run database migrations
- `make db-reset` - Reset database
- `make db-seed` - Seed database

**Utility Commands:**

- `make install` - Install dependencies
- `make setup` - Initial project setup
- `make status` - Show project status
- `make quality` - Run all quality checks
- `make ci` - Full CI pipeline simulation

### 2. ESLint Configuration (`/Users/alechabar/my-laundry/.eslintrc.cjs`)

Enhanced ESLint configuration with:

- Remix/React/TypeScript support
- Prettier integration
- Accessibility rules (jsx-a11y)
- Import management
- TypeScript-specific rules

**Key Features:**

- Automatic code formatting via Prettier
- React best practices enforcement
- TypeScript strict checking
- Import sorting and validation
- Accessibility compliance

### 3. Prettier Configuration (`/Users/alechabar/my-laundry/.prettierrc`)

Prettier configuration optimized for:

- Consistent code formatting
- Tailwind CSS class sorting
- TypeScript/JSX support
- JSON and Markdown formatting

**Configuration:**

- 2-space indentation
- Semicolons enabled
- Double quotes for strings
- Trailing commas (ES5)
- Line width: 80 characters

### 4. Git Worktree Management (`/Users/alechabar/my-laundry/scripts/worktree.sh`)

A robust script for managing Git worktrees:

**Commands:**

- `add <branch-name>` - Create new worktree
- `remove <branch-name>` - Remove worktree and branch
- `list` - List all worktrees
- `clean` - Remove all worktrees
- `status` - Show worktree status

**Features:**

- Automatic dependency installation in new worktrees
- Branch conflict detection
- Safe removal with confirmations
- Colored output for better UX

### 5. Package.json Scripts (`/Users/alechabar/my-laundry/package.json`)

Extended npm scripts for:

- Development workflow
- Code quality checks
- Build and deployment
- Worktree management via script delegation

## Usage Examples

### Starting Development

```bash
make dev
# or
npm run dev
```

### Code Quality Check

```bash
make quality
# Runs: typecheck, lint, format-check
```

### Creating Feature Branch

```bash
make worktree-add BRANCH=feature/new-calendar
cd worktrees/feature/new-calendar
# Work on feature in isolation
```

### Pre-commit Workflow

```bash
make format
make lint-fix
make quality
```

### CI Pipeline Simulation

```bash
make ci
# Runs: clean, install, quality, test, build
```

## File Structure

```
my-laundry/
├── Makefile                    # Main development commands
├── .eslintrc.cjs              # ESLint configuration
├── .prettierrc                # Prettier configuration
├── .prettierignore            # Prettier ignore patterns
├── scripts/
│   └── worktree.sh           # Git worktree management
├── worktrees/                 # Git worktrees (created as needed)
└── logs/                      # Application logs (created as needed)
```

## Dependencies Added

**Development Dependencies:**

- `prettier@^2.8.8` - Code formatting
- `eslint-config-prettier@^10.1.5` - ESLint/Prettier integration
- `eslint-plugin-prettier@^4.2.1` - Prettier as ESLint plugin
- `prettier-plugin-tailwindcss@^0.2.8` - Tailwind CSS class sorting

## Integration Points

### With Remix

- ESLint configured for Remix patterns
- TypeScript checking for Remix routes
- Build process integrated with Vite

### With Git

- Worktree management for feature development
- Proper gitignore for tooling artifacts
- Branch-based development workflow

### With CI/CD

- Quality gates for automated checks
- Build validation
- Test preparation (scripts ready)

## Future Enhancements

1. **Test Integration**: Add Jest/Vitest for unit tests
2. **Playwright Setup**: E2E testing configuration
3. **Database Tools**: Migration and seeding scripts
4. **Docker Integration**: Container-based development
5. **GitHub Actions**: Automated CI/CD pipeline

## Best Practices

1. **Always run `make quality` before commits**
2. **Use worktrees for feature development**
3. **Format code with `make format` before reviews**
4. **Check project status with `make status`**
5. **Use `make setup` for initial environment preparation**

## Troubleshooting

### Common Issues

1. **ESLint errors**: Run `make lint-fix` to auto-fix
2. **Formatting issues**: Run `make format` to fix formatting
3. **TypeScript errors**: Run `make typecheck` to see details
4. **Build failures**: Run `make clean` then `make build`

### Debug Commands

```bash
make status          # Check overall project health
make worktree-list   # See all active worktrees
npm run typecheck    # Detailed TypeScript checking
```

This tooling setup provides a robust foundation for development, ensuring code quality, consistency,
and efficient workflows for the Laundry Calendar project.
