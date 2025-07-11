#!/bin/bash

# Git Worktree Management Script
# This script provides convenient commands for managing git worktrees

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

WORKTREE_DIR="worktrees"

# Print usage
usage() {
    echo "Git Worktree Management Script"
    echo ""
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  add <branch-name>     - Create a new worktree for the specified branch"
    echo "  remove <branch-name>  - Remove the worktree and delete the branch"
    echo "  list                  - List all worktrees"
    echo "  clean                 - Remove all worktrees and their branches"
    echo "  status                - Show status of all worktrees"
    echo "  help                  - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 add feature/new-calendar"
    echo "  $0 remove feature/new-calendar"
    echo "  $0 list"
    echo "  $0 clean"
}

# Check if we're in a git repository
check_git_repo() {
    if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
        echo -e "${RED}Error: Not in a git repository${NC}"
        exit 1
    fi
}

# Create a new worktree
add_worktree() {
    local branch_name="$1"
    
    if [ -z "$branch_name" ]; then
        echo -e "${RED}Error: Branch name is required${NC}"
        echo "Usage: $0 add <branch-name>"
        exit 1
    fi
    
    # Check if branch already exists
    if git show-ref --verify --quiet "refs/heads/$branch_name"; then
        echo -e "${RED}Error: Branch '$branch_name' already exists${NC}"
        exit 1
    fi
    
    # Create worktree directory if it doesn't exist
    mkdir -p "$WORKTREE_DIR"
    
    # Create the worktree
    echo -e "${GREEN}Creating worktree for branch: $branch_name${NC}"
    git worktree add "$WORKTREE_DIR/$branch_name" -b "$branch_name"
    
    # Set up the new worktree
    cd "$WORKTREE_DIR/$branch_name"
    
    # Install dependencies if package.json exists
    if [ -f "package.json" ]; then
        echo -e "${BLUE}Installing dependencies in worktree...${NC}"
        npm install
    fi
    
    echo -e "${GREEN}Worktree created successfully!${NC}"
    echo -e "${BLUE}Location: $PWD${NC}"
    echo -e "${BLUE}To work in this worktree, run: cd $WORKTREE_DIR/$branch_name${NC}"
}

# Remove a worktree
remove_worktree() {
    local branch_name="$1"
    
    if [ -z "$branch_name" ]; then
        echo -e "${RED}Error: Branch name is required${NC}"
        echo "Usage: $0 remove <branch-name>"
        exit 1
    fi
    
    local worktree_path="$WORKTREE_DIR/$branch_name"
    
    if [ ! -d "$worktree_path" ]; then
        echo -e "${RED}Error: Worktree '$worktree_path' does not exist${NC}"
        exit 1
    fi
    
    echo -e "${YELLOW}Removing worktree: $worktree_path${NC}"
    
    # Remove the worktree
    git worktree remove "$worktree_path"
    
    # Delete the branch
    if git show-ref --verify --quiet "refs/heads/$branch_name"; then
        echo -e "${YELLOW}Deleting branch: $branch_name${NC}"
        git branch -D "$branch_name"
    fi
    
    echo -e "${GREEN}Worktree removed successfully!${NC}"
}

# List all worktrees
list_worktrees() {
    echo -e "${GREEN}Current worktrees:${NC}"
    git worktree list
}

# Clean all worktrees
clean_worktrees() {
    echo -e "${YELLOW}This will remove ALL worktrees and their branches${NC}"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Cancelled"
        exit 0
    fi
    
    # Get list of worktrees (excluding main worktree)
    local worktrees
    worktrees=$(git worktree list --porcelain | grep "^worktree " | cut -d' ' -f2- | grep -v "^$(git rev-parse --show-toplevel)$" || true)
    
    if [ -z "$worktrees" ]; then
        echo -e "${BLUE}No worktrees to remove${NC}"
        exit 0
    fi
    
    echo -e "${YELLOW}Removing worktrees...${NC}"
    
    while IFS= read -r worktree_path; do
        if [ -n "$worktree_path" ]; then
            echo -e "${YELLOW}Removing: $worktree_path${NC}"
            git worktree remove "$worktree_path" --force
        fi
    done <<< "$worktrees"
    
    # Remove worktree directory if empty
    if [ -d "$WORKTREE_DIR" ] && [ -z "$(ls -A "$WORKTREE_DIR")" ]; then
        rmdir "$WORKTREE_DIR"
    fi
    
    echo -e "${GREEN}All worktrees removed!${NC}"
}

# Show status of all worktrees
show_status() {
    echo -e "${GREEN}Worktree Status:${NC}"
    git worktree list
    echo ""
    
    # Get list of worktrees (excluding main worktree)
    local worktrees
    worktrees=$(git worktree list --porcelain | grep "^worktree " | cut -d' ' -f2- | grep -v "^$(git rev-parse --show-toplevel)$" || true)
    
    if [ -n "$worktrees" ]; then
        echo -e "${BLUE}Individual worktree status:${NC}"
        while IFS= read -r worktree_path; do
            if [ -n "$worktree_path" ] && [ -d "$worktree_path" ]; then
                echo -e "${YELLOW}--- $worktree_path ---${NC}"
                (cd "$worktree_path" && git status --short)
                echo ""
            fi
        done <<< "$worktrees"
    fi
}

# Main script logic
main() {
    check_git_repo
    
    case "${1:-}" in
        "add")
            add_worktree "$2"
            ;;
        "remove")
            remove_worktree "$2"
            ;;
        "list")
            list_worktrees
            ;;
        "clean")
            clean_worktrees
            ;;
        "status")
            show_status
            ;;
        "help"|"--help"|"-h")
            usage
            ;;
        "")
            echo -e "${RED}Error: No command specified${NC}"
            echo ""
            usage
            exit 1
            ;;
        *)
            echo -e "${RED}Error: Unknown command '$1'${NC}"
            echo ""
            usage
            exit 1
            ;;
    esac
}

# Run the main function with all arguments
main "$@"