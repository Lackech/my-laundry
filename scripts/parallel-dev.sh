#!/bin/bash

# Parallel Development Orchestrator
# This script sets up and manages parallel development streams using git worktrees

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

WORKTREE_DIR="worktrees"

# Print usage
usage() {
    echo -e "${CYAN}Parallel Development Orchestrator${NC}"
    echo ""
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  setup <feature1> <feature2> <feature3>  - Set up 3 parallel worktrees"
    echo "  start <prompt>                          - Start parallel implementation with given prompt"
    echo "  status                                  - Show status of all development streams"
    echo "  integrate <feature>                     - Integrate a completed feature back to main"
    echo "  cleanup                                 - Clean up all parallel development worktrees"
    echo "  open-terminals                          - Open new terminal tabs for each worktree"
    echo ""
    echo "Examples:"
    echo "  $0 setup calendar-integration machine-booking queue-management"
    echo "  $0 start \"Implement calendar view with booking integration\""
    echo "  $0 status"
    echo "  $0 integrate calendar-integration"
}

# Check if we're in a git repository
check_git_repo() {
    if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
        echo -e "${RED}Error: Not in a git repository${NC}"
        exit 1
    fi
}

# Set up parallel worktrees
setup_worktrees() {
    local feature1="feature/$1"
    local feature2="feature/$2" 
    local feature3="feature/$3"
    
    if [ -z "$1" ] || [ -z "$2" ] || [ -z "$3" ]; then
        echo -e "${RED}Error: Three feature names are required${NC}"
        echo "Usage: $0 setup <feature1> <feature2> <feature3>"
        exit 1
    fi
    
    echo -e "${GREEN}Setting up parallel development environment...${NC}"
    echo -e "${BLUE}Creating worktrees for: $feature1, $feature2, $feature3${NC}"
    
    # Create worktrees using the existing script
    ./scripts/worktree.sh add "$feature1"
    ./scripts/worktree.sh add "$feature2"
    ./scripts/worktree.sh add "$feature3"
    
    echo -e "${GREEN}Parallel worktrees created successfully!${NC}"
    echo -e "${YELLOW}Worktree locations:${NC}"
    echo -e "  📁 $WORKTREE_DIR/$feature1"
    echo -e "  📁 $WORKTREE_DIR/$feature2"
    echo -e "  📁 $WORKTREE_DIR/$feature3"
    echo ""
    echo -e "${BLUE}Setting up environments for all worktrees...${NC}"
    
    # Set up environment for each worktree
    ./scripts/setup-worktree-env.sh "$WORKTREE_DIR/$feature1"
    ./scripts/setup-worktree-env.sh "$WORKTREE_DIR/$feature2"
    ./scripts/setup-worktree-env.sh "$WORKTREE_DIR/$feature3"
    
    echo ""
    echo -e "${GREEN}All worktrees ready for development!${NC}"
    echo -e "${BLUE}Next steps:${NC}"
    echo -e "  1. Run: $0 open-terminals"
    echo -e "  2. Run: $0 start \"your implementation prompt\""
    echo -e "  3. Each worktree now supports: npm run dev && npm test"
}

# Open terminal tabs for each worktree
open_terminals() {
    local worktrees
    worktrees=$(find "$WORKTREE_DIR" -maxdepth 1 -type d -name "feature*" 2>/dev/null || true)
    
    if [ -z "$worktrees" ]; then
        echo -e "${RED}Error: No feature worktrees found${NC}"
        echo -e "${YELLOW}Run: $0 setup <feature1> <feature2> <feature3> first${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}Opening terminal tabs for each worktree...${NC}"
    
    # Detect terminal and open tabs accordingly
    if [ "$TERM_PROGRAM" = "iTerm.app" ]; then
        # iTerm2
        while IFS= read -r worktree_path; do
            if [ -n "$worktree_path" ]; then
                feature_name=$(basename "$worktree_path")
                echo -e "${BLUE}Opening iTerm tab for: $feature_name${NC}"
                osascript -e "
                tell application \"iTerm2\"
                    tell current window
                        create tab with default profile
                        tell current session
                            write text \"cd '$PWD/$worktree_path'\"
                            write text \"echo 'Ready to work on $feature_name'\"
                            write text \"echo 'Use: claude --agent implementation_agent \\\"implement $feature_name\\\"'\"
                        end tell
                    end tell
                end tell"
            fi
        done <<< "$worktrees"
    elif [ "$TERM_PROGRAM" = "Apple_Terminal" ]; then
        # macOS Terminal
        while IFS= read -r worktree_path; do
            if [ -n "$worktree_path" ]; then
                feature_name=$(basename "$worktree_path")
                echo -e "${BLUE}Opening Terminal tab for: $feature_name${NC}"
                osascript -e "
                tell application \"Terminal\"
                    activate
                    tell application \"System Events\" to keystroke \"t\" using command down
                    do script \"cd '$PWD/$worktree_path' && echo 'Ready to work on $feature_name'\" in front window
                end tell"
            fi
        done <<< "$worktrees"
    else
        # Generic terminal - just print commands
        echo -e "${YELLOW}Manual terminal setup required:${NC}"
        while IFS= read -r worktree_path; do
            if [ -n "$worktree_path" ]; then
                feature_name=$(basename "$worktree_path")
                echo -e "${CYAN}Terminal for $feature_name:${NC}"
                echo -e "  cd $PWD/$worktree_path"
                echo -e "  # Ready to implement $feature_name"
                echo ""
            fi
        done <<< "$worktrees"
    fi
}

