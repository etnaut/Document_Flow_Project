import { Router, Request, Response } from 'express';
import pool from '../config/database.js';
import bcrypt from 'bcryptjs';
import { sendResponse, getJsonInput } from '../utils/helpers.js';
import { CreateUserInput, User } from '../types/index.js';

const router = Router();

// GET /users - Get all users with optional filters
router.get('/', async (req: Request, res: Response) => {
  try {
    const role = req.query.role as string | undefined;
    const department = req.query.department as string | undefined;

    let sql = `
      SELECT 
        u.User_Id,
        u.ID_Number,
        u.Full_Name,
        u.Gender,
        u.Email,
        d.Department AS Department,
        dv.Division AS Division,
        u.User_Role,
        u.User_Name,
        u.Status,
        u.pre_assigned_role
      FROM User_Tbl u
      LEFT JOIN Department_Tbl d ON u.Department_Id = d.Department_Id
      LEFT JOIN Division_Tbl dv ON u.Division_Id = dv.Division_Id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 1;

    if (role) {
      sql += ` AND u.User_Role = $${paramCount}`;
      params.push(role);
      paramCount++;
    }

    if (department) {
      sql += ` AND d.Department = $${paramCount}`;
      params.push(department);
      paramCount++;
    }

    sql += ' ORDER BY u.Full_Name';

    const result = await pool.query(sql, params);
    const users: User[] = result.rows.map((user: any) => {
      // Remove any possible status-like properties from the copied object
      const userCopy = { ...user } as any;
      delete userCopy.status;
      delete userCopy.Status;
      delete userCopy.STATUS;

      // Normalize raw status value from various column casings and types
      const rawStatus = user.Status ?? user.status ?? user.STATUS ?? null;
      let normalizedStatus = false;
      if (typeof rawStatus === 'boolean') {
        normalizedStatus = rawStatus;
      } else if (typeof rawStatus === 'string') {
        normalizedStatus = rawStatus.toLowerCase() === 'active' || rawStatus.toLowerCase() === 'true';
      } else {
        normalizedStatus = Boolean(rawStatus);
      }

      return {
        ...userCopy,
        Status: normalizedStatus,
      };
    });

    sendResponse(res, users);
  } catch (error: any) {
    console.error('Get users error:', error);
    sendResponse(res, { error: 'Database error: ' + error.message }, 500);
  }
});

// POST /users - Create a new user
router.post('/', async (req: Request, res: Response) => {
  try {
    const input = getJsonInput<CreateUserInput>(req.body);

    const required = [
      'ID_Number',
      'Full_Name',
      'Gender',
      'Email',
      'Department',
      'Division',
      'User_Role',
      'User_Name',
      'Password',
      'Status',
    ];

    for (const field of required) {
      if (!(field in input)) {
        return sendResponse(res, { error: `Missing required field: ${field}` }, 400);
      }
    }

    // Resolve department id
    let deptId: number | null = null;
    const deptInput = String(input.Department).trim();

    // If client passed a numeric id, try to use it
    if (/^\d+$/.test(deptInput)) {
      const byId = await pool.query('SELECT Department_Id FROM Department_Tbl WHERE Department_Id = $1', [parseInt(deptInput, 10)]);
      if (byId.rows.length > 0) {
        deptId = byId.rows[0].department_id ?? byId.rows[0].Department_Id;
      }
    }

    // Try exact match, then case-insensitive trimmed match
    if (!deptId) {
      let deptResult = await pool.query('SELECT Department_Id FROM Department_Tbl WHERE Department = $1', [deptInput]);
      if (deptResult.rows.length === 0) {
        deptResult = await pool.query('SELECT Department_Id FROM Department_Tbl WHERE LOWER(TRIM(Department)) = LOWER(TRIM($1))', [deptInput]);
      }
      if (deptResult.rows.length === 0) {
        return sendResponse(res, { error: `Department not found: ${input.Department}` }, 400);
      }
      deptId = deptResult.rows[0].department_id ?? deptResult.rows[0].Department_Id;
    }

    // Resolve division id (must belong to department)
    let divId: number | null = null;
    const divInput = String(input.Division).trim();

    // Accept numeric id for division
    if (/^\d+$/.test(divInput)) {
      const byId = await pool.query('SELECT Division_Id FROM Division_Tbl WHERE Division_Id = $1 AND Department_Id = $2', [parseInt(divInput, 10), deptId]);
      if (byId.rows.length > 0) {
        divId = byId.rows[0].division_id ?? byId.rows[0].Division_Id;
      }
    }

    if (!divId) {
      let divResult = await pool.query('SELECT Division_Id FROM Division_Tbl WHERE Division = $1 AND Department_Id = $2', [divInput, deptId]);
      if (divResult.rows.length === 0) {
        divResult = await pool.query('SELECT Division_Id FROM Division_Tbl WHERE LOWER(TRIM(Division)) = LOWER(TRIM($1)) AND Department_Id = $2', [divInput, deptId]);
      }
      if (divResult.rows.length === 0) {
        return sendResponse(
          res,
          { error: `Division not found in department: ${input.Division}` },
          400
        );
      }
      divId = divResult.rows[0].division_id ?? divResult.rows[0].Division_Id;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(input.Password, 10);

    // Insert user
    const insertResult = await pool.query(
      `
      INSERT INTO User_Tbl (
        ID_Number,
        Full_Name,
        Gender,
        Email,
        Department_Id,
        Division_Id,
        User_Role,
        User_Name,
        Password,
        Status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING User_Id
    `,
      [
        input.ID_Number,
        input.Full_Name,
        input.Gender,
        input.Email,
        deptId,
        divId,
        input.User_Role,
        input.User_Name,
        hashedPassword,
        input.Status ? 'active' : 'inactive',
      ]
    );

    // The PG driver typically returns column names in lowercase (user_id),
    // but some queries or DB setups may have different casing. Normalize here.
    let userId: any = insertResult.rows[0].user_id ?? insertResult.rows[0].User_Id ?? insertResult.rows[0].userid ?? insertResult.rows[0].USER_ID;

    // If we didn't get an id from RETURNING (odd cases), try a fallback lookup using unique fields
    if (!userId) {
      const fallback = await pool.query('SELECT User_Id FROM User_Tbl WHERE User_Name = $1 OR ID_Number = $2 LIMIT 1', [input.User_Name, input.ID_Number]);
      if (fallback.rows.length > 0) {
        userId = fallback.rows[0].user_id ?? fallback.rows[0].User_Id;
      }
    }

    // Fetch the created user
    const userResult = await pool.query(
      `
      SELECT 
        u.User_Id,
        u.ID_Number,
        u.Full_Name,
        u.Gender,
        u.Email,
        d.Department AS Department,
        dv.Division AS Division,
        u.User_Role,
        u.User_Name,
        u.Status,
        u.pre_assigned_role
      FROM User_Tbl u
      LEFT JOIN Department_Tbl d ON u.Department_Id = d.Department_Id
      LEFT JOIN Division_Tbl dv ON u.Division_Id = dv.Division_Id
      WHERE u.User_Id = $1
    `,
      [userId]
    );

    if (userResult.rows.length === 0) {
      // This is unexpected because the insert succeeded. Log and return a clearer message.
      console.error('Create user: insert succeeded but select returned no rows, userId=', userId, 'insertResult=', insertResult.rows[0]);
      return sendResponse(res, { error: 'User could not be created' }, 500);
    }

    const raw = userResult.rows[0];
    const user: User = {
      ...raw,
      Status: (raw.Status ?? raw.status ?? '').toString().toLowerCase() === 'active',
    };

    sendResponse(res, user, 201);
  } catch (error: any) {
    console.error('Create user error:', error);
    sendResponse(res, { error: 'Database error: ' + error.message }, 500);
  }
});

// PUT /users/status - Update a user's active/inactive status
router.put('/status', async (req: Request, res: Response) => {
  try {
    const input = getJsonInput<{ User_Id: number; Status: boolean }>(req.body);

    if (input == null || typeof input.User_Id === 'undefined') {
      return sendResponse(res, { error: 'Missing User_Id' }, 400);
    }

    const statusStr = input.Status ? 'active' : 'inactive';

    await pool.query('UPDATE User_Tbl SET Status = $1 WHERE User_Id = $2', [statusStr, input.User_Id]);

    // Return the updated user record
    const userResult = await pool.query(
      `
      SELECT 
        u.User_Id,
        u.ID_Number,
        u.Full_Name,
        u.Gender,
        u.Email,
        d.Department AS Department,
        dv.Division AS Division,
        u.User_Role,
        u.User_Name,
        u.Status,
        u.pre_assigned_role
      FROM User_Tbl u
      LEFT JOIN Department_Tbl d ON u.Department_Id = d.Department_Id
      LEFT JOIN Division_Tbl dv ON u.Division_Id = dv.Division_Id
      WHERE u.User_Id = $1
    `,
      [input.User_Id]
    );

    if (userResult.rows.length === 0) {
      return sendResponse(res, { error: 'User not found' }, 404);
    }

    const raw = userResult.rows[0];
    const user: User = {
      ...raw,
      Status: (raw.Status ?? raw.status ?? '').toString().toLowerCase() === 'active',
    };

    sendResponse(res, user);
  } catch (error: any) {
    console.error('Update user status error:', error);
    sendResponse(res, { error: 'Database error: ' + error.message }, 500);
  }
});

// PUT /users/assign - Update a user's pre_assigned_role (e.g., Recorder / Releaser)
router.put('/assign', async (req: Request, res: Response) => {
  try {
    const input = getJsonInput<{ User_Id: number; pre_assigned_role?: string; pre_assigned_to_id?: number; pre_assigned_to_name?: string }>(req.body);

    if (input == null || typeof input.User_Id === 'undefined') {
      return sendResponse(res, { error: 'Missing User_Id' }, 400);
    }


    const role = input.pre_assigned_role ? String(input.pre_assigned_role).trim() : null;

    // Update only pre_assigned_role
    await pool.query('UPDATE User_Tbl SET pre_assigned_role = $1 WHERE User_Id = $2', [role, input.User_Id]);

    // Return the updated user record
    const userResult = await pool.query(
      `
      SELECT 
        u.User_Id,
        u.ID_Number,
        u.Full_Name,
        u.Gender,
        u.Email,
        d.Department AS Department,
        dv.Division AS Division,
        u.User_Role,
        u.User_Name,
        u.Status,
        u.pre_assigned_role
      FROM User_Tbl u
      LEFT JOIN Department_Tbl d ON u.Department_Id = d.Department_Id
      LEFT JOIN Division_Tbl dv ON u.Division_Id = dv.Division_Id
      WHERE u.User_Id = $1
    `,
      [input.User_Id]
    );

    if (userResult.rows.length === 0) {
      return sendResponse(res, { error: 'User not found' }, 404);
    }

    const raw = userResult.rows[0];
    const user: any = {
      ...raw,
      Status: (raw.Status ?? raw.status ?? '').toString().toLowerCase() === 'active',
    };

    sendResponse(res, user);
  } catch (error: any) {
    console.error('Update user assign error:', error);
    sendResponse(res, { error: 'Database error: ' + error.message }, 500);
  }
});

export default router;

