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
        u.Status
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
      const { status, ...userWithoutStatus } = user; // Remove lowercase status if exists
      return {
        ...userWithoutStatus,
        Status: user.Status === 'active',
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
    const deptResult = await pool.query(
      'SELECT Department_Id FROM Department_Tbl WHERE Department = $1',
      [input.Department]
    );

    if (deptResult.rows.length === 0) {
      return sendResponse(res, { error: `Department not found: ${input.Department}` }, 400);
    }

    const deptId = deptResult.rows[0].Department_Id;

    // Resolve division id (must belong to department)
    const divResult = await pool.query(
      'SELECT Division_Id FROM Division_Tbl WHERE Division = $1 AND Department_Id = $2',
      [input.Division, deptId]
    );

    if (divResult.rows.length === 0) {
      return sendResponse(
        res,
        { error: `Division not found in department: ${input.Division}` },
        400
      );
    }

    const divId = divResult.rows[0].Division_Id;

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

    const userId = insertResult.rows[0].User_Id;

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
        u.Status
      FROM User_Tbl u
      LEFT JOIN Department_Tbl d ON u.Department_Id = d.Department_Id
      LEFT JOIN Division_Tbl dv ON u.Division_Id = dv.Division_Id
      WHERE u.User_Id = $1
    `,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return sendResponse(res, { error: 'User could not be created' }, 500);
    }

    const user: User = {
      ...userResult.rows[0],
      Status: userResult.rows[0].Status === 'active',
    };

    sendResponse(res, user, 201);
  } catch (error: any) {
    console.error('Create user error:', error);
    sendResponse(res, { error: 'Database error: ' + error.message }, 500);
  }
});

export default router;

