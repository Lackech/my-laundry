# Laundry Calendar System Architecture

## Executive Summary

The Laundry Calendar application is a shared laundry facility coordination system designed to prevent conflicts, enable reservations, and provide real-time notifications for residential buildings. This architecture document outlines a comprehensive technical solution built on Remix, Tailwind CSS, and SQLite, with a mobile-first approach and emphasis on reliability and performance.

## 1. Overall System Architecture

### 1.1 High-Level System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Mobile Web    │  │   Desktop Web   │  │   PWA (Future)  │ │
│  │     (React)     │  │     (React)     │  │                 │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 │ HTTPS
                                 │
┌─────────────────────────────────────────────────────────────────┐
│                    Application Layer                            │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                   Remix App Router                          │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │ │
│  │  │   Auth      │  │   Calendar  │  │   Machine Status    │ │ │
│  │  │   Routes    │  │   Routes    │  │   Routes            │ │ │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘ │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │ │
│  │  │   Queue     │  │   Settings  │  │   Notification      │ │ │
│  │  │   Routes    │  │   Routes    │  │   Routes            │ │ │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 │
┌─────────────────────────────────────────────────────────────────┐
│                     Service Layer                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │   Auth      │  │   Machine   │  │   Reservation           │ │
│  │   Service   │  │   Service   │  │   Service               │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │   Queue     │  │   Email     │  │   Validation            │ │
│  │   Service   │  │   Service   │  │   Service               │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 │
┌─────────────────────────────────────────────────────────────────┐
│                      Data Layer                                 │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                   SQLite Database                           │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │ │
│  │  │   Users     │  │   Machines  │  │   Reservations      │ │ │
│  │  │   Table     │  │   Table     │  │   Table             │ │ │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘ │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │ │
│  │  │   Queue     │  │   Sessions  │  │   Notifications     │ │ │
│  │  │   Table     │  │   Table     │  │   Table             │ │ │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Component Interaction Patterns

**Request Flow Pattern:**
1. Client requests → Remix Router → Route Handler
2. Route Handler → Service Layer → Data Layer
3. Data Layer → Service Layer → Route Handler
4. Route Handler → Client Response

**Real-time Updates Pattern:**
1. Machine status changes → WebSocket/Server-Sent Events
2. Queue position updates → Push notifications
3. Reservation confirmations → Email notifications

### 1.3 Data Flow Architecture

```
User Action → Route Handler → Service Layer → Database
     ↓              ↓              ↓             ↓
UI Update ← Response ← Business Logic ← Data Persistence
```

## 2. Technology Stack Specification

### 2.1 Frontend Stack
- **Framework**: Remix 2.x (React-based, full-stack)
- **Styling**: Tailwind CSS 3.x with shadcn/ui components
- **Icons**: Lucide React icons
- **Forms**: Remix Form with Zod validation
- **State Management**: Remix built-in state + React hooks
- **Real-time**: Server-Sent Events (SSE) for live updates

### 2.2 Backend Stack
- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Remix (server-side rendering)
- **Database**: SQLite with Prisma ORM
- **Authentication**: Custom email-based with JWT sessions
- **Email**: Nodemailer with SMTP provider
- **Validation**: Zod schema validation
- **Logging**: Winston with structured JSON output

### 2.3 Development Tools
- **Package Manager**: npm/yarn
- **Build Tool**: Vite (via Remix)
- **Testing**: Playwright for E2E, Vitest for unit tests
- **Linting**: ESLint + Prettier
- **Type Checking**: TypeScript strict mode
- **Process Management**: Makefile targets

### 2.4 Deployment Stack
- **Database**: SQLite (development) → PostgreSQL (production)
- **Hosting**: Vercel/Netlify/Railway (serverless)
- **CDN**: Built-in via hosting provider
- **Monitoring**: Simple logging + error tracking
- **SSL**: Automatic via hosting provider

## 3. Data Models and Database Schema

### 3.1 Core Entities

