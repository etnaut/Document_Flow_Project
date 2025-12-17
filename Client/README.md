# Document Request Frontend

React + TypeScript frontend application for the Document Request Management System.

## Technologies

- **Vite** - Build tool and dev server
- **React** - UI framework
- **TypeScript** - Type safety
- **shadcn-ui** - UI components
- **Tailwind CSS** - Styling
- **React Router** - Routing
- **TanStack Query** - Data fetching

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:8080`

## Build

To build for production:
```bash
npm run build
```

To preview the production build:
```bash
npm run preview
```

## Project Structure

- `src/` - Source code
  - `components/` - Reusable UI components
  - `pages/` - Page components
  - `services/` - API service functions
  - `contexts/` - React contexts (Auth, etc.)
  - `types/` - TypeScript type definitions
  - `hooks/` - Custom React hooks
  - `utils/` - Utility functions

## API Configuration

The frontend connects to the backend API at `http://localhost:3001/api`

Make sure the backend server is running before starting the frontend.
