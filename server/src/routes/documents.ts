import { Router, Request, Response } from 'express';
import pool from '../config/database.js';
import { sendResponse, getJsonInput } from '../utils/helpers.js';
import { CreateDocumentInput, UpdateDocumentInput, Document } from '../types/index.js';
import { hasSenderStatusColumn } from '../utils/schema.js';
import { createRequire } from 'module';
import { promisify } from 'util';

const router = Router();

const require = createRequire(import.meta.url);
// libreoffice-convert requires LibreOffice (soffice) installed in the runtime environment
// eslint-disable-next-line @typescript-eslint/no-var-requires
const libre = require('libreoffice-convert');
const libreConvert = promisify(libre.convert);

const isPdfBuffer = (buf: Buffer) => buf.length >= 4 && buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46;

// GET /documents/:id/preview - Convert office docs to PDF for inline preview
router.get('/:id/preview', async (req: Request, res: Response) => {
  const documentId = Number(req.params.id);
  if (!Number.isFinite(documentId)) {
    return sendResponse(res, { error: 'Invalid document id' }, 400);
  }

  try {
    const result = await pool.query('SELECT document FROM sender_document_tbl WHERE document_id = $1 LIMIT 1', [documentId]);
    if (result.rows.length === 0 || !result.rows[0].document) {
      return sendResponse(res, { error: 'Document not found' }, 404);
    }

    const buffer: Buffer = Buffer.from(result.rows[0].document);

    // If already PDF, return directly
    if (isPdfBuffer(buffer)) {
      res.setHeader('Content-Type', 'application/pdf');
      return res.send(buffer);
    }

    // Convert to PDF using LibreOffice
    try {
      const pdfBuf: Buffer = await libreConvert(buffer, '.pdf', undefined) as Buffer;
      res.setHeader('Content-Type', 'application/pdf');
      return res.send(pdfBuf);
    } catch (convertError) {
      console.error('LibreOffice conversion error:', convertError);
      return sendResponse(res, { error: 'Failed to generate preview' }, 500);
    }
  } catch (error: any) {
    console.error('Preview generation error:', error);
    return sendResponse(res, { error: 'Database error: ' + error.message }, 500);
  }
});

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

    // If Employee, only their own documents; Admin sees all (no department filter)
    if (role === 'Employee' && userId) {
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

// PUT /documents - Update a document (and persist approvals)
router.put('/', async (req: Request, res: Response) => {
  const client = await pool.connect();

  try {
    const hasStatus = await hasSenderStatusColumn();
    const statusSelect = hasStatus ? "COALESCE(sd.Status, 'pending')" : `'Pending'`;
    const input = getJsonInput<UpdateDocumentInput>(req.body);

    if (!input.Document_Id) {
      client.release();
      return sendResponse(res, { error: 'Document_Id is required' }, 400);
    }

    // Preload sender/user for approved insert
    const existingDoc = await client.query(
      'SELECT document_id, user_id FROM sender_document_tbl WHERE document_id = $1 LIMIT 1',
      [input.Document_Id]
    );

    if (existingDoc.rows.length === 0) {
      client.release();
      return sendResponse(res, { error: 'Document not found' }, 404);
    }

    const updates: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    // Build dynamic update query
    const allowedFields = hasStatus ? ['Status', 'Priority', 'Type', 'description'] : ['Priority', 'Type', 'description'];
    if (!hasStatus && input.Status !== undefined) {
      client.release();
      return sendResponse(res, { error: 'Status column not available in sender_document_tbl' }, 400);
    }

    for (const field of allowedFields) {
      if (field in input && input[field as keyof UpdateDocumentInput] !== undefined) {
        let value = input[field as keyof UpdateDocumentInput];

        // Normalize status casing to satisfy DB check constraints
        if (field === 'Status' && typeof value === 'string') {
          value = (value as string).toLowerCase();
        }

        updates.push(`${field} = $${paramCount}`);
        params.push(value);
        paramCount++;
      }
    }

    if (input.Document) {
      updates.push(`Document = $${paramCount}`);
      params.push(Buffer.from(input.Document, 'base64'));
      paramCount++;
    }

    if (updates.length === 0) {
      client.release();
      return sendResponse(res, { error: 'No fields to update' }, 400);
    }

    params.push(input.Document_Id);
    const sql = `UPDATE Sender_Document_Tbl SET ${updates.join(', ')} WHERE Document_Id = $${paramCount}`;

    await client.query('BEGIN');
    await client.query(sql, params);

    // If approved, persist to approved_document_tbl (avoid duplicates)
    const statusValue = (input.Status || '').toLowerCase();
    if (statusValue === 'approved') {
      const approvedCheck = await client.query(
        'SELECT approved_doc_id FROM approved_document_tbl WHERE document_id = $1 LIMIT 1',
        [input.Document_Id]
      );

      if (approvedCheck.rows.length === 0) {
        await client.query(
          'INSERT INTO approved_document_tbl (document_id, user_id, admin, status) VALUES ($1, $2, $3, $4)',
          [input.Document_Id, existingDoc.rows[0].user_id, input.admin ?? null, 'not_forwarded']
        );
      } else if (input.admin) {
        await client.query('UPDATE approved_document_tbl SET admin = $1 WHERE document_id = $2', [input.admin, input.Document_Id]);
      }
    }

    await client.query('COMMIT');

    // Fetch updated document
    const docResult = await client.query(
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
      client.release();
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

    client.release();
    sendResponse(res, document);
  } catch (error: any) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('Rollback failed:', rollbackError);
    }
    client.release();
    console.error('Update document error:', error);
    sendResponse(res, { error: 'Database error: ' + error.message }, 500);
  }
});

export default router;