```sql
-- Users table
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Machines table
CREATE TABLE machines (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('washer', 'dryer')),
    name TEXT NOT NULL,
    location TEXT,
    status TEXT DEFAULT 'available' CHECK (status IN ('available', 'in_use', 'maintenance')),
    current_user_id TEXT REFERENCES users(id),
    current_reservation_id TEXT REFERENCES reservations(id),
    estimated_end_time DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Reservations table
CREATE TABLE reservations (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    machine_id TEXT NOT NULL REFERENCES machines(id),
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    duration_minutes INTEGER NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'cancelled')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Queue table
CREATE TABLE queue (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    machine_id TEXT NOT NULL REFERENCES machines(id),
    position INTEGER NOT NULL,
    notification_sent BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Sessions table
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Email verifications table
CREATE TABLE email_verifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    token TEXT NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Notifications table
CREATE TABLE notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    type TEXT NOT NULL CHECK (type IN ('machine_available', 'reservation_reminder', 'queue_position')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    email_sent BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 3.2 Database Indexes

```sql
-- Performance indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_machines_type_status ON machines(type, status);
CREATE INDEX idx_reservations_user_start ON reservations(user_id, start_time);
CREATE INDEX idx_reservations_machine_time ON reservations(machine_id, start_time, end_time);
CREATE INDEX idx_queue_machine_position ON queue(machine_id, position);
CREATE INDEX idx_sessions_user_expires ON sessions(user_id, expires_at);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, read);
```

### 3.3 Data Validation Rules

```typescript
// User validation
const UserSchema = z.object({
  email: z.string().email().max(255),
  name: z.string().min(2).max(100),
});

// Reservation validation
const ReservationSchema = z.object({
  machineId: z.string().uuid(),
  startTime: z.date().min(new Date()),
  durationMinutes: z.number().min(30).max(180),
});

// Machine status validation
const MachineStatusSchema = z.enum(['available', 'in_use', 'maintenance']);
```

## 4. API Design

### 4.1 RESTful Endpoints

#### Authentication Endpoints
```typescript
POST /api/auth/register
POST /api/auth/login
POST /api/auth/verify-email
POST /api/auth/logout
GET  /api/auth/me
```

#### Machine Management
```typescript
GET    /api/machines              // List all machines
GET    /api/machines/:id          // Get machine details
POST   /api/machines/:id/status   // Update machine status
GET    /api/machines/:id/availability // Check availability
```

#### Reservation Management
```typescript
GET    /api/reservations          // List user's reservations
POST   /api/reservations          // Create new reservation
GET    /api/reservations/:id      // Get reservation details
PUT    /api/reservations/:id      // Update reservation
DELETE /api/reservations/:id      // Cancel reservation
```

#### Queue Management
```typescript
GET    /api/queue                 // List user's queue positions
POST   /api/queue                 // Join queue
DELETE /api/queue/:id             // Leave queue
GET    /api/queue/:machineId      // Get queue for machine
```

#### Calendar Views
```typescript
GET    /api/calendar/daily/:date  // Daily calendar view
GET    /api/calendar/weekly/:date // Weekly calendar view
GET    /api/calendar/availability // Available slots
```

### 4.2 Real-time Updates

```typescript
// Server-Sent Events for live updates
GET /api/sse/machines             // Machine status updates
GET /api/sse/queue                // Queue position updates
GET /api/sse/reservations         // Reservation updates
```

### 4.3 Error Response Format

```typescript
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  timestamp: string;
  requestId: string;
}
```

## 5. Frontend Architecture

### 5.1 Component Structure

```
app/
├── components/
│   ├── ui/                    # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── calendar.tsx
│   │   └── ...
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Navigation.tsx
│   │   └── Layout.tsx
│   ├── features/
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx
│   │   │   ├── RegisterForm.tsx
│   │   │   └── EmailVerification.tsx
│   │   ├── machines/
│   │   │   ├── MachineCard.tsx
│   │   │   ├── MachineStatus.tsx
│   │   │   └── MachineList.tsx
│   │   ├── reservations/
│   │   │   ├── ReservationForm.tsx
│   │   │   ├── ReservationCard.tsx
│   │   │   └── ReservationList.tsx
│   │   ├── queue/
│   │   │   ├── QueuePosition.tsx
│   │   │   ├── QueueList.tsx
│   │   │   └── JoinQueue.tsx
│   │   └── calendar/
│   │       ├── DailyView.tsx
│   │       ├── WeeklyView.tsx
│   │       └── CalendarGrid.tsx
│   └── shared/
│       ├── LoadingSpinner.tsx
│       ├── ErrorBoundary.tsx
│       └── Toast.tsx
└── routes/
    ├── _index.tsx             # Dashboard
    ├── auth/
    │   ├── login.tsx
    │   ├── register.tsx
    │   └── verify.tsx
    ├── machines/
    │   ├── _index.tsx
    │   └── $id.tsx
    ├── reservations/
    │   ├── _index.tsx
    │   ├── new.tsx
    │   └── $id.tsx
    ├── queue/
    │   └── _index.tsx
    ├── calendar/
    │   ├── daily.tsx
    │   └── weekly.tsx
    └── settings/
        └── _index.tsx
```

### 5.2 Mobile-First Responsive Design

```css
/* Breakpoint strategy */
/* Mobile: 320px - 768px */
/* Tablet: 768px - 1024px */
/* Desktop: 1024px+ */

/* Component sizing */
.machine-card {
  @apply w-full p-4 mb-4;
  @apply md:w-1/2 md:p-6;
  @apply lg:w-1/3 lg:p-8;
}

/* Touch targets */
.touch-target {
  @apply min-h-[44px] min-w-[44px];
}

/* Navigation */
.nav-mobile {
  @apply fixed bottom-0 left-0 right-0 z-50;
  @apply bg-white border-t border-gray-200;
  @apply md:hidden;
}

.nav-desktop {
  @apply hidden md:flex;
}
```

### 5.3 State Management Approach

```typescript
// Context for global state
interface AppState {
  user: User | null;
  machines: Machine[];
  reservations: Reservation[];
  queue: QueuePosition[];
  notifications: Notification[];
}

// Remix loaders for data fetching
export const loader: LoaderFunction = async ({ request }) => {
  const session = await getSession(request);
  const user = await getUserFromSession(session);
  
  return json({
    user,
    machines: await getMachines(),
    reservations: await getUserReservations(user.id),
    queue: await getUserQueue(user.id),
  });
};

// Actions for mutations
export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const result = await createReservation(formData);
  
  if (result.success) {
    return redirect('/reservations');
  }
  
  return json({ error: result.error }, { status: 400 });
};
```

## 6. Development Environment Setup

### 6.1 Makefile Targets

```makefile
# Development commands
.PHONY: dev test build clean install lint format

# Install dependencies
install:
	npm install

# Start development server
dev:
	npm run dev

# Run tests
test:
	npm run test

# Run E2E tests
test-e2e:
	npx playwright test

# Build for production
build:
	npm run build

# Lint code
lint:
	npm run lint

# Format code
format:
	npm run format

# Database commands
db-migrate:
	npx prisma migrate dev

db-seed:
	npx prisma db seed

db-reset:
	npx prisma migrate reset --force

# Log tailing
tail-log:
	tail -f logs/app.log | grep -E '(ERROR|WARN|INFO)'

# Git workflow
feature-start:
	git worktree add -b feature/$(name) ../$(name) HEAD

feature-finish:
	git worktree remove ../$(name)

# Health check
health:
	curl -f http://localhost:3000/health || exit 1

# Clean up
clean:
	rm -rf node_modules
	rm -rf build
	rm -rf .cache
```

### 6.2 Docker vs Local Development

**Decision: Local Development First**

Rationale:
- Faster iteration cycles
- Simpler debugging
- Better integration with system tools
- Lower resource usage

Docker configuration provided for production deployment:

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

### 6.3 Git Workflow with Worktrees

```bash
# Feature development workflow
make feature-start name=reservation-system
cd ../reservation-system
# ... develop feature ...
git commit -m "feat: add reservation system"
git push origin feature/reservation-system
# ... create PR ...
cd ../main
make feature-finish name=reservation-system
```

### 6.4 Logging Configuration

```typescript
// logging.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/app.log' })
  ]
});

// Usage
logger.info('Reservation created', { 
  userId: '123', 
  machineId: '456', 
  startTime: new Date() 
});
```

## 7. Security Architecture

### 7.1 Authentication Flow

```typescript
// 1. User Registration
POST /api/auth/register
{
  "email": "user@example.com",
  "name": "John Doe"
}

// 2. Email Verification
GET /api/auth/verify-email?token=abc123

// 3. Login
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "temporary_token"
}

// 4. Session Management
Cookie: session=jwt_token; HttpOnly; Secure; SameSite=Strict
```

### 7.2 Session Management

```typescript
// Session creation
const session = await createSession(user.id);
const token = jwt.sign({ sessionId: session.id }, JWT_SECRET, {
  expiresIn: '7d'
});