# Start parallel implementation
start_implementation() {
    local prompt="$1"
    
    if [ -z "$prompt" ]; then
        echo -e "${RED}Error: Implementation prompt is required${NC}"
        echo "Usage: $0 start \"your implementation prompt\""
        exit 1
    fi
    
    local worktrees
    worktrees=$(find "$WORKTREE_DIR" -maxdepth 1 -type d -name "feature*" 2>/dev/null || true)
    
    if [ -z "$worktrees" ]; then
        echo -e "${RED}Error: No feature worktrees found${NC}"
        echo -e "${YELLOW}Run: $0 setup <feature1> <feature2> <feature3> first${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}Starting parallel implementation...${NC}"
    echo -e "${BLUE}Prompt: $prompt${NC}"
    echo ""
    
    local worktree_array=()
    while IFS= read -r worktree_path; do
        if [ -n "$worktree_path" ]; then
            worktree_array+=("$worktree_path")
        fi
    done <<< "$worktrees"
    
    echo -e "${YELLOW}Implementation strategy for ${#worktree_array[@]} parallel streams:${NC}"
    for i in "${!worktree_array[@]}"; do
        local feature_name=$(basename "${worktree_array[$i]}")
        echo -e "${CYAN}Stream $((i+1)): $feature_name${NC}"
        echo -e "  📁 Location: ${worktree_array[$i]}"
        echo -e "  🎯 Focus: Part $((i+1)) of: $prompt"
        echo ""
    done
    
    echo -e "${GREEN}Ready for parallel development!${NC}"
    echo -e "${BLUE}Commands to run in each terminal:${NC}"
    for i in "${!worktree_array[@]}"; do
        local feature_name=$(basename "${worktree_array[$i]}")
        echo -e "${YELLOW}Terminal $((i+1)) ($feature_name):${NC}"
        echo -e "  claude --agent implementation_agent \"Implement $feature_name: $prompt\""
        echo ""
    done
}

# Show status of all streams
show_status() {
    echo -e "${GREEN}Parallel Development Status:${NC}"
    ./scripts/worktree.sh status
    
    echo -e "${BLUE}Development Stream Summary:${NC}"
    local worktrees
    worktrees=$(find "$WORKTREE_DIR" -maxdepth 1 -type d -name "feature*" 2>/dev/null || true)
    
    if [ -n "$worktrees" ]; then
        while IFS= read -r worktree_path; do
            if [ -n "$worktree_path" ] && [ -d "$worktree_path" ]; then
                local feature_name=$(basename "$worktree_path")
                echo -e "${CYAN}🔧 $feature_name${NC}"
                
                # Check if there are uncommitted changes
                local status
                status=$(cd "$worktree_path" && git status --porcelain)
                if [ -n "$status" ]; then
                    echo -e "  ${YELLOW}⚠️  Uncommitted changes${NC}"
                else
                    echo -e "  ${GREEN}✅ Clean working directory${NC}"
                fi
                
                # Check commits ahead of main
                local ahead
                ahead=$(cd "$worktree_path" && git rev-list --count HEAD ^main 2>/dev/null || echo "0")
                if [ "$ahead" -gt 0 ]; then
                    echo -e "  ${BLUE}📈 $ahead commits ahead of main${NC}"
                else
                    echo -e "  ${YELLOW}🔄 Up to date with main${NC}"
                fi
                echo ""
            fi
        done <<< "$worktrees"
    else
        echo -e "${YELLOW}No active development streams${NC}"
    fi
}

# Integrate a feature back to main
integrate_feature() {
    local feature_name="$1"
    
    if [ -z "$feature_name" ]; then
        echo -e "${RED}Error: Feature name is required${NC}"
        echo "Usage: $0 integrate <feature-name>"
        exit 1
    fi
    
    local feature_branch="feature/$feature_name"
    local worktree_path="$WORKTREE_DIR/$feature_branch"
    
    if [ ! -d "$worktree_path" ]; then
        echo -e "${RED}Error: Worktree for $feature_name not found${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}Integrating feature: $feature_name${NC}"
    
    # Switch to the worktree and run tests
    echo -e "${BLUE}Running tests in worktree...${NC}"
    (cd "$worktree_path" && npm test) || {
        echo -e "${RED}Tests failed! Fix tests before integrating.${NC}"
        exit 1
    }
    
    # Switch to main branch and merge
    echo -e "${BLUE}Switching to main branch...${NC}"
    git checkout main
    git pull origin main
    
    echo -e "${BLUE}Merging feature branch...${NC}"
    git merge "$feature_branch" --no-ff -m "Integrate $feature_name

    ✨ Features added:
    - Implementation of $feature_name
    
    🧪 Testing:
    - All tests passing
    
    🔧 Generated with parallel development workflow"
    
    echo -e "${GREEN}Feature integrated successfully!${NC}"
    echo -e "${YELLOW}Next steps:${NC}"
    echo -e "  1. Run tests on main: npm test"
    echo -e "  2. Clean up worktree: $0 cleanup"
    echo -e "  3. Push to remote: git push origin main"
}

# Clean up all parallel development worktrees
cleanup_worktrees() {
    echo -e "${YELLOW}Cleaning up parallel development environment...${NC}"
    ./scripts/worktree.sh clean
    echo -e "${GREEN}Cleanup complete!${NC}"
}

# Main script logic
main() {
    check_git_repo
    
    case "${1:-}" in
        "setup")
            setup_worktrees "$2" "$3" "$4"
            ;;
        "start")
            start_implementation "$2"
            ;;
        "status")
            show_status
            ;;
        "integrate")
            integrate_feature "$2"
            ;;
        "cleanup")
            cleanup_worktrees
            ;;
        "open-terminals")
            open_terminals
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