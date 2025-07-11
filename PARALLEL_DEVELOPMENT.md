# Parallel Development System

This system allows you to run 3 implementation agents simultaneously using git worktrees, each working on different features in isolated environments.

## 🚀 Quick Start

### 1. Set Up Parallel Development Environment

```bash
# Create 3 worktrees for parallel features
npm run parallel:setup calendar-integration machine-booking queue-management
```

### 2. Open Multiple Terminal Sessions

```bash
# This will open new terminal tabs/windows for each worktree
npm run parallel:terminals
```

### 3. Start Parallel Implementation

```bash
# In each terminal, navigate to the worktree and start the agent
npm run parallel:start "Implement a complete laundry booking system with calendar integration"
```

## 📋 Available Commands

| Command | Description |
|---------|-------------|
| `npm run parallel:setup <f1> <f2> <f3>` | Create 3 parallel worktrees |
| `npm run parallel:start "<prompt>"` | Show commands to start parallel agents |
| `npm run parallel:status` | Check status of all development streams |
| `npm run parallel:terminals` | Open terminal tabs for each worktree |
| `npm run parallel:integrate <feature>` | Merge completed feature to main |
| `npm run parallel:cleanup` | Remove all parallel worktrees |

## 🔄 Complete Workflow Example

### 1. Initialize Parallel Development

```bash
# Set up 3 feature branches
npm run parallel:setup user-dashboard notifications admin-panel

# Open terminals for each feature
npm run parallel:terminals
```

### 2. In Each Terminal Tab/Window

**Terminal 1 (User Dashboard):**
```bash
cd worktrees/feature/user-dashboard
# Use Claude with implementation agent
claude --agent implementation_agent "Implement user dashboard with profile management, preferences, and usage statistics"
```

**Terminal 2 (Notifications):**
```bash
cd worktrees/feature/notifications  
# Use Claude with implementation agent
claude --agent implementation_agent "Implement notification system with email alerts, in-app notifications, and user preferences"
```

**Terminal 3 (Admin Panel):**
```bash
cd worktrees/feature/admin-panel
# Use Claude with implementation agent
claude --agent implementation_agent "Implement admin dashboard with user management, machine monitoring, and system analytics"
```

### 3. Monitor Progress

```bash
# Check status anytime
npm run parallel:status
```

### 4. Integrate Completed Features

```bash
# When a feature is complete, integrate it
npm run parallel:integrate user-dashboard
npm run parallel:integrate notifications
npm run parallel:integrate admin-panel
```

### 5. Final Cleanup

```bash
# Remove all worktrees when done
npm run parallel:cleanup
```

## 🎯 Recommended Feature Combinations

### High-Impact Features (Medium Conflict Risk)
- **Stream 1:** Calendar Integration & Booking
- **Stream 2:** Machine Management & Status
- **Stream 3:** Queue System & Notifications

### Low-Conflict Features (Recommended)
- **Stream 1:** User Dashboard & Profile
- **Stream 2:** Notification System
- **Stream 3:** Admin Panel & Analytics

### Advanced Features
- **Stream 1:** Mobile Responsive Design
- **Stream 2:** Real-time Updates (WebSockets)
- **Stream 3:** Payment Integration

## 🛠️ Implementation Agent Usage

In each worktree terminal, use one of these patterns:

### Using Claude Code with Custom Agent
```bash
# Use the implementation agent from .claude/commands/
claude --agent implementation_agent "Implement [feature description]"
```

### Using the Parallel Implementation Orchestrator
```bash
# Use the specialized parallel agent
claude --agent parallel_implementation_agent "Coordinate implementation of [features]"
```

## 📁 Project Structure During Parallel Development

```
my-laundry/
├── app/                          # Main codebase
├── worktrees/
│   ├── feature/
│   │   ├── user-dashboard/       # Independent copy with deps
│   │   ├── notifications/        # Independent copy with deps  
│   │   └── admin-panel/          # Independent copy with deps
├── scripts/
│   ├── worktree.sh              # Git worktree management
│   └── parallel-dev.sh          # Parallel development orchestrator
└── .claude/commands/
    └── parallel_implementation_agent.md
```

## ⚡ Benefits

1. **Parallel Development:** 3x faster feature development
2. **Isolation:** Each feature developed independently
3. **No Conflicts:** Work on different parts simultaneously
4. **Easy Integration:** Systematic merge process
5. **Full Testing:** Each feature tested before integration

## 🔧 Technical Details

### Git Worktree Benefits
- Each worktree is a complete, independent working copy
- Shared git history but isolated working directories
- Independent package installations and dependencies
- Parallel testing and development possible

### Agent Coordination
- Each implementation agent works in focused scope
- Clear boundaries prevent overlap
- Systematic integration process
- Quality gates at each step

### Integration Strategy
- Features designed for clean merging
- Testing required before integration
- Progressive integration maintains stability
- Rollback capability if issues arise

## 🚨 Best Practices

1. **Choose Non-Conflicting Features:** Select features that modify different files
2. **Test Before Integration:** Always run tests in each worktree before merging
3. **Regular Sync:** Periodically sync worktrees with main branch
4. **Clear Boundaries:** Ensure each agent has distinct scope
5. **Communication:** Use the status command to monitor all streams

## 🐛 Troubleshooting

### Common Issues

**Worktree Creation Fails:**
```bash
# Clean up and try again
npm run parallel:cleanup
npm run parallel:setup <f1> <f2> <f3>
```

**Merge Conflicts:**
```bash
# Sync worktree with main first
cd worktrees/feature/your-feature
git fetch origin
git rebase origin/main
```

**Dependencies Out of Sync:**
```bash
# Reinstall dependencies in worktree
cd worktrees/feature/your-feature
rm -rf node_modules package-lock.json
npm install
```

---

**Ready to accelerate your development with parallel implementation streams!** 🚀