// Session validation middleware
export const requireAuth = async (request: Request) => {
  const token = getCookie(request, 'session');
  const payload = jwt.verify(token, JWT_SECRET);
  const session = await getSession(payload.sessionId);
  
  if (!session || session.expiresAt < new Date()) {
    throw new Response('Unauthorized', { status: 401 });
  }
  
  return session.user;
};
```

### 7.3 Data Validation and Sanitization

```typescript
// Input validation
const validateReservation = (data: unknown) => {
  const schema = z.object({
    machineId: z.string().uuid(),
    startTime: z.string().datetime(),
    durationMinutes: z.number().min(30).max(180)
  });
  
  return schema.parse(data);
};

// SQL injection prevention (Prisma handles this)
const reservation = await prisma.reservation.create({
  data: {
    userId: user.id,
    machineId: validatedData.machineId,
    startTime: new Date(validatedData.startTime),
    durationMinutes: validatedData.durationMinutes
  }
});
```

### 7.4 Security Headers

```typescript
// Security middleware
export const securityHeaders = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline';"
};
```

## 8. Performance and Scalability

### 8.1 Database Optimization

```sql
-- Query optimization
EXPLAIN QUERY PLAN
SELECT r.*, m.name as machine_name
FROM reservations r
JOIN machines m ON r.machine_id = m.id
WHERE r.user_id = ? AND r.start_time > ?
ORDER BY r.start_time;

-- Connection pooling
const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### 8.2 Caching Patterns

```typescript
// In-memory cache for frequently accessed data
const cache = new Map<string, { data: any; expires: number }>();

const getCachedMachines = async () => {
  const key = 'machines:all';
  const cached = cache.get(key);
  
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }
  
  const machines = await prisma.machine.findMany();
  cache.set(key, { data: machines, expires: Date.now() + 60000 });
  return machines;
};

// HTTP caching headers
export const loader: LoaderFunction = async ({ request }) => {
  const data = await getMachines();
  
  return json(data, {
    headers: {
      'Cache-Control': 'public, max-age=60',
      'ETag': generateETag(data)
    }
  });
};
```

### 8.3 Mobile Performance

```typescript
// Lazy loading for mobile
const MachineCard = lazy(() => import('./MachineCard'));

// Image optimization
const OptimizedImage = ({ src, alt, ...props }) => {
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      {...props}
    />
  );
};

// Bundle splitting
const routes = [
  {
    path: '/machines',
    lazy: () => import('./routes/machines'),
  },
  {
    path: '/reservations',
    lazy: () => import('./routes/reservations'),
  }
];
```

### 8.4 PostgreSQL Migration Strategy

```typescript
// Environment-based database configuration
const getDatabaseConfig = () => {
  if (process.env.NODE_ENV === 'production') {
    return {
      provider: 'postgresql',
      url: process.env.DATABASE_URL,
      connectionLimit: 10,
    };
  }
  
  return {
    provider: 'sqlite',
    url: 'file:./dev.db',
  };
};

// Migration script
const migrateSQLiteToPostgreSQL = async () => {
  const sqliteData = await exportSQLiteData();
  const pgClient = new Client({ connectionString: process.env.DATABASE_URL });
  
  await pgClient.connect();
  await importDataToPostgreSQL(pgClient, sqliteData);
  await pgClient.end();
};
```

## 9. Risk Mitigation Architecture

### 9.1 Reservation Conflict Prevention

```typescript
// Pessimistic locking for reservation creation
const createReservation = async (data: ReservationData) => {
  return await prisma.$transaction(async (tx) => {
    // Lock the machine record
    const machine = await tx.machine.findUnique({
      where: { id: data.machineId },
      select: { id: true, status: true }
    });
    
    if (machine?.status !== 'available') {
      throw new Error('Machine not available');
    }
    
    // Check for overlapping reservations
    const overlapping = await tx.reservation.findFirst({
      where: {
        machineId: data.machineId,
        status: { in: ['pending', 'active'] },
        OR: [
          {
            startTime: { lte: data.startTime },
            endTime: { gt: data.startTime }
          },
          {
            startTime: { lt: data.endTime },
            endTime: { gte: data.endTime }
          }
        ]
      }
    });
    
    if (overlapping) {
      throw new Error('Time slot conflicts with existing reservation');
    }
    
    // Create reservation
    return await tx.reservation.create({ data });
  });
};
```

