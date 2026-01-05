import { Router, Request, Response } from 'express';
import pool from '../config/database.js';
import { sendResponse, getJsonInput } from '../utils/helpers.js';
import { CreateDocumentInput, UpdateDocumentInput, Document } from '../types/index.js';
import { hasSenderStatusColumn } from '../utils/schema.js';

const router = Router();

// GET /documents - Get all documents with optional filters
router.get('/', async (req: Request, res: Response) => {
  try {
  const hasStatus = await hasSenderStatusColumn();
  const statusSelect = hasStatus ? "COALESCE(sd.Status, 'pending')" : `'Pending'`;

    const userId = req.query.userId ? parseInt(req.query.userId as string) : null;
    const role = req.query.role as string | undefined;
    const department = req.query.department as string | undefined;
    const status = req.query.status as string | undefined;

    let sql = `
      SELECT 
        sd.document_id AS "Document_Id",
        sd.type AS "Type",
        sd.user_id AS "User_Id",
  ${statusSelect} AS "Status",
        sd.priority AS "Priority",
        sd.document AS "Document",
        sd.description AS "description",
        sd.date AS "created_at",
        u.Full_Name AS sender_name,
        d.Department AS sender_department,
        dv.Division AS sender_division,
        NULL AS target_department,
        NULL AS comments,
        NULL AS forwarded_from,
        NULL AS forwarded_by_admin,
        NULL AS is_forwarded_request
      FROM Sender_Document_Tbl sd
      LEFT JOIN User_Tbl u ON sd.User_Id = u.User_Id
      LEFT JOIN Department_Tbl d ON u.Department_Id = d.Department_Id
      LEFT JOIN Division_Tbl dv ON u.Division_Id = dv.Division_Id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 1;

    if (status && hasStatus) {
      sql += ` AND LOWER(sd.Status) = LOWER($${paramCount})`;
      params.push(status);
      paramCount++;
    } else if (status && !hasStatus) {
      console.warn('Status filter requested but sender_document_tbl.status column is missing; ignoring filter');
    }

    // If Admin, filter by their department name
    if (role === 'Admin' && department) {
      sql += ` AND d.Department = $${paramCount}`;
      params.push(department);
      paramCount++;
    } else if (role === 'Employee' && userId) {
      // If Employee, only their own documents
      sql += ` AND sd.User_Id = $${paramCount}`;
      params.push(userId);
      paramCount++;
    }

    sql += ' ORDER BY sd.Document_Id DESC';

    const result = await pool.query(sql, params);
    const documents: Document[] = result.rows.map((doc: any) => ({
      ...doc,
      Document: doc.Document ? Buffer.from(doc.Document) : null,
      target_department: doc.target_department || null,
      comments: doc.comments || null,
      forwarded_from: doc.forwarded_from || null,
      forwarded_by_admin: doc.forwarded_by_admin || null,
      is_forwarded_request: doc.is_forwarded_request || null,
      created_at: doc.created_at || null,
      description: doc.description || null,
    }));

    sendResponse(res, documents);
  } catch (error: any) {
    console.error('Get documents error:', error);
    sendResponse(res, { error: 'Database error: ' + error.message }, 500);
  }
});

// POST /documents - Create a new document
router.post('/', async (req: Request, res: Response) => {
  try {
  const hasStatus = await hasSenderStatusColumn();
  const statusSelect = hasStatus ? "COALESCE(sd.Status, 'pending')" : `'Pending'`;
    const input = getJsonInput<CreateDocumentInput>(req.body);

  const required = ['Type', 'Priority'];
    for (const field of required) {
      if (!(field in input)) {
        return sendResponse(res, { error: `Missing required field: ${field}` }, 400);
      }
    }

    // Ensure we have a valid user id (FK to user_tbl). If not provided, try to resolve by full name.
    let userId = input.User_Id;

    if (!userId) {
      const name = (input as any).sender_name as string | undefined;
      if (name) {
        const userResult = await pool.query(
          `SELECT user_id FROM user_tbl WHERE LOWER(full_name) = LOWER($1) LIMIT 1`,
          [name]
        );

        if (userResult.rows.length > 0) {
          userId = userResult.rows[0].user_id;
        }
      }
    }

    if (!userId) {
      return sendResponse(res, { error: 'User_Id is required and must reference user_tbl' }, 400);
    }

    // Double-check FK exists
    const userExists = await pool.query(`SELECT 1 FROM user_tbl WHERE user_id = $1`, [userId]);
    if (userExists.rows.length === 0) {
      return sendResponse(res, { error: 'User_Id not found in user_tbl' }, 400);
    }

    let fileData: Buffer | null = null;
    if (input.Document) {
      // Expect base64 encoded file string
      fileData = Buffer.from(input.Document, 'base64');
    }

    const pendingValue = 'pending';

    const { sql: insertSql, params: insertParams } = hasStatus
      ? {
          sql: `INSERT INTO Sender_Document_Tbl (Type, User_Id, Status, Priority, Document, description) VALUES ($1, $2, $3, $4, $5, $6) RETURNING Document_Id`,
          params: [input.Type, userId, pendingValue, input.Priority, fileData, input.description ?? null],
        }
      : {
          sql: `INSERT INTO Sender_Document_Tbl (Type, User_Id, Priority, Document, description) VALUES ($1, $2, $3, $4, $5) RETURNING Document_Id`,
          params: [input.Type, userId, input.Priority, fileData, input.description ?? null],
        };

    const result = await pool.query(insertSql, insertParams);

    const documentId =
      result.rows?.[0]?.Document_Id ??
      result.rows?.[0]?.document_id ??
      result.rows?.[0]?.documentid;

    if (!documentId) {
      return sendResponse(res, { error: 'Insert succeeded but no Document_Id returned' }, 500);
    }

    // Fetch the created document
    const docResult = await pool.query(
      `
  SELECT 
    sd.document_id AS "Document_Id",
    sd.type AS "Type",
    sd.user_id AS "User_Id",
  ${statusSelect} AS "Status",
    sd.priority AS "Priority",
    sd.document AS "Document",
    sd.description AS "description",
    sd.date AS "created_at",
    u.Full_Name AS sender_name,
    d.Department AS sender_department,
    dv.Division AS sender_division,
    NULL AS target_department,
    NULL AS comments,
    NULL AS forwarded_from,
    NULL AS forwarded_by_admin,
    NULL AS is_forwarded_request
      FROM Sender_Document_Tbl sd
      LEFT JOIN User_Tbl u ON sd.User_Id = u.User_Id
      LEFT JOIN Department_Tbl d ON u.Department_Id = d.Department_Id
      LEFT JOIN Division_Tbl dv ON u.Division_Id = dv.Division_Id
      WHERE sd.Document_Id = $1
    `,
      [documentId]
    );

    if (docResult.rows.length === 0) {
      return sendResponse(res, { error: 'Created document not found after insert' }, 500);
    }

    const createdRow = docResult.rows[0];

    const document: Document = {
      ...createdRow,
      Document: createdRow.Document ? Buffer.from(createdRow.Document) : null,
      target_department: null,
      comments: null,
      forwarded_from: null,
      forwarded_by_admin: null,
      is_forwarded_request: null,
      created_at: createdRow.created_at || null,
      description: createdRow.description || null,
    };

    sendResponse(res, document, 201);
  } catch (error: any) {
    console.error('Create document error:', error);
    sendResponse(res, { error: 'Database error: ' + error.message }, 500);
  }
});

// PUT /documents - Update a document
router.put('/', async (req: Request, res: Response) => {
  try {
  const hasStatus = await hasSenderStatusColumn();
  const statusSelect = hasStatus ? "COALESCE(sd.Status, 'pending')" : `'Pending'`;
    const input = getJsonInput<UpdateDocumentInput>(req.body);

    if (!input.Document_Id) {
      return sendResponse(res, { error: 'Document_Id is required' }, 400);
    }

    const updates: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    // Build dynamic update query
    const allowedFields = hasStatus ? ['Status', 'Priority', 'Type', 'description'] : ['Priority', 'Type', 'description'];
    if (!hasStatus && input.Status !== undefined) {
      return sendResponse(res, { error: 'Status column not available in sender_document_tbl' }, 400);
    }
    for (const field of allowedFields) {
      if (field in input && input[field as keyof UpdateDocumentInput] !== undefined) {
        updates.push(`${field} = $${paramCount}`);
        params.push(input[field as keyof UpdateDocumentInput]);
        paramCount++;
      }
    }

    if (input.Document) {
      updates.push(`Document = $${paramCount}`);
      params.push(Buffer.from(input.Document, 'base64'));
      paramCount++;
    }

    if (updates.length === 0) {
      return sendResponse(res, { error: 'No fields to update' }, 400);
    }

    params.push(input.Document_Id);
    const sql = `UPDATE Sender_Document_Tbl SET ${updates.join(', ')} WHERE Document_Id = $${paramCount}`;

    await pool.query(sql, params);

    // Fetch updated document
    const docResult = await pool.query(
      `
      SELECT 
        sd.document_id AS "Document_Id",
        sd.type AS "Type",
        sd.user_id AS "User_Id",
  ${statusSelect} AS "Status",
        sd.priority AS "Priority",
        sd.document AS "Document",
        sd.description AS "description",
        sd.date AS "created_at",
        u.Full_Name AS sender_name,
        d.Department AS sender_department,
        dv.Division AS sender_division,
        NULL AS target_department,
        NULL AS comments,
        NULL AS forwarded_from,
        NULL AS forwarded_by_admin,
        NULL AS is_forwarded_request
      FROM Sender_Document_Tbl sd
      LEFT JOIN User_Tbl u ON sd.User_Id = u.User_Id
      LEFT JOIN Department_Tbl d ON u.Department_Id = d.Department_Id
      LEFT JOIN Division_Tbl dv ON u.Division_Id = dv.Division_Id
      WHERE sd.Document_Id = $1
    `,
      [input.Document_Id]
    );

    if (docResult.rows.length === 0) {
      return sendResponse(res, { error: 'Document not found' }, 404);
    }

    const updatedRow = docResult.rows[0];

    const document: Document = {
      ...updatedRow,
      Document: updatedRow.Document ? Buffer.from(updatedRow.Document) : null,
      target_department: null,
      comments: input.comments || null,
      forwarded_from: null,
      forwarded_by_admin: null,
      is_forwarded_request: null,
      created_at: updatedRow.created_at || null,
      description: updatedRow.description || null,
    };

    sendResponse(res, document);
  } catch (error: any) {
    console.error('Update document error:', error);
    sendResponse(res, { error: 'Database error: ' + error.message }, 500);
  }
});

export default router;

