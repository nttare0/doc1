# Overview

A full-stack document management system built for Zeolf organization that enables secure document storage, sharing, and collaboration. The application provides role-based access control, activity tracking, and supports multiple document formats including PDFs, Word documents, Excel sheets, and PowerPoint presentations. The system is designed with a modern tech stack featuring React frontend, Express.js backend, PostgreSQL database, and comprehensive UI components for an intuitive user experience.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety and modern development
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management and caching
- **UI Framework**: Shadcn/ui components built on Radix UI primitives with Tailwind CSS for styling
- **Form Handling**: React Hook Form with Zod validation for robust form management
- **File Upload**: Uppy.js for advanced file upload capabilities with drag-and-drop support

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript for full-stack type safety
- **Authentication**: Passport.js with local strategy using login codes instead of passwords
- **Session Management**: Express sessions with PostgreSQL session store for persistence
- **File Upload**: Multer middleware for handling multipart/form-data uploads
- **Security**: Bcrypt-equivalent password hashing using Node.js crypto module

## Database Design
- **Primary Database**: PostgreSQL with Neon serverless hosting
- **ORM**: Drizzle ORM for type-safe database queries and migrations
- **Schema Structure**:
  - Users table with role-based access (super_admin/user)
  - Documents table with metadata and file information
  - Document shares for granular sharing permissions
  - Activity logs for comprehensive audit trails
- **Connection**: Neon serverless pool with WebSocket support

## File Storage Strategy
- **Local Storage**: Multer disk storage for uploaded files in `/uploads` directory
- **File Processing**: Support for multiple MIME types with size limits (50MB)
- **Metadata Tracking**: Original filename preservation with unique generated filenames

## Authentication & Authorization
- **Login Method**: Unique login codes instead of traditional email/password
- **Session Security**: HTTP-only cookies with CSRF protection
- **Role System**: Two-tier access control (super_admin and user roles)
- **Protected Routes**: Client-side route protection with authentication checks

## API Architecture
- **RESTful Design**: Standard HTTP methods for CRUD operations
- **Error Handling**: Centralized error middleware with proper status codes
- **Request Logging**: Comprehensive logging for API endpoints with performance metrics
- **File Serving**: Direct file downloads through protected endpoints

## Development & Build System
- **Bundler**: Vite for fast development and optimized production builds
- **Development**: Hot module replacement with error overlay for debugging
- **Production**: ESBuild for server bundling with external package optimization
- **Environment**: Separate development and production configurations

## UI/UX Design Philosophy
- **Component System**: Modular, reusable components following atomic design principles
- **Responsive Design**: Mobile-first approach with adaptive layouts
- **Accessibility**: Radix UI primitives ensure WCAG compliance
- **Theme System**: CSS custom properties for consistent design tokens
- **Loading States**: Skeleton components and proper loading indicators

## Category Management
Documents are organized into five primary categories:
- Press Releases
- Memos  
- Internal Letters
- Contracts
- Follow-ups

Each category has distinct visual indicators and filtering capabilities.

# External Dependencies

## Core Framework Dependencies
- **@neondatabase/serverless**: PostgreSQL serverless database connection
- **drizzle-orm**: Type-safe ORM for database operations
- **express**: Web application framework for Node.js
- **passport**: Authentication middleware with local strategy
- **multer**: File upload handling middleware

## Frontend UI Dependencies
- **@radix-ui/***: Comprehensive set of accessible UI primitives
- **@tanstack/react-query**: Server state management and caching
- **wouter**: Lightweight routing library for React
- **tailwindcss**: Utility-first CSS framework
- **react-hook-form**: Performant form library with validation

## File Upload & Processing
- **@uppy/core**: Modular file uploader core
- **@uppy/dashboard**: File upload UI component
- **@uppy/aws-s3**: Cloud storage integration (configured but not actively used)

## Development Tools
- **vite**: Fast build tool and development server
- **typescript**: Static type checking
- **@replit/vite-plugin-runtime-error-modal**: Development error handling
- **@replit/vite-plugin-cartographer**: Replit integration for development

## Database & Sessions
- **connect-pg-simple**: PostgreSQL session store for Express
- **ws**: WebSocket implementation for Neon database connections

## Security & Validation
- **zod**: TypeScript-first schema validation
- **drizzle-zod**: Integration between Drizzle ORM and Zod validation

## Date & Utility Libraries
- **date-fns**: Modern date utility library
- **nanoid**: URL-safe unique string ID generator
- **class-variance-authority**: Utility for conditional CSS classes