### 9.2 Queue State Consistency

```typescript
// Atomic queue operations
const joinQueue = async (userId: string, machineId: string) => {
  return await prisma.$transaction(async (tx) => {
    // Check if user already in queue
    const existing = await tx.queue.findFirst({
      where: { userId, machineId }
    });
    
    if (existing) {
      throw new Error('User already in queue');
    }
    
    // Get next position
    const lastPosition = await tx.queue.findFirst({
      where: { machineId },
      orderBy: { position: 'desc' },
      select: { position: true }
    });
    
    const position = (lastPosition?.position || 0) + 1;
    
    // Add to queue
    return await tx.queue.create({
      data: { userId, machineId, position }
    });
  });
};

// Queue cleanup job
const cleanupQueue = async () => {
  await prisma.queue.deleteMany({
    where: {
      createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    }
  });
};
```

### 9.3 Email Delivery Reliability

```typescript
// Email service with retry logic
class EmailService {
  private transporter = nodemailer.createTransporter({
    host: process.env.SMTP_HOST,
    port: 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
  
  async sendEmail(to: string, subject: string, html: string, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        await this.transporter.sendMail({
          from: process.env.FROM_EMAIL,
          to,
          subject,
          html
        });
        
        // Log successful send
        logger.info('Email sent successfully', { to, subject });
        return;
      } catch (error) {
        logger.error('Email send failed', { to, subject, error, attempt: i + 1 });
        
        if (i === retries - 1) {
          throw error;
        }
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
      }
    }
  }
}

// Email queue for background processing
const emailQueue = new Map<string, EmailJob>();

const processEmailQueue = async () => {
  for (const [id, job] of emailQueue) {
    try {
      await emailService.sendEmail(job.to, job.subject, job.html);
      emailQueue.delete(id);
    } catch (error) {
      job.retries++;
      if (job.retries >= 3) {
        emailQueue.delete(id);
        logger.error('Email job failed permanently', { id, error });
      }
    }
  }
};
```

### 9.4 Error Handling and Recovery

```typescript
// Global error handler
export const errorHandler = (error: Error, request: Request) => {
  logger.error('Application error', {
    error: error.message,
    stack: error.stack,
    url: request.url,
    method: request.method,
    timestamp: new Date().toISOString()
  });
  
  // Don't expose internal errors to users
  if (error.name === 'ValidationError') {
    return json({ error: 'Invalid input data' }, { status: 400 });
  }
  
  if (error.name === 'UnauthorizedError') {
    return json({ error: 'Authentication required' }, { status: 401 });
  }
  
  return json({ error: 'Internal server error' }, { status: 500 });
};

// Circuit breaker pattern for external services
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private threshold = 5;
  private timeout = 60000;
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.isOpen()) {
      throw new Error('Circuit breaker is open');
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private isOpen() {
    return this.failures >= this.threshold && 
           Date.now() - this.lastFailureTime < this.timeout;
  }
  
  private onSuccess() {
    this.failures = 0;
  }
  
  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
  }
}
```

## 10. Testing Strategy

### 10.1 Unit Testing Approach

```typescript
// Test utilities
export const createTestUser = async (overrides = {}) => {
  return await prisma.user.create({
    data: {
      email: 'test@example.com',
      name: 'Test User',
      emailVerified: true,
      ...overrides
    }
  });
};

// Service tests
describe('ReservationService', () => {
  beforeEach(async () => {
    await prisma.user.deleteMany();
    await prisma.machine.deleteMany();
    await prisma.reservation.deleteMany();
  });
  
  it('should create a reservation for available machine', async () => {
    const user = await createTestUser();
    const machine = await createTestMachine();
    
    const reservation = await createReservation({
      userId: user.id,
      machineId: machine.id,
      startTime: new Date(Date.now() + 60000),
      durationMinutes: 60
    });
    
    expect(reservation.status).toBe('pending');
  });
  
  it('should prevent overlapping reservations', async () => {
    const user = await createTestUser();
    const machine = await createTestMachine();
    const startTime = new Date(Date.now() + 60000);
    
    // Create first reservation
    await createReservation({
      userId: user.id,
      machineId: machine.id,
      startTime,
      durationMinutes: 60
    });
    
    // Try to create overlapping reservation
    await expect(createReservation({
      userId: user.id,
      machineId: machine.id,
      startTime: new Date(startTime.getTime() + 30 * 60000),
      durationMinutes: 60
    })).rejects.toThrow('Time slot conflicts');
  });
});
```

