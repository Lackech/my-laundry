# Laundry Calendar - Development Makefile
# This Makefile provides a unified interface for all development tasks

# Variables
NODE_MODULES := node_modules
BUILD_DIR := build
CACHE_DIR := .cache
LOG_DIR := logs
WORKTREE_DIR := worktrees

# Colors for output
RED := \033[0;31m
GREEN := \033[0;32m
YELLOW := \033[0;33m
BLUE := \033[0;34m
NC := \033[0m # No Color

# Default target
.PHONY: help
help:
	@echo "$(BLUE)Laundry Calendar - Development Commands$(NC)"
	@echo ""
	@echo "$(GREEN)Core Development:$(NC)"
	@echo "  dev          - Start development server"
	@echo "  build        - Build for production"
	@echo "  start        - Start production server"
	@echo "  clean        - Clean build artifacts and cache"
	@echo ""
	@echo "$(GREEN)Code Quality:$(NC)"
	@echo "  lint         - Run ESLint"
	@echo "  lint-fix     - Run ESLint with auto-fix"
	@echo "  format       - Format code with Prettier"
	@echo "  format-check - Check code formatting"
	@echo "  typecheck    - Run TypeScript type checking"
	@echo "  test         - Run tests"
	@echo ""
	@echo "$(GREEN)Database:$(NC)"
	@echo "  db-generate  - Generate Prisma client"
	@echo "  db-push      - Push schema changes to database"
	@echo "  db-migrate   - Run database migrations"
	@echo "  db-reset     - Reset database"
	@echo "  db-seed      - Seed database with test data"
	@echo "  db-studio    - Open Prisma Studio"
	@echo "  db-format    - Format Prisma schema"
	@echo "  db-validate  - Validate Prisma schema"
	@echo "  db-status    - Show database status"
	@echo "  db-backup    - Create database backup"
	@echo "  db-clean     - Clean database files"
	@echo ""
	@echo "$(GREEN)Git Workflow:$(NC)"
	@echo "  worktree-add - Add new worktree (usage: make worktree-add BRANCH=feature-name)"
	@echo "  worktree-list - List all worktrees"
	@echo "  worktree-remove - Remove worktree (usage: make worktree-remove BRANCH=feature-name)"
	@echo ""
	@echo "$(GREEN)Utilities:$(NC)"
	@echo "  install      - Install dependencies"
	@echo "  update       - Update dependencies"
	@echo "  setup        - Initial project setup"
	@echo "  status       - Show project status"
	@echo ""
	@echo "$(GREEN)Logging:$(NC)"
	@echo "  tail-log     - Follow application logs"
	@echo "  tail-error   - Follow error logs"
	@echo "  tail-access  - Follow access logs"
	@echo "  log-grep     - Search logs (usage: make log-grep PATTERN=error)"
	@echo "  log-stats    - Show log statistics"
	@echo "  log-cleanup  - Clean old log files"
	@echo "  log-analyze  - Analyze log patterns"

# Core Development Commands
.PHONY: dev
dev:
	@echo "$(GREEN)Starting development server...$(NC)"
	@npm run dev

.PHONY: build
build:
	@echo "$(GREEN)Building for production...$(NC)"
	@npm run build

.PHONY: start
start:
	@echo "$(GREEN)Starting production server...$(NC)"
	@npm run start

.PHONY: clean
clean:
	@echo "$(YELLOW)Cleaning build artifacts...$(NC)"
	@rm -rf $(BUILD_DIR)
	@rm -rf $(CACHE_DIR)
	@rm -rf $(LOG_DIR)
	@rm -rf node_modules/.cache
	@echo "$(GREEN)Clean completed$(NC)"

# Code Quality Commands
.PHONY: lint
lint:
	@echo "$(GREEN)Running ESLint...$(NC)"
	@npm run lint

.PHONY: lint-fix
lint-fix:
	@echo "$(GREEN)Running ESLint with auto-fix...$(NC)"
	@npm run lint -- --fix

.PHONY: format
format:
	@echo "$(GREEN)Formatting code with Prettier...$(NC)"
	@npx prettier --write "**/*.{js,jsx,ts,tsx,json,css,md,yml,yaml}"

.PHONY: format-check
format-check:
	@echo "$(GREEN)Checking code formatting...$(NC)"
	@npx prettier --check "**/*.{js,jsx,ts,tsx,json,css,md,yml,yaml}"

.PHONY: typecheck
typecheck:
	@echo "$(GREEN)Running TypeScript type checking...$(NC)"
	@npm run typecheck

.PHONY: test
test:
	@echo "$(GREEN)Running tests...$(NC)"
	@if [ -f "package.json" ] && grep -q '"test"' package.json; then \
		npm test; \
	else \
		echo "$(YELLOW)No test command configured yet$(NC)"; \
	fi

# Database Commands
.PHONY: db-generate
db-generate:
	@echo "$(GREEN)Generating Prisma client...$(NC)"
	@npm run db:generate

.PHONY: db-push
db-push:
	@echo "$(GREEN)Pushing schema changes to database...$(NC)"
	@npm run db:push

.PHONY: db-migrate
db-migrate:
	@echo "$(GREEN)Running database migrations...$(NC)"
	@npm run db:migrate

.PHONY: db-migrate-deploy
db-migrate-deploy:
	@echo "$(GREEN)Deploying database migrations...$(NC)"
	@npm run db:migrate:deploy

.PHONY: db-reset
db-reset:
	@echo "$(YELLOW)Resetting database...$(NC)"
	@npm run db:migrate:reset

.PHONY: db-seed
db-seed:
	@echo "$(GREEN)Seeding database...$(NC)"
	@npm run db:seed

.PHONY: db-studio
db-studio:
	@echo "$(GREEN)Opening Prisma Studio...$(NC)"
	@npm run db:studio

.PHONY: db-format
db-format:
	@echo "$(GREEN)Formatting Prisma schema...$(NC)"
	@npm run db:format

.PHONY: db-validate
db-validate:
	@echo "$(GREEN)Validating Prisma schema...$(NC)"
	@npm run db:validate

.PHONY: db-status
db-status:
	@echo "$(GREEN)Database Status:$(NC)"
	@echo "Database file: $$([ -f "prisma/dev.db" ] && echo "✓ dev.db exists" || echo "✗ dev.db not found")"
	@echo "Generated client: $$([ -d "generated/prisma" ] && echo "✓ Prisma client generated" || echo "✗ Prisma client not generated")"
	@echo "Schema file: $$([ -f "prisma/schema.prisma" ] && echo "✓ Schema exists" || echo "✗ Schema not found")"
	@if [ -f "prisma/dev.db" ]; then \
		echo "Database size: $$(du -h prisma/dev.db | cut -f1)"; \
	fi

.PHONY: db-backup
db-backup:
	@echo "$(GREEN)Creating database backup...$(NC)"
	@if [ -f "prisma/dev.db" ]; then \
		cp prisma/dev.db "prisma/dev.db.backup.$$(date +%Y%m%d_%H%M%S)"; \
		echo "$(GREEN)Backup created: prisma/dev.db.backup.$$(date +%Y%m%d_%H%M%S)$(NC)"; \
	else \
		echo "$(YELLOW)No database file found to backup$(NC)"; \
	fi

.PHONY: db-clean
db-clean:
	@echo "$(YELLOW)Cleaning database files...$(NC)"
	@rm -f prisma/dev.db
	@rm -f prisma/dev.db-journal
	@rm -rf generated/prisma
	@echo "$(GREEN)Database files cleaned$(NC)"

# Git Worktree Commands
.PHONY: worktree-add
worktree-add:
	@if [ -z "$(BRANCH)" ]; then \
		echo "$(RED)Error: BRANCH parameter required$(NC)"; \
		echo "Usage: make worktree-add BRANCH=feature-name"; \
		exit 1; \
	fi
	@echo "$(GREEN)Creating worktree for branch: $(BRANCH)$(NC)"
	@mkdir -p $(WORKTREE_DIR)
	@git worktree add $(WORKTREE_DIR)/$(BRANCH) -b $(BRANCH)
	@echo "$(GREEN)Worktree created at: $(WORKTREE_DIR)/$(BRANCH)$(NC)"

.PHONY: worktree-list
worktree-list:
	@echo "$(GREEN)Current worktrees:$(NC)"
	@git worktree list

.PHONY: worktree-remove
worktree-remove:
	@if [ -z "$(BRANCH)" ]; then \
		echo "$(RED)Error: BRANCH parameter required$(NC)"; \
		echo "Usage: make worktree-remove BRANCH=feature-name"; \
		exit 1; \
	fi
	@echo "$(GREEN)Removing worktree for branch: $(BRANCH)$(NC)"
	@git worktree remove $(WORKTREE_DIR)/$(BRANCH)
	@git branch -D $(BRANCH) 2>/dev/null || true
	@echo "$(GREEN)Worktree removed$(NC)"

# Utility Commands
.PHONY: install
install:
	@echo "$(GREEN)Installing dependencies...$(NC)"
	@npm install

.PHONY: update
update:
	@echo "$(GREEN)Updating dependencies...$(NC)"
	@npm update

# Logging Commands
.PHONY: tail-log
tail-log:
	@echo "$(GREEN)Following application logs...$(NC)"
	@mkdir -p $(LOG_DIR)
	@if [ -f "$(LOG_DIR)/app-$$(date +%Y-%m-%d).log" ]; then \
		tail -f $(LOG_DIR)/app-$$(date +%Y-%m-%d).log; \
	elif [ -f "$(LOG_DIR)/app.log" ]; then \
		tail -f $(LOG_DIR)/app.log; \
	else \
		echo "$(YELLOW)No log file found$(NC)"; \
		echo "$(BLUE)Logs will be created when the application starts logging$(NC)"; \
		echo "$(BLUE)Starting to watch for new logs...$(NC)"; \
		touch $(LOG_DIR)/app-$$(date +%Y-%m-%d).log; \
		tail -f $(LOG_DIR)/app-$$(date +%Y-%m-%d).log; \
	fi

.PHONY: tail-error
tail-error:
	@echo "$(GREEN)Following error logs...$(NC)"
	@mkdir -p $(LOG_DIR)
	@if [ -f "$(LOG_DIR)/error-$$(date +%Y-%m-%d).log" ]; then \
		tail -f $(LOG_DIR)/error-$$(date +%Y-%m-%d).log; \
	else \
		echo "$(YELLOW)No error log file found$(NC)"; \
		echo "$(BLUE)Creating error log file...$(NC)"; \
		touch $(LOG_DIR)/error-$$(date +%Y-%m-%d).log; \
		tail -f $(LOG_DIR)/error-$$(date +%Y-%m-%d).log; \
	fi

.PHONY: tail-access
tail-access:
	@echo "$(GREEN)Following access logs...$(NC)"
	@mkdir -p $(LOG_DIR)
	@if [ -f "$(LOG_DIR)/access-$$(date +%Y-%m-%d).log" ]; then \
		tail -f $(LOG_DIR)/access-$$(date +%Y-%m-%d).log; \
	else \
		echo "$(YELLOW)No access log file found$(NC)"; \
		echo "$(BLUE)Creating access log file...$(NC)"; \
		touch $(LOG_DIR)/access-$$(date +%Y-%m-%d).log; \
		tail -f $(LOG_DIR)/access-$$(date +%Y-%m-%d).log; \
	fi

.PHONY: log-grep
log-grep:
	@if [ -z "$(PATTERN)" ]; then \
		echo "$(RED)Error: PATTERN parameter required$(NC)"; \
		echo "Usage: make log-grep PATTERN=error"; \
		exit 1; \
	fi
	@echo "$(GREEN)Searching logs for pattern: $(PATTERN)$(NC)"
	@mkdir -p $(LOG_DIR)
	@if [ -d "$(LOG_DIR)" ] && [ "$$(ls -A $(LOG_DIR))" ]; then \
		grep -r "$(PATTERN)" $(LOG_DIR)/ --color=always || echo "$(YELLOW)No matches found$(NC)"; \
	else \
		echo "$(YELLOW)No log files found$(NC)"; \
	fi

.PHONY: log-stats
log-stats:
	@echo "$(GREEN)Log Statistics:$(NC)"
	@mkdir -p $(LOG_DIR)
	@if [ -d "$(LOG_DIR)" ] && [ "$$(ls -A $(LOG_DIR))" ]; then \
		echo "$(BLUE)Log files:$(NC)"; \
		ls -la $(LOG_DIR)/; \
		echo ""; \
		echo "$(BLUE)Total log size:$(NC)"; \
		du -sh $(LOG_DIR); \
		echo ""; \
		echo "$(BLUE)Error count (last 24h):$(NC)"; \
		find $(LOG_DIR) -name "*error*" -mtime -1 -exec grep -c "error\|Error\|ERROR" {} \; 2>/dev/null | awk '{sum += $$1} END {print sum ? sum : 0}'; \
		echo ""; \
		echo "$(BLUE)Recent activity:$(NC)"; \
		find $(LOG_DIR) -name "*.log" -mtime -1 -exec echo "Recent: {}" \; -exec tail -3 {} \; 2>/dev/null | head -20; \
	else \
		echo "$(YELLOW)No log files found$(NC)"; \
	fi

.PHONY: log-cleanup
log-cleanup:
	@echo "$(GREEN)Cleaning up old log files...$(NC)"
	@mkdir -p $(LOG_DIR)
	@if [ -d "$(LOG_DIR)" ]; then \
		echo "$(BLUE)Removing log files older than 30 days...$(NC)"; \
		find $(LOG_DIR) -name "*.log" -mtime +30 -exec echo "Removing: {}" \; -exec rm {} \; 2>/dev/null || true; \
		echo "$(BLUE)Compressing log files older than 7 days...$(NC)"; \
		find $(LOG_DIR) -name "*.log" -mtime +7 ! -name "*.gz" -exec echo "Compressing: {}" \; -exec gzip {} \; 2>/dev/null || true; \
		echo "$(GREEN)Log cleanup completed$(NC)"; \
	else \
		echo "$(YELLOW)No log directory found$(NC)"; \
	fi

.PHONY: log-analyze
log-analyze:
	@echo "$(GREEN)Analyzing log patterns...$(NC)"
	@mkdir -p $(LOG_DIR)
	@if [ -d "$(LOG_DIR)" ] && [ "$$(ls -A $(LOG_DIR))" ]; then \
		echo "$(BLUE)Top 10 error patterns:$(NC)"; \
		grep -h "error\|Error\|ERROR" $(LOG_DIR)/*.log 2>/dev/null | sed 's/.*"message":"\([^"]*\)".*/\1/' | sort | uniq -c | sort -nr | head -10 || echo "No errors found"; \
		echo ""; \
		echo "$(BLUE)HTTP status codes:$(NC)"; \
		grep -h "statusCode" $(LOG_DIR)/*.log 2>/dev/null | sed 's/.*"statusCode":\([0-9]*\).*/\1/' | sort | uniq -c | sort -nr || echo "No HTTP status codes found"; \
		echo ""; \
		echo "$(BLUE)Performance (slowest operations):$(NC)"; \
		grep -h "duration" $(LOG_DIR)/*.log 2>/dev/null | sed 's/.*"duration":\([0-9]*\).*/\1/' | sort -nr | head -10 || echo "No duration data found"; \
	else \
		echo "$(YELLOW)No log files found$(NC)"; \
	fi

.PHONY: setup
setup:
	@echo "$(GREEN)Setting up development environment...$(NC)"
	@npm install
	@echo "$(GREEN)Running initial type check...$(NC)"
	@npm run typecheck
	@echo "$(GREEN)Running initial lint check...$(NC)"
	@npm run lint
	@echo "$(GREEN)Setup completed!$(NC)"

.PHONY: status
status:
	@echo "$(BLUE)Project Status:$(NC)"
	@echo "Node version: $$(node --version)"
	@echo "NPM version: $$(npm --version)"
	@echo "Git status:"
	@git status --short
	@echo ""
	@echo "Dependencies installed: $$([ -d "$(NODE_MODULES)" ] && echo "Yes" || echo "No")"
	@echo "Build exists: $$([ -d "$(BUILD_DIR)" ] && echo "Yes" || echo "No")"

# Quality Gate - run all quality checks
.PHONY: quality
quality: typecheck lint format-check
	@echo "$(GREEN)All quality checks passed!$(NC)"

# CI/CD pipeline simulation
.PHONY: ci
ci: clean install quality test build
	@echo "$(GREEN)CI pipeline completed successfully!$(NC)"

# Development workflow
.PHONY: dev-setup
dev-setup: clean install format quality
	@echo "$(GREEN)Development setup completed!$(NC)"