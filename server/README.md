# Document Flow Backend API

TypeScript/Express backend API for the Document Flow System using PostgreSQL.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

3. Update `.env` with your PostgreSQL credentials:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=document_flow_db
DB_USER=postgres
DB_PASSWORD=your_password
PORT=3001
CORS_ORIGIN=http://localhost:5173
```

## Running

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
```

## API Endpoints

- `POST /api/login` - User login
- `GET /api/users` - Get all users (with optional `?role=` and `?department=` filters)
- `POST /api/users` - Create a new user
- `GET /api/documents` - Get all documents (with optional filters)
- `POST /api/documents` - Create a new document
- `PUT /api/documents` - Update a document
- `GET /api/departments` - Get all departments
- `GET /api/divisions` - Get all divisions
- `POST /api/forward` - Forward a document
- `GET /api/stats` - Get dashboard statistics

## Database

Make sure your PostgreSQL database is running and contains the following tables:
- `User_Tbl`
- `Department_Tbl`
- `Division_Tbl`
- `Sender_Document_Tbl`