### 10.2 Integration Testing with Playwright

```typescript
// e2e/reservation.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Reservation System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.fill('[data-testid="email"]', 'test@example.com');
    await page.click('[data-testid="login-button"]');
  });
  
  test('should create a reservation', async ({ page }) => {
    await page.goto('/machines');
    
    // Select available machine
    await page.click('[data-testid="machine-card"]:first-child');
    
    // Fill reservation form
    await page.fill('[data-testid="duration"]', '60');
    await page.click('[data-testid="start-time"]');
    await page.click('[data-testid="time-slot"]:first-child');
    
    // Submit reservation
    await page.click('[data-testid="create-reservation"]');
    
    // Verify success
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="reservation-card"]')).toBeVisible();
  });
  
  test('should handle reservation conflicts', async ({ page }) => {
    // Create initial reservation
    await createReservation(page);
    
    // Try to create conflicting reservation
    await page.goto('/machines');
    await page.click('[data-testid="machine-card"]:first-child');
    // ... fill same time slot
    await page.click('[data-testid="create-reservation"]');
    
    // Verify error message
    await expect(page.locator('[data-testid="error-message"]')).toContainText('conflicts');
  });
});
```

### 10.3 Performance Testing

```typescript
// performance/load-test.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Performance Tests', () => {
  test('should handle concurrent reservations', async ({ browser }) => {
    const contexts = await Promise.all([
      browser.newContext(),
      browser.newContext(),
      browser.newContext()
    ]);
    
    const pages = await Promise.all(contexts.map(ctx => ctx.newPage()));
    
    // Simulate concurrent reservation attempts
    const promises = pages.map(async (page, index) => {
      await page.goto('/machines');
      await page.fill('[data-testid="email"]', `user${index}@example.com`);
      await page.click('[data-testid="login-button"]');
      
      // Try to reserve same machine at same time
      await page.click('[data-testid="machine-card"]:first-child');
      await page.fill('[data-testid="duration"]', '60');
      await page.click('[data-testid="start-time"]');
      await page.click('[data-testid="time-slot"]:first-child');
      
      return page.click('[data-testid="create-reservation"]');
    });
    
    const results = await Promise.allSettled(promises);
    
    // Only one should succeed
    const successful = results.filter(r => r.status === 'fulfilled').length;
    expect(successful).toBe(1);
  });
});
```

### 10.4 Mobile Testing Strategy

```typescript
// Mobile-specific tests
test.describe('Mobile Experience', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE
  
  test('should be usable on mobile', async ({ page }) => {
    await page.goto('/');
    
    // Check touch targets
    const buttons = await page.locator('button').all();
    for (const button of buttons) {
      const box = await button.boundingBox();
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
    
    // Check navigation
    await page.click('[data-testid="menu-button"]');
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
  });
  
  test('should handle touch gestures', async ({ page }) => {
    await page.goto('/calendar');
    
    // Swipe to change week
    await page.touchscreen.tap(200, 300);
    await page.touchscreen.tap(100, 300);
    
    // Verify week changed
    await expect(page.locator('[data-testid="week-indicator"]')).toContainText('Next Week');
  });
});
```

## Conclusion

This comprehensive system architecture provides a robust foundation for the Laundry Calendar application. The design prioritizes:

1. **Reliability**: Through conflict prevention, transaction management, and error handling
2. **Performance**: Via caching, optimization, and mobile-first design
3. **Security**: Through proper authentication, validation, and security headers
4. **Scalability**: With clear migration paths and modular architecture
5. **Maintainability**: Through clean code organization and comprehensive testing

The architecture addresses all identified high-risk areas while maintaining simplicity and adhering to the project's constraints. The modular design allows for future enhancements while providing a solid MVP foundation.

Key architectural decisions:
- **Remix framework** for full-stack simplicity
- **SQLite → PostgreSQL** migration path for scalability
- **Email-based authentication** for simplicity
- **Mobile-first responsive design** for primary use case
- **Comprehensive testing strategy** for reliability
- **Makefile-based tooling** for developer productivity

This architecture provides a clear roadmap for implementation while maintaining flexibility for future requirements and scaling needs.