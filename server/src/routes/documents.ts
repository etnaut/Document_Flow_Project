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
  const statusSelect = hasStatus ? 'sd.Status' : `'Pending' AS Status`;

    const userId = req.query.userId ? parseInt(req.query.userId as string) : null;
    const role = req.query.role as string | undefined;
    const department = req.query.department as string | undefined;
    const status = req.query.status as string | undefined;

    let sql = `
      SELECT 
        sd.Document_Id,
        sd.Type,
        sd.User_Id,
  ${statusSelect},
        sd.Priority,
        sd.Document,
        u.Full_Name AS sender_name,
        d.Department AS sender_department,
        dv.Division AS sender_division,
        NULL AS target_department,
        NULL AS comments,
        NULL AS forwarded_from,
        NULL AS forwarded_by_admin,
        NULL AS is_forwarded_request,
        NULL AS created_at
      FROM Sender_Document_Tbl sd
      LEFT JOIN User_Tbl u ON sd.User_Id = u.User_Id
      LEFT JOIN Department_Tbl d ON u.Department_Id = d.Department_Id
      LEFT JOIN Division_Tbl dv ON u.Division_Id = dv.Division_Id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 1;

    if (status && hasStatus) {
      sql += ` AND sd.Status = $${paramCount}`;
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
  const statusSelect = hasStatus ? 'sd.Status' : `'Pending' AS Status`;
    const input = getJsonInput<CreateDocumentInput>(req.body);

    const required = ['Type', 'User_Id', 'Priority'];
    for (const field of required) {
      if (!(field in input)) {
        return sendResponse(res, { error: `Missing required field: ${field}` }, 400);
      }
    }

    let fileData: Buffer | null = null;
    if (input.Document) {
      // Expect base64 encoded file string
      fileData = Buffer.from(input.Document, 'base64');
    }

    const { sql: insertSql, params: insertParams } = hasStatus
      ? {
          sql: `INSERT INTO Sender_Document_Tbl (Type, User_Id, Status, Priority, Document) VALUES ($1, $2, 'Pending', $3, $4) RETURNING Document_Id`,
          params: [input.Type, input.User_Id, input.Priority, fileData],
        }
      : {
          sql: `INSERT INTO Sender_Document_Tbl (Type, User_Id, Priority, Document) VALUES ($1, $2, $3, $4) RETURNING Document_Id`,
          params: [input.Type, input.User_Id, input.Priority, fileData],
        };

    const result = await pool.query(insertSql, insertParams);

    const documentId = result.rows[0].Document_Id;

    // Fetch the created document
    const docResult = await pool.query(
      `
      SELECT 
        sd.Document_Id,
        sd.Type,
        sd.User_Id,
  ${statusSelect},
        sd.Priority,
        sd.Document,
        u.Full_Name AS sender_name,
        d.Department AS sender_department,
        dv.Division AS sender_division,
        NULL AS target_department,
        NULL AS comments,
        NULL AS forwarded_from,
        NULL AS forwarded_by_admin,
        NULL AS is_forwarded_request,
        NULL AS created_at
      FROM Sender_Document_Tbl sd
      LEFT JOIN User_Tbl u ON sd.User_Id = u.User_Id
      LEFT JOIN Department_Tbl d ON u.Department_Id = d.Department_Id
      LEFT JOIN Division_Tbl dv ON u.Division_Id = dv.Division_Id
      WHERE sd.Document_Id = $1
    `,
      [documentId]
    );

    const document: Document = {
      ...docResult.rows[0],
      Document: docResult.rows[0].Document ? Buffer.from(docResult.rows[0].Document) : null,
      target_department: null,
      comments: null,
      forwarded_from: null,
      forwarded_by_admin: null,
      is_forwarded_request: null,
      created_at: null,
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
  const statusSelect = hasStatus ? 'sd.Status' : `'Pending' AS Status`;
    const input = getJsonInput<UpdateDocumentInput>(req.body);

    if (!input.Document_Id) {
      return sendResponse(res, { error: 'Document_Id is required' }, 400);
    }

    const updates: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    // Build dynamic update query
    const allowedFields = hasStatus ? ['Status', 'Priority', 'Type'] : ['Priority', 'Type'];
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
        sd.Document_Id,
        sd.Type,
        sd.User_Id,
  ${statusSelect},
        sd.Priority,
        sd.Document,
        u.Full_Name AS sender_name,
        d.Department AS sender_department,
        dv.Division AS sender_division,
        NULL AS target_department,
        NULL AS comments,
        NULL AS forwarded_from,
        NULL AS forwarded_by_admin,
        NULL AS is_forwarded_request,
        NULL AS created_at
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

    const document: Document = {
      ...docResult.rows[0],
      Document: docResult.rows[0].Document ? Buffer.from(docResult.rows[0].Document) : null,
      target_department: null,
      comments: input.comments || null,
      forwarded_from: null,
      forwarded_by_admin: null,
      is_forwarded_request: null,
      created_at: null,
    };

    sendResponse(res, document);
  } catch (error: any) {
    console.error('Update document error:', error);
    sendResponse(res, { error: 'Database error: ' + error.message }, 500);
  }
});

export default router;

