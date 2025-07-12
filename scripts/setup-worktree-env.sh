#!/bin/bash

# Setup Worktree Environment Script
# This script sets up the necessary environment and Prisma configuration for each worktree

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

WORKTREE_PATH="$1"

if [ -z "$WORKTREE_PATH" ]; then
    echo "Usage: $0 <worktree-path>"
    echo "Example: $0 worktrees/feature/calendar-integration"
    exit 1
fi

if [ ! -d "$WORKTREE_PATH" ]; then
    echo "Error: Worktree path '$WORKTREE_PATH' does not exist"
    exit 1
fi

echo -e "${GREEN}Setting up environment for worktree: $WORKTREE_PATH${NC}"

# Copy .env.example to .env if it doesn't exist
if [ ! -f "$WORKTREE_PATH/.env" ]; then
    echo -e "${BLUE}Creating .env file...${NC}"
    cp .env.example "$WORKTREE_PATH/.env"
    
    # Update DATABASE_URL to use a unique database for this worktree
    FEATURE_NAME=$(basename "$WORKTREE_PATH")
    sed -i '' "s|DATABASE_URL=\"file:./dev.db\"|DATABASE_URL=\"file:./dev-${FEATURE_NAME}.db\"|g" "$WORKTREE_PATH/.env"
    echo -e "${YELLOW}Updated DATABASE_URL to use dev-${FEATURE_NAME}.db${NC}"
fi

# Navigate to worktree
cd "$WORKTREE_PATH"

echo -e "${BLUE}Generating Prisma client...${NC}"
npx prisma generate

echo -e "${BLUE}Setting up database...${NC}"
npx prisma db push

echo -e "${BLUE}Seeding database...${NC}"
npm run db:seed

echo -e "${BLUE}Installing Playwright browsers...${NC}"
npx playwright install

echo -e "${GREEN}Worktree environment setup complete!${NC}"
echo -e "${BLUE}You can now run:${NC}"
echo -e "${BLUE}  cd $WORKTREE_PATH && npm run dev${NC}"
echo -e "${BLUE}  cd $WORKTREE_PATH && npm test${NC}"