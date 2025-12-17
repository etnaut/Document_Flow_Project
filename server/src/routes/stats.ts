import { Router, Request, Response } from 'express';
import pool from '../config/database.js';
import { sendResponse } from '../utils/helpers.js';
import { DashboardStats } from '../types/index.js';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId ? parseInt(req.query.userId as string) : null;
    const role = req.query.role as string | undefined;
    const department = req.query.department as string | undefined;

    let baseCondition = 'WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;

    // If Admin, count only documents sent TO their department
    if (role === 'Admin' && department) {
      baseCondition += ` AND target_department = $${paramCount}`;
      params.push(department);
      paramCount++;
    }
    // If Employee, count only their own documents
    else if (role === 'Employee' && userId) {
      baseCondition += ` AND User_Id = $${paramCount}`;
      params.push(userId);
      paramCount++;
    }

    // Get total count
    const totalResult = await pool.query(
      `SELECT COUNT(*) as total FROM Sender_Document_Tbl ${baseCondition}`,
      params
    );
    const total = parseInt(totalResult.rows[0].total);

    // Get counts by status
    const statuses = ['Pending', 'Approved', 'Revision', 'Released'];
    const stats: DashboardStats = { total };

    for (const status of statuses) {
      const statusParams = [...params, status];
      const statusParamCount = paramCount;
      const statusResult = await pool.query(
        `SELECT COUNT(*) as count FROM Sender_Document_Tbl ${baseCondition} AND Status = $${statusParamCount}`,
        statusParams
      );
      stats[status.toLowerCase() as keyof DashboardStats] = parseInt(statusResult.rows[0].count);
    }

    sendResponse(res, stats);
  } catch (error: any) {
    console.error('Get stats error:', error);
    sendResponse(res, { error: 'Database error: ' + error.message }, 500);
  }
});

export default router;

