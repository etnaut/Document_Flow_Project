import { Router, Request, Response } from 'express';
import pool from '../config/database.js';
import { sendResponse } from '../utils/helpers.js';
import { DashboardStats } from '../types/index.js';
import { hasSenderStatusColumn } from '../utils/schema.js';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId ? parseInt(req.query.userId as string) : null;
    const role = req.query.role as string | undefined;
    const department = req.query.department as string | undefined;

    const hasStatus = await hasSenderStatusColumn();
    const statusSelect = hasStatus ? "COALESCE(sd.Status, 'pending')" : `'Pending'`;
    const derivedStatus = `CASE WHEN EXISTS (SELECT 1 FROM revision_document_tbl r WHERE r.document_id = sd.document_id) THEN 'Revision' ELSE ${statusSelect} END`;

    let baseCondition = 'WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;

    const joins = `
      FROM sender_document_tbl sd
      LEFT JOIN user_tbl u ON sd.user_id = u.user_id
      LEFT JOIN department_tbl d ON u.department_id = d.department_id
    `;

    // If Employee, count only their own documents. Admins and others see all.
    if (role === 'Employee' && userId) {
      baseCondition += ` AND sd.User_Id = $${paramCount}`;
      params.push(userId);
      paramCount++;
    }

    // Get total count
    const totalResult = await pool.query(
      `SELECT COUNT(*) as total ${joins} ${baseCondition}`,
      params
    );
    const total = parseInt(totalResult.rows[0].total);

    // Get counts by status (exclude Released per UI)
    const statuses = ['Pending', 'Approved', 'Revision'];
    const stats: DashboardStats = { total, pending: 0, approved: 0, revision: 0, released: 0, received: 0 };

    for (const status of statuses) {
      const statusParams = [...params, status];
      const statusParamCount = paramCount;
      const statusResult = await pool.query(
        `SELECT COUNT(*) as count ${joins} ${baseCondition} AND LOWER(${derivedStatus}) = LOWER($${statusParamCount})`,
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

// GET /stats/monthly?year=YYYY - Monthly totals for the given year
router.get('/monthly', async (req: Request, res: Response) => {
  try {
    const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();
    const role = req.query.role as string | undefined;
    const userId = req.query.userId ? parseInt(req.query.userId as string) : null;

    const joins = `
      FROM sender_document_tbl sd
      LEFT JOIN user_tbl u ON sd.user_id = u.user_id
    `;

    let baseCondition = 'WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;

    // Restrict to a specific user if role is Employee
    if (role === 'Employee' && userId) {
      baseCondition += ` AND sd.User_Id = $${paramCount}`;
      params.push(userId);
      paramCount++;
    }

    baseCondition += ` AND EXTRACT(YEAR FROM sd.date) = $${paramCount}`;
    params.push(year);

    const result = await pool.query(
      `SELECT EXTRACT(MONTH FROM sd.date)::int AS month, COUNT(*)::int AS total ${joins} ${baseCondition} GROUP BY 1 ORDER BY 1`,
      params
    );

    // Map result to a 12-month array filling missing months with 0
    const byMonth: Record<number, number> = {};
    for (const row of result.rows) {
      byMonth[row.month] = row.total;
    }
    const months = [
      'Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'
    ];
    const data = months.map((m, idx) => ({ month: m, total: byMonth[idx + 1] ?? null }));

    sendResponse(res, data);
  } catch (error: any) {
    console.error('Get monthly stats error:', error);
    sendResponse(res, { error: 'Database error: ' + error.message }, 500);
  }
});

export default router;

