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

    // POST / - Create a new department
    router.post('/', async (req: Request, res: Response) => {
      try {
        const { Department } = req.body;
        if (!Department || typeof Department !== 'string') {
          return sendResponse(res, { error: 'Missing or invalid Department' }, 400);
        }

        // Check if already exists
        const exists = await pool.query('SELECT Department_Id FROM Department_Tbl WHERE Department = $1', [Department]);
        if (exists.rows.length > 0) {
          return sendResponse(res, { error: 'Department already exists' }, 409);
        }

        const insert = await pool.query('INSERT INTO Department_Tbl (Department) VALUES ($1) RETURNING Department_Id, Department', [Department]);
        const created = insert.rows[0];
        sendResponse(res, created, 201);
      } catch (error: any) {
        console.error('Create department error:', error);
        sendResponse(res, { error: 'Database error: ' + error.message }, 500);
      }
    });

// GET /theme/:department - Get theme for a department
router.get('/theme/:department', async (req: Request, res: Response) => {
  try {
    const department = req.params.department;
    
    // First, check if Theme column exists
    let themeResult;
    try {
      themeResult = await pool.query(
        `SELECT Theme FROM Department_Tbl WHERE Department = $1`,
        [department]
      );
    } catch (error: any) {
      // If column doesn't exist, return default theme
      if (error.message && error.message.includes('column') && error.message.includes('does not exist')) {
        return sendResponse(res, { theme: 'light' });
      }
      throw error;
    }

    if (themeResult.rows.length === 0) {
      return sendResponse(res, { theme: 'light' });
    }

    const theme = themeResult.rows[0].Theme || themeResult.rows[0].theme || 'light';
    sendResponse(res, { theme });
  } catch (error: any) {
    console.error('Get department theme error:', error);
    sendResponse(res, { error: 'Database error: ' + error.message }, 500);
  }
});

// PUT /theme/:department - Update theme for a department (Admin only)
router.put('/theme/:department', async (req: Request, res: Response) => {
  try {
    const department = req.params.department;
    const { theme, userRole, userDepartment } = req.body;

    // Verify user is Admin
    if (userRole !== 'Admin') {
      return sendResponse(res, { error: 'Only Admins can update department theme' }, 403);
    }

    // Verify user belongs to the department they're updating
    if (userDepartment !== department) {
      return sendResponse(res, { error: 'You can only update theme for your own department' }, 403);
    }

    if (!theme || !['light', 'dark'].includes(theme)) {
      return sendResponse(res, { error: 'Invalid theme. Must be "light" or "dark"' }, 400);
    }

    // Check if Theme column exists, if not, add it
    try {
      await pool.query('SELECT Theme FROM Department_Tbl LIMIT 1');
    } catch (error: any) {
      if (error.message && error.message.includes('column') && error.message.includes('does not exist')) {
        // Add Theme column if it doesn't exist
        await pool.query('ALTER TABLE Department_Tbl ADD COLUMN IF NOT EXISTS Theme VARCHAR(10) DEFAULT \'light\'');
      } else {
        throw error;
      }
    }

    // Update theme for the department
    const updateResult = await pool.query(
      `UPDATE Department_Tbl SET Theme = $1 WHERE Department = $2 RETURNING Department, Theme`,
      [theme, department]
    );

    if (updateResult.rows.length === 0) {
      return sendResponse(res, { error: 'Department not found' }, 404);
    }

    sendResponse(res, { 
      department: updateResult.rows[0].Department || updateResult.rows[0].department,
      theme: updateResult.rows[0].Theme || updateResult.rows[0].theme 
    });
  } catch (error: any) {
    console.error('Update department theme error:', error);
    sendResponse(res, { error: 'Database error: ' + error.message }, 500);
  }
});

export default router;

