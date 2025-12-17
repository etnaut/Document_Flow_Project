import { Router, Request, Response } from 'express';
import pool from '../config/database.js';
import { sendResponse } from '../utils/helpers.js';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    // Try with uppercase first, if that fails, try lowercase
    const result = await pool.query('SELECT * FROM Department_Tbl ORDER BY Department');
    
    // Handle both uppercase and lowercase column names
    const departments = result.rows
      .map((row: any) => {
        // Try uppercase first, then lowercase, then any case variation
        return row.Department || row.department || row.DEPARTMENT || Object.values(row)[0];
      })
      .filter((dept: any) => dept !== null && dept !== undefined && dept !== '');

    if (departments.length === 0) {
      console.warn('No departments found. Table structure:', result.rows.length > 0 ? Object.keys(result.rows[0]) : 'empty');
    }

    sendResponse(res, departments);
  } catch (error: any) {
    console.error('Get departments error:', error);
    console.error('Error stack:', error.stack);
    sendResponse(res, { error: 'Database error: ' + error.message }, 500);
  }
});

export default router;

