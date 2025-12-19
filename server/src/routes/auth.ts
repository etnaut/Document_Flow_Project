import { Router, Request, Response } from 'express';
import pool from '../config/database.js';
import bcrypt from 'bcryptjs';
import { sendResponse, getJsonInput } from '../utils/helpers.js';
import { LoginInput, User } from '../types/index.js';

const router = Router();

// GET /api/login - Informational endpoint
router.get('/', (req: Request, res: Response) => {
  return sendResponse(res, {
    message: 'Use POST /api/login with JSON body { username, password }',
  });
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const input = getJsonInput<LoginInput>(req.body);

    if (!input.username || !input.password) {
      return sendResponse(res, { error: 'Username and password are required' }, 400);
    }

    // Query user from database
    const userQuery = `
      SELECT 
        u.User_Id       AS "User_Id",
        u.ID_Number     AS "ID_Number",
        u.Full_Name     AS "Full_Name",
        u.Gender        AS "Gender",
        u.Email         AS "Email",
        d.Department    AS "Department",
        dv.Division     AS "Division",
        u.User_Role     AS "User_Role",
        u.User_Name     AS "User_Name",
        u.Status        AS "Status",
        u.Password      AS "Password"
      FROM User_Tbl u
      LEFT JOIN Department_Tbl d ON u.Department_Id = d.Department_Id
      LEFT JOIN Division_Tbl dv ON u.Division_Id = dv.Division_Id
      WHERE u.User_Name = $1 AND u.Status = 'active'
    `;

    const result = await pool.query(userQuery, [input.username]);
    const user = result.rows[0];

    if (!user) {
      return sendResponse(res, { error: 'Invalid credentials' }, 401);
    }

    // Handle case sensitivity for Password column
    const password = user.Password || user.password || user.PASSWORD;
    
    // Check if password exists in database
    if (!password) {
      console.error('User found but password is missing in database:', user.User_Name);
      console.error('Available columns:', Object.keys(user));
      return sendResponse(res, { error: 'User account error: password not set in database' }, 500);
    }

    // Verify password - ensure both arguments are strings
    if (typeof password !== 'string' || typeof input.password !== 'string') {
      console.error('Password type error:', { 
        dbPasswordType: typeof password, 
        inputPasswordType: typeof input.password 
      });
      return sendResponse(res, { error: 'Password verification error' }, 500);
    }

    const isValidPassword = await bcrypt.compare(input.password, password);
    
    if (!isValidPassword) {
      return sendResponse(res, { error: 'Invalid credentials' }, 401);
    }

    // Normalize role casing and preserve head roles
    const roleRaw = String(user.User_Role || user.user_role || '').toLowerCase();
    let normalizedRole = 'Employee';
    if (roleRaw === 'superadmin') normalizedRole = 'SuperAdmin';
    else if (roleRaw === 'admin') normalizedRole = 'Admin';
    else if (roleRaw === 'departmenthead') normalizedRole = 'DepartmentHead';
    else if (roleRaw === 'divisionhead') normalizedRole = 'DivisionHead';
    else if (roleRaw === 'officerincharge' || roleRaw === 'officer_in_charge' || roleRaw === 'oic') normalizedRole = 'OfficerInCharge';

    // Remove password from response
    delete user.Password;

    // Convert Status to boolean and include normalized role
    const userResponse: User = {
      User_Id: user.User_Id ?? user.user_id,
      ID_Number: user.ID_Number ?? user.id_number,
      Full_Name: user.Full_Name ?? user.full_name,
      Gender: user.Gender ?? user.gender,
      Email: user.Email ?? user.email,
      Department: user.Department ?? user.department,
      Division: user.Division ?? user.division,
      User_Name: user.User_Name ?? user.user_name,
      User_Role: normalizedRole as User['User_Role'],
      Status: (user.Status ?? user.status) === 'active',
    };

    sendResponse(res, userResponse);
  } catch (error: any) {
    console.error('Login error:', error);
    sendResponse(res, { error: 'Database error: ' + error.message }, 500);
  }
});

export default router;

