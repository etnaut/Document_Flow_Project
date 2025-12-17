import { Router, Request, Response } from 'express';
import pool from '../config/database.js';
import { sendResponse } from '../utils/helpers.js';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const department = (req.query.department as string) || undefined;

    let result;
    if (department) {
      // If department is a number, treat it as Department_Id
      if (/^\d+$/.test(department)) {
        result = await pool.query(
          'SELECT dv.Division FROM Division_Tbl dv WHERE dv.Department_Id = $1 ORDER BY dv.Division',
          [parseInt(department, 10)]
        );
      } else {
        // Treat as department name and join to Department_Tbl
        result = await pool.query(
          `SELECT dv.Division FROM Division_Tbl dv
           JOIN Department_Tbl d ON dv.Department_Id = d.Department_Id
           WHERE d.Department = $1
           ORDER BY dv.Division`,
          [department]
        );
      }
    } else {
      // No department filter: return all divisions
      result = await pool.query('SELECT dv.Division FROM Division_Tbl dv ORDER BY dv.Division');
    }

    // Extract division names (handle different column casing)
    const divisions = result.rows
      .map((row: any) => row.Division || row.division || Object.values(row)[0])
      .filter((div: any) => div !== null && div !== undefined && div !== '');

    if (divisions.length === 0) {
      console.warn('No divisions found for department:', department || 'ALL');
    }

    sendResponse(res, divisions);
  } catch (error: any) {
    console.error('Get divisions error:', error);
    console.error('Error details:', error.stack);
    sendResponse(res, { error: 'Database error: ' + error.message }, 500);
  }
});

export default router;

// POST / - Create a new division under a department
router.post('/', async (req: Request, res: Response) => {
  try {
    const { Division, Department } = req.body;
    if (!Division || typeof Division !== 'string') {
      return sendResponse(res, { error: 'Missing or invalid Division' }, 400);
    }

    if (!Department) {
      return sendResponse(res, { error: 'Missing Department for Division' }, 400);
    }

    // Resolve department id
    let deptResult;
    if (typeof Department === 'number') {
      deptResult = await pool.query('SELECT Department_Id FROM Department_Tbl WHERE Department_Id = $1', [Department]);
    } else {
      deptResult = await pool.query('SELECT Department_Id FROM Department_Tbl WHERE Department = $1', [Department]);
    }

    if (deptResult.rows.length === 0) {
      return sendResponse(res, { error: 'Department not found' }, 400);
    }

    // Handle different column casing (Department_Id or department_id)
    const deptRow = deptResult.rows[0];
    const deptId = deptRow.Department_Id ?? deptRow.department_id ?? Object.values(deptRow)[0];

    // Check division exists
    const exists = await pool.query('SELECT Division_Id FROM Division_Tbl WHERE Division = $1 AND Department_Id = $2', [Division, deptId]);
    if (exists.rows.length > 0) {
      return sendResponse(res, { error: 'Division already exists in department' }, 409);
    }

    const insert = await pool.query('INSERT INTO Division_Tbl (Division, Department_Id) VALUES ($1, $2) RETURNING Division_Id, Division', [Division, deptId]);
    const created = insert.rows[0];
    sendResponse(res, created, 201);
  } catch (error: any) {
    console.error('Create division error:', error);
    sendResponse(res, { error: 'Database error: ' + error.message }, 500);
  }
});

