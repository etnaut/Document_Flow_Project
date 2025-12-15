# PHP API Files for XAMPP

Copy these PHP files to your XAMPP htdocs folder:
`C:\xampp\htdocs\docuflow\api\`

## Required Files

1. **config.php** - Database connection
2. **login.php** - User authentication
3. **documents.php** - Document CRUD operations
4. **departments.php** - Get departments list
5. **divisions.php** - Get divisions list

## Database Setup

Make sure your MySQL database has these tables:
- users
- documents
- approved_documents
- revision_documents
- response_documents

## CORS Configuration

The API files include CORS headers to allow requests from your React app running on a different port.

## Testing

After placing files in htdocs, test by visiting:
`http://localhost/docuflow/api/departments.php`
