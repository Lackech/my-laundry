# My Laundry - Laundry Calendar Application

A modern, full-stack laundry management application built with Remix, TypeScript, and SQLite. This
application allows users to schedule laundry machine reservations, manage queues, and receive
notifications.

## Features

### Core Features

- **User Authentication**: Email-based registration with verification
- **Machine Management**: Real-time machine status tracking
- **Reservation System**: Book laundry machines with conflict prevention
- **Queue Management**: Join queues when machines are busy
- **Calendar Views**: Daily and weekly schedule views
- **Email Notifications**: Automated email alerts for reservations and queue updates

### Technical Features

- **Authentication**: JWT-based session management with refresh tokens
- **Database**: SQLite with Prisma ORM and comprehensive indexing
- **Email System**: Nodemailer integration with retry logic
- **Logging**: Structured logging with Winston
- **Testing**: Playwright E2E tests
- **Development Tools**: ESLint, Prettier, TypeScript

## Tech Stack

- **Frontend**: Remix (React), TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Remix (Node.js), TypeScript
- **Database**: SQLite with Prisma ORM
- **Authentication**: JWT, bcrypt
- **Email**: Nodemailer
- **Testing**: Playwright
- **Styling**: Tailwind CSS
- **Logging**: Winston

## Quick Start

### Prerequisites

- Node.js >= 20.0.0
- npm or yarn
- Git

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd my-laundry
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your configuration:

   ```env
   DATABASE_URL="file:./dev.db"
   JWT_SECRET="your-secret-key-change-in-production"
   JWT_REFRESH_SECRET="your-refresh-secret-key-change-in-production"
   EMAIL_HOST="smtp.gmail.com"
   EMAIL_PORT="587"
   EMAIL_USER="your-email@gmail.com"
   EMAIL_PASS="your-app-password"
   EMAIL_FROM="My Laundry App <noreply@mylaundry.com>"
   BASE_URL="http://localhost:3000"
   ```

4. **Set up the database**

   ```bash
   npm run db:push
   npm run db:seed
   ```

5. **Start the development server**

   ```bash
   npm run dev
   ```

6. **Open your browser** Navigate to `http://localhost:3000`

## Scripts

### Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server

### Database

- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema to database
- `npm run db:migrate` - Run migrations
- `npm run db:seed` - Seed database with sample data
- `npm run db:studio` - Open Prisma Studio

### Code Quality

- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run format` - Format code with Prettier
- `npm run typecheck` - Check TypeScript types

### Testing

- `npm test` - Run Playwright tests
- `npm run test:ui` - Run tests with UI
- `npm run test:debug` - Debug tests

### Maintenance

- `npm run clean` - Clean build artifacts
- `npm run setup` - Install and check everything
- `npm run quality` - Run all quality checks
- `npm run ci` - Full CI pipeline

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `POST /api/auth/verify-email` - Verify email address
- `POST /api/auth/refresh` - Refresh access token

### Machines

- `GET /api/machines` - Get all machines
- `GET /api/machines/:id` - Get machine details

### Reservations

- `GET /api/reservations` - Get user reservations
- `POST /api/reservations` - Create reservation
- `DELETE /api/reservations` - Cancel reservation
- `GET /api/reservations/:id` - Get reservation details
- `PUT /api/reservations/:id` - Update reservation
- `DELETE /api/reservations/:id` - Delete reservation

### Queue

- `GET /api/queue` - Get user queue entries
- `POST /api/queue` - Join queue
- `DELETE /api/queue` - Leave queue
- `GET /api/queue/position` - Get queue position

### Calendar

- `GET /api/calendar?view=daily&date=2024-01-01` - Get daily calendar
- `GET /api/calendar?view=weekly&date=2024-01-01` - Get weekly calendar

### Notifications

- `GET /api/notifications` - Get user notifications
- `POST /api/notifications` - Mark notification as read
- `DELETE /api/notifications` - Delete notification

## Database Schema

### Core Models

- **User**: User accounts with authentication
- **Machine**: Washer/dryer machines with status tracking
- **Reservation**: Time-based machine bookings
- **QueueEntry**: Queue management for busy machines
- **Session**: User authentication sessions
- **Notification**: Email notifications with delivery tracking

### Key Features

- **Conflict Prevention**: Overlapping reservations are prevented
- **Queue Management**: Automatic position tracking and notifications
- **Session Management**: JWT tokens with refresh capability
- **Notification System**: Retry logic and delivery tracking

## Email Configuration

### Gmail Setup

1. Enable 2-factor authentication
2. Generate an App Password
3. Use App Password in `EMAIL_PASS` environment variable

### Other Email Providers

Configure SMTP settings in environment variables:

- `EMAIL_HOST` - SMTP server hostname
- `EMAIL_PORT` - SMTP port (587 for TLS)
- `EMAIL_USER` - SMTP username
- `EMAIL_PASS` - SMTP password

## Development Workflow

### Adding New Features

1. Create database migrations if needed
2. Update API endpoints
3. Add UI components
4. Write tests
5. Update documentation

### Database Changes

1. Modify `prisma/schema.prisma`
2. Run `npm run db:migrate`
3. Update seed data if needed

### Code Quality

- Use TypeScript for type safety
- Follow ESLint and Prettier configurations
- Write tests for new features
- Add proper error handling and logging

## Production Deployment

### Environment Setup

1. Set secure JWT secrets
2. Configure email service
3. Set up SSL/TLS
4. Configure proper logging

### Database

1. Use PostgreSQL for production
2. Set up database backups
3. Configure connection pooling

### Security

- Use environment variables for secrets
- Enable HTTPS
- Set up proper CORS
- Implement rate limiting

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and quality checks
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For issues or questions:

1. Check the documentation
2. Search existing issues
3. Create a new issue with details

## Architecture

### Frontend

- **Remix**: React-based full-stack framework
- **TypeScript**: Type-safe JavaScript
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: Reusable component library

### Backend

- **Remix**: Server-side rendering and API routes
- **Prisma**: Database ORM with type safety
- **Winston**: Structured logging
- **JWT**: Authentication tokens

### Database

- **SQLite**: Development database
- **Prisma**: Schema management and migrations
- **Indexing**: Performance optimization

### Testing

- **Playwright**: End-to-end testing
- **TypeScript**: Type checking

This application provides a complete laundry management solution with modern development practices
and production-ready features.
