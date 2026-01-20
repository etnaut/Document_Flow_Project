import { Router, Request, Response } from 'express';
import pool from '../config/database.js';
import { sendResponse, getJsonInput } from '../utils/helpers.js';
import { CreateDocumentInput, UpdateDocumentInput, Document } from '../types/index.js';
import { hasSenderStatusColumn, ensureReviseStatusAllowed, ensureApprovedStatusAllowed } from '../utils/schema.js';
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

    const derivedStatus = `CASE WHEN EXISTS (SELECT 1 FROM revision_document_tbl r WHERE r.document_id = sd.document_id) THEN 'Revision' ELSE ${statusSelect} END`;

    let sql = `
      SELECT 
        sd.document_id AS "Document_Id",
        sd.type AS "Type",
        sd.user_id AS "User_Id",
        ${derivedStatus} AS "Status",
        sd.priority AS "Priority",
        sd.document AS "Document",
        sd.description AS "description",
        sd.date AS "created_at",
        u.Full_Name AS sender_name,
        d.Department AS sender_department,
        dv.Division AS sender_division,
        u.Department_Id AS sender_department_id,
        u.Division_Id AS sender_division_id,
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

    if (status) {
      sql += ` AND LOWER(${derivedStatus}) = LOWER($${paramCount})`;
      params.push(status);
      paramCount++;
    }

    // If Employee, only their own documents; Admin-like users see documents only from their department/division
    const roleNormalized = (role || '').toLowerCase();
    const isAdminLike = roleNormalized && roleNormalized !== 'employee' && roleNormalized !== 'superadmin';

    if (role === 'Employee' && userId) {
      sql += ` AND sd.User_Id = $${paramCount}`;
      params.push(userId);
      paramCount++;
    }

    if (isAdminLike && userId) {
      // Lookup admin's dept/div ids
      const adminRes = await pool.query('SELECT department_id, division_id FROM user_tbl WHERE user_id = $1 LIMIT 1', [userId]);
      if (adminRes.rows.length > 0) {
        const adminDeptId = adminRes.rows[0].department_id;
        const adminDivId = adminRes.rows[0].division_id;
        if (adminDeptId !== null && adminDeptId !== undefined) {
          sql += ` AND u.department_id = $${paramCount}`;
          params.push(adminDeptId);
          paramCount++;
        }
        if (adminDivId !== null && adminDivId !== undefined) {
          sql += ` AND u.division_id = $${paramCount}`;
          params.push(adminDivId);
          paramCount++;
        }
      }
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

// GET /documents/revisions - list revision entries
router.get('/revisions', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT r.document_id, r.user_id, r.comment, r.admin,
              sd.type AS document_type,
              u.full_name AS sender_name
         FROM revision_document_tbl r
         LEFT JOIN sender_document_tbl sd ON r.document_id = sd.document_id
         LEFT JOIN user_tbl u ON r.user_id = u.user_id
         ORDER BY r.revision_doc_id DESC`
    );

    const revisions = result.rows.map((row) => ({
      document_id: row.document_id,
      user_id: row.user_id,
      comment: row.comment ?? null,
      admin: row.admin ?? null,
      document_type: row.document_type ?? null,
      sender_name: row.sender_name ?? null,
    }));

    sendResponse(res, revisions);
  } catch (error: any) {
    console.error('Get revisions error:', error);
    sendResponse(res, { error: 'Database error: ' + error.message }, 500);
  }
});

// GET /documents/approved - list approved documents with type/priority/document and user/admin info
router.get('/approved', async (req: Request, res: Response) => {
  try {
    const department = req.query.department as string | undefined;
    const statusParam = req.query.status as string | undefined;
    const userId = req.query.userId ? parseInt(String(req.query.userId)) : undefined;

    const params: any[] = [];
    const conditions: string[] = [];

    if (statusParam) {
      const statuses = statusParam
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      if (statuses.length) {
        params.push(statuses);
        conditions.push(`LOWER(a.status) = ANY($${params.length})`);
      }
    } else {
      // Include recorded by default as it should be treated same as forwarded from the division/recorder perspective
      conditions.push("COALESCE(LOWER(a.status), '') IN ('forwarded','not_forwarded','recorded')");
    }

    if (department) {
      params.push(department);
      conditions.push(`LOWER(d.department) = LOWER($${params.length})`);
    }

    // If userId is provided and user is admin-like, restrict by the admin's department_id/division_id
    if (userId) {
      const adminRes = await pool.query('SELECT department_id, division_id FROM user_tbl WHERE user_id = $1 LIMIT 1', [userId]);
      if (adminRes.rows.length > 0) {
        const adminDeptId = adminRes.rows[0].department_id;
        const adminDivId = adminRes.rows[0].division_id;
        if (adminDeptId !== null && adminDeptId !== undefined) {
          params.push(adminDeptId);
          conditions.push(`u.department_id = $${params.length}`);
        }
        if (adminDivId !== null && adminDivId !== undefined) {
          params.push(adminDivId);
          conditions.push(`u.division_id = $${params.length}`);
        }
      }
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query(
    `SELECT 
      a.document_id AS "Document_Id",
      sd.type AS "Type",
      sd.priority AS "Priority",
      sd.document AS "Document",
      INITCAP(REPLACE(COALESCE(a.status, 'not_forwarded'), '_', ' ')) AS "Status",
      u.full_name AS sender_name,
      CASE WHEN a.admin ~ '^[0-9]+$' THEN (SELECT full_name FROM user_tbl WHERE user_id = CAST(a.admin AS INTEGER) LIMIT 1) ELSE a.admin END AS approved_by,
      a.status AS approved_status,
      u.department_id AS sender_department_id,
      u.division_id AS sender_division_id
       FROM approved_document_tbl a
       LEFT JOIN sender_document_tbl sd ON sd.document_id = a.document_id
       LEFT JOIN user_tbl u ON u.user_id = a.user_id
       LEFT JOIN department_tbl d ON u.department_id = d.department_id
       ${where}
       ORDER BY a.document_id DESC`,
      params
    );

    const docs = result.rows.map((row) => ({
      ...row,
      Document: row.Document ? Buffer.from(row.Document) : null,
      description: row.approved_by || row.approved_status || null,
      target_department: null,
      comments: null,
      forwarded_from: null,
      forwarded_by_admin: row.approved_by || null,
      is_forwarded_request: null,
      created_at: null,
    }));

    sendResponse(res, docs);
  } catch (error: any) {
    console.error('Get approved documents error:', error);
    sendResponse(res, { error: 'Database error: ' + error.message }, 500);
  }
});

// DELETE /documents/:id - remove a document
router.delete('/:id', async (req: Request, res: Response) => {
  const documentId = Number(req.params.id);
  if (!Number.isFinite(documentId)) {
    return sendResponse(res, { error: 'Invalid Document_Id' }, 400);
  }

  try {
    const result = await pool.query('DELETE FROM sender_document_tbl WHERE document_id = $1 RETURNING document_id', [documentId]);
    if (result.rowCount === 0) {
      return sendResponse(res, { error: 'Document not found' }, 404);
    }
    sendResponse(res, { success: true, Document_Id: documentId });
  } catch (error: any) {
    console.error('Delete document error:', error);
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

  const statusValue: string = (input.Status || '').toLowerCase();
    const senderAllowedStatuses = ['pending', 'approved', 'revise'];

    if (statusValue === 'forwarded' || statusValue === 'recorded' || statusValue === 'approved') {
      await ensureApprovedStatusAllowed();
    }

    if (statusValue === 'revision' && hasStatus) {
      await ensureReviseStatusAllowed();
    }

    if (!hasStatus && input.Status !== undefined) {
      client.release();
      return sendResponse(res, { error: 'Status column not available in sender_document_tbl' }, 400);
    }

    const buildUpdates = (includeStatus: boolean) => {
      const updates: string[] = [];
      const params: any[] = [];
      let paramCount = 1;
      const allowedFields = hasStatus ? ['Status', 'Priority', 'Type', 'description'] : ['Priority', 'Type', 'description'];

      for (const field of allowedFields) {
        if (field === 'Status' && !includeStatus) continue;
        if (field in input && input[field as keyof UpdateDocumentInput] !== undefined) {
          let value = input[field as keyof UpdateDocumentInput];

          if (field === 'Status' && typeof value === 'string') {
            const normalized = (value as string).toLowerCase();
            const mapped = normalized === 'revision' ? 'revise' : normalized;
            if (!senderAllowedStatuses.includes(mapped)) {
              continue;
            }
            value = mapped;
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

      return { updates, params, paramCount };
    };

    const upsertRecordDocument = async (
      approvedDocId: number,
      recordStatus?: string,
    ) => {
      const statusVal = recordStatus || 'recorded';
      const existingRecord = await client.query(
        'SELECT record_doc_id FROM record_document_tbl WHERE approved_doc_id = $1 LIMIT 1',
        [approvedDocId]
      );

      if (existingRecord.rows.length === 0) {
        await client.query(
          'INSERT INTO record_document_tbl (approved_doc_id, status) VALUES ($1, $2)',
          [approvedDocId, statusVal]
        );
      } else {
        await client.query(
          'UPDATE record_document_tbl SET status = $1 WHERE record_doc_id = $2',
          [statusVal, existingRecord.rows[0].record_doc_id]
        );
      }
    };

    // Build updates for updating the sender document; include status when appropriate
    const { updates, params } = buildUpdates(true);

    if (updates.length === 0 && !statusValue) {
      client.release();
      return sendResponse(res, { error: 'No fields to update' }, 400);
    }

    const runUpdate = async (u: string[], p: any[]) => {
      if (u.length === 0) return;
      const sql = `UPDATE Sender_Document_Tbl SET ${u.join(', ')} WHERE Document_Id = $${u.length + 1}`;
      await client.query(sql, [...p, input.Document_Id]);
    };

    let updated = false;

    try {
      await client.query('BEGIN');
      await runUpdate(updates, params);

      // Persist side effects based on status
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

      // When marking as forwarded, update approved_document_tbl status accordingly
      if (statusValue === 'forwarded') {
        const approvedCheck = await client.query(
          'SELECT approved_doc_id FROM approved_document_tbl WHERE document_id = $1 LIMIT 1',
          [input.Document_Id]
        );

        if (approvedCheck.rows.length === 0) {
          await client.query(
            'INSERT INTO approved_document_tbl (document_id, user_id, admin, status) VALUES ($1, $2, $3, $4)',
            [input.Document_Id, existingDoc.rows[0].user_id, input.admin ?? null, 'forwarded']
          );
        } else {
          await client.query(
            'UPDATE approved_document_tbl SET status = $1, admin = COALESCE($2, admin) WHERE document_id = $3',
            ['forwarded', input.admin ?? null, input.Document_Id]
          );
        }
      }

      // When marking as recorded, persist to approved_document_tbl and record_document_tbl
      if (statusValue === 'recorded') {
        const approvedCheck = await client.query(
          'SELECT approved_doc_id FROM approved_document_tbl WHERE document_id = $1 LIMIT 1',
          [input.Document_Id]
        );

  const recordStatusVal = (input.record_status || 'recorded').toLowerCase();
        let approvedDocId: number;

        if (approvedCheck.rows.length === 0) {
          const inserted = await client.query(
            'INSERT INTO approved_document_tbl (document_id, user_id, admin, status) VALUES ($1, $2, $3, $4) RETURNING approved_doc_id',
            [input.Document_Id, existingDoc.rows[0].user_id, input.admin ?? null, 'recorded']
          );
          approvedDocId = inserted.rows[0].approved_doc_id;
        } else {
          approvedDocId = approvedCheck.rows[0].approved_doc_id;
          await client.query(
            'UPDATE approved_document_tbl SET status = $1, admin = COALESCE($2, admin) WHERE document_id = $3',
            ['recorded', input.admin ?? null, input.Document_Id]
          );
        }

        await upsertRecordDocument(approvedDocId, recordStatusVal);
      }

      if (statusValue === 'revision') {
        await client.query(
          'INSERT INTO revision_document_tbl (document_id, user_id, comment, admin) VALUES ($1, $2, $3, $4)',
          [input.Document_Id, existingDoc.rows[0].user_id, input.comments ?? null, input.admin ?? null]
        );
      }

      // When resubmitting, remove any revision entry so the derived status returns to Pending
      if (statusValue === 'pending') {
        await client.query('DELETE FROM revision_document_tbl WHERE document_id = $1', [input.Document_Id]);
      }

      await client.query('COMMIT');
      updated = true;
    } catch (error: any) {
      await client.query('ROLLBACK');
      // If revision caused check constraint on status, retry without status column
      if (statusValue === 'revision' && error?.code === '23514') {
        const { updates: updatesNoStatus, params: paramsNoStatus } = buildUpdates(false);
        try {
          await client.query('BEGIN');
          await runUpdate(updatesNoStatus, paramsNoStatus);
          await client.query(
            'INSERT INTO revision_document_tbl (document_id, user_id, comment, admin) VALUES ($1, $2, $3, $4)',
            [input.Document_Id, existingDoc.rows[0].user_id, input.comments ?? null, input.admin ?? null]
          );
          await client.query('COMMIT');
          updated = true;
        } catch (retryError) {
          await client.query('ROLLBACK');
          throw retryError;
        }
      } else {
        throw error;
      }
    }

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

    if (statusValue === 'revision') {
      document.Status = 'Revision';
    }

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

// GET /documents/records - list recorded/not recorded entries with document info
router.get('/records', async (req: Request, res: Response) => {
  const { department, status } = req.query;
  try {
    const params: any[] = [];
    const conditions: string[] = [];

    if (status) {
      const statuses = String(status)
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      if (statuses.length) {
        params.push(statuses);
        conditions.push(`TRIM(LOWER(rd.status)) = ANY($${params.length})`);
      }
    }

    if (department) {
      params.push(department);
      conditions.push(`LOWER(dept.department) = LOWER($${params.length})`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query(
      `
      SELECT
        rd.record_doc_id,
        rd.approved_doc_id,
        rd.status AS record_status,
        ad.status AS approved_status,
        ad.document_id,
  sd.type,
        sd.document,
        sd.priority,
        sd.description,
  sd.date AS created_at,
  u.full_name AS sender_name,
        dept.department AS target_department
      FROM record_document_tbl rd
      JOIN approved_document_tbl ad ON rd.approved_doc_id = ad.approved_doc_id
      JOIN sender_document_tbl sd ON ad.document_id = sd.document_id
      JOIN user_tbl u ON ad.user_id = u.user_id
      LEFT JOIN department_tbl dept ON u.department_id = dept.department_id
      ${where}
      ORDER BY rd.record_doc_id DESC
      `,
      params
    );

    const data = result.rows.map((row) => {
      const statusLower = (row.record_status || '').toLowerCase();
      
      // Always display 'Not Released' when the record row status is 'recorded'.
      // This makes it clear the document has been recorded but not yet released.
      let statusLabel: string;
      if (statusLower === 'recorded') {
        statusLabel = 'Not Released';
      } else if (statusLower === 'not_recorded') {
        statusLabel = 'Not Recorded';
      } else if (statusLower === 'released') {
        statusLabel = 'Released';
      } else {
        statusLabel = row.record_status || 'Not Released';
      }

      return {
  Document_Id: row.document_id,
  record_doc_id: row.record_doc_id,
        Type: row.type,
        Document: row.document,
        Priority: row.priority || 'Normal',
        Status: statusLabel,
        description: row.description ?? null,
        created_at: row.created_at,
        sender_name: row.sender_name || '',
        target_department: row.target_department || '',
      };
    });

    return sendResponse(res, data, 200);
  } catch (error: any) {
    console.error('Get record documents error:', error);
    return sendResponse(res, { error: 'Database error: ' + error.message }, 500);
  }
});

// PUT /documents/records/:recordDocId - update record status (e.g., release)
router.put('/records/:recordDocId', async (req: Request, res: Response) => {
  const recordDocId = Number(req.params.recordDocId);
  const { status } = req.body as { status?: string };

  if (!Number.isFinite(recordDocId)) {
    return sendResponse(res, { error: 'Invalid record_doc_id' }, 400);
  }

  const statusVal = String(status || '').trim().toLowerCase();
  if (!statusVal) {
    return sendResponse(res, { error: 'Status is required' }, 400);
  }

  try {
    const result = await pool.query(
      `UPDATE record_document_tbl
       SET status = $1
       WHERE record_doc_id = $2
       RETURNING record_doc_id, approved_doc_id, status, comment`,
      [statusVal, recordDocId]
    );

    if (result.rowCount === 0) {
      return sendResponse(res, { error: 'Record not found' }, 404);
    }

    return sendResponse(res, {
      record_doc_id: result.rows[0].record_doc_id,
      approved_doc_id: result.rows[0].approved_doc_id,
      status: result.rows[0].status,
      comment: result.rows[0].comment,
    });
  } catch (error: any) {
    console.error('Update record status error:', error);
    return sendResponse(res, { error: 'Database error: ' + error.message }, 500);
  }
});

// POST /releases - create a release entry and mark record as released
router.post('/releases', async (req: Request, res: Response) => {
  const { record_doc_id, status, department, division } = req.body as { record_doc_id?: number; status?: string; department?: string | string[]; division?: string | string[] };

  const recordDocId = Number(record_doc_id);
  const statusVal = String(status || '').trim().toLowerCase();

  // Normalize departments and divisions into arrays
  const departmentsArr: string[] = Array.isArray(department)
    ? department.map((d) => String(d || '').trim()).filter(Boolean)
    : (String(department || '').trim() ? [String(department || '').trim()] : []);

  const divisionsArrRaw: string[] = Array.isArray(division)
    ? division.map((d) => String(d || '').trim()).filter(Boolean)
    : (String(division || '').trim() ? [String(division || '').trim()] : []);

  // divisionsArr may be empty meaning department-level release (no specific division)
  const divisionsArr = divisionsArrRaw.length > 0 ? divisionsArrRaw : [null as any];

  if (!Number.isFinite(recordDocId)) {
    return sendResponse(res, { error: 'Invalid record_doc_id' }, 400);
  }
  if (!statusVal) {
    return sendResponse(res, { error: 'Status is required' }, 400);
  }
  if (departmentsArr.length === 0) {
    return sendResponse(res, { error: 'At least one Department is required' }, 400);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const recordRes = await client.query(
      `SELECT rd.record_doc_id, rd.approved_doc_id, rd.status AS record_status,
              ad.document_id, sd.type, sd.document
         FROM record_document_tbl rd
         JOIN approved_document_tbl ad ON rd.approved_doc_id = ad.approved_doc_id
         JOIN sender_document_tbl sd ON ad.document_id = sd.document_id
        WHERE rd.record_doc_id = $1
        FOR UPDATE`,
      [recordDocId]
    );

    if (recordRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return sendResponse(res, { error: 'Record not found' }, 404);
    }

    const rec = recordRes.rows[0];

    // Insert only into columns that actually exist to avoid "column does not exist" errors on older schemas
    const releaseColumnsRes = await client.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'release_document_tbl'`
    );
    const releaseColumns = new Set<string>(releaseColumnsRes.rows.map((r) => r.column_name));

    const candidateColumns: Array<[string, any]> = [
      ['record_doc_id', rec.record_doc_id],
      ['approved_doc_id', rec.approved_doc_id],
      ['document_id', rec.document_id],
      ['type', rec.type],
      ['document', rec.document],
      ['status', statusVal],
      ['department', null], // placeholder
      ['division', null], // placeholder
      ['mark', 'not_done'],
    ];

    const columnsToInsert = candidateColumns.filter(([col]) => releaseColumns.has(col));

    if (columnsToInsert.length === 0) {
      throw new Error('release_document_tbl has no expected columns to insert');
    }

    const columnNames = columnsToInsert.map(([col]) => col).join(', ');
    const placeholders = columnsToInsert.map((_, idx) => `$${idx + 1}`).join(', ');

    // Insert a row for each department/division pair
    const inserted: Array<{ department: string | null; division: string | null }> = [];

    for (const dept of departmentsArr) {
      for (const div of divisionsArr) {
        const values = columnsToInsert.map(([col]) => {
          if (col === 'department') return dept;
          if (col === 'division') return div;
          // find value from candidateColumns
          const found = candidateColumns.find(([c]) => c === col);
          return found ? found[1] : null;
        });

        await client.query(
          `INSERT INTO release_document_tbl (${columnNames}) VALUES (${placeholders})`,
          values
        );

        inserted.push({ department: dept || null, division: div || null });
      }
    }

    await client.query('UPDATE record_document_tbl SET status = $1 WHERE record_doc_id = $2', ['released', rec.record_doc_id]);

    await client.query('COMMIT');

    return sendResponse(res, {
      record_doc_id: rec.record_doc_id,
      approved_doc_id: rec.approved_doc_id,
      document_id: rec.document_id,
      type: rec.type,
      status: statusVal,
      inserted,
    });
  } catch (error: any) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('Rollback failed:', rollbackError);
    }
    console.error('Create release error:', error);
    return sendResponse(res, { error: 'Database error: ' + error.message }, 500);
  } finally {
    client.release();
  }
});

// GET /releases - list releases filtered by department/division (matches user dept/div)
router.get('/releases', async (req: Request, res: Response) => {
  const department = String(req.query.department || '').trim();
  const division = String(req.query.division || '').trim();
  const userId = req.query.userId ? parseInt(String(req.query.userId)) : undefined;

  try {
    // Inspect available release columns to drive filtering fallbacks
    const colsRes = await pool.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'release_document_tbl'`
    );
    const cols = new Set<string>(colsRes.rows.map((r) => r.column_name));

    const where: string[] = [];
    const values: any[] = [];

    // Prefer release_document_tbl department/division columns if they exist, otherwise fall back to user dept/div via joins
    if (department) {
      if (cols.has('department')) {
        values.push(department.toLowerCase());
        where.push(`LOWER(COALESCE(r.department, '')) = $${values.length}`);
      } else {
        values.push(department.toLowerCase());
        where.push(`LOWER(COALESCE(d.Department, '')) = $${values.length}`);
      }
    }

    if (division) {
      if (cols.has('division')) {
        values.push(division.toLowerCase());
        where.push(`LOWER(COALESCE(r.division, '')) = $${values.length}`);
      } else {
        values.push(division.toLowerCase());
        where.push(`LOWER(COALESCE(dv.Division, '')) = $${values.length}`);
      }
    }

    // If userId provided, prefer numeric comparison against sender's user_tbl entries
    if (userId) {
      const adminRes = await pool.query('SELECT department_id, division_id FROM user_tbl WHERE user_id = $1 LIMIT 1', [userId]);
      if (adminRes.rows.length > 0) {
        const adminDeptId = adminRes.rows[0].department_id;
        const adminDivId = adminRes.rows[0].division_id;
        if (adminDeptId !== null && adminDeptId !== undefined) {
          values.push(adminDeptId);
          where.push(`u.department_id = $${values.length}`);
        }
        if (adminDivId !== null && adminDivId !== undefined) {
          values.push(adminDivId);
          where.push(`u.division_id = $${values.length}`);
        }
      }
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    // Build select list including optional 'mark' if it exists
    const selectCols: string[] = [
      'r.record_doc_id',
      'ad.approved_doc_id',
      'sd.document_id',
      'sd.type',
      'sd.document',
      'sd.user_id',
      'u.full_name',
      'r.status',
      "COALESCE(r.department, d.Department) AS department",
      "COALESCE(r.division, dv.Division) AS division",
      'u.department_id AS sender_department_id',
      'u.division_id AS sender_division_id',
      'ad.admin AS admin',
    ];

    if (cols.has('mark')) {
      selectCols.push('r.mark');
    }

    // Pull the required fields from joined tables
    const result = await pool.query(
      `SELECT ${selectCols.join(',\n         ')}
       FROM release_document_tbl r
       JOIN record_document_tbl rd ON rd.record_doc_id = r.record_doc_id
       JOIN approved_document_tbl ad ON ad.approved_doc_id = rd.approved_doc_id
       JOIN sender_document_tbl sd ON sd.document_id = ad.document_id
       LEFT JOIN user_tbl u ON u.user_id = sd.user_id
       LEFT JOIN Department_Tbl d ON u.Department_Id = d.Department_Id
       LEFT JOIN Division_Tbl dv ON u.Division_Id = dv.Division_Id
       ${whereSql}
       ORDER BY r.record_doc_id DESC`,
      values
    );

    return sendResponse(res, result.rows);
  } catch (error: any) {
    console.error('List releases error:', error);
    return sendResponse(res, { error: 'Database error: ' + error.message }, 500);
  }
});

// PUT /releases/:recordDocId/mark - update mark column on a release record (if supported)
router.put('/releases/:recordDocId/mark', async (req: Request, res: Response) => {
  const recordDocId = Number(req.params.recordDocId);
  const mark = String((req.body && req.body.mark) ?? '').trim();

  if (!Number.isFinite(recordDocId)) {
    return sendResponse(res, { error: 'Invalid record_doc_id' }, 400);
  }
  if (!mark) {
    return sendResponse(res, { error: 'Mark is required' }, 400);
  }

  try {
    // Ensure 'mark' column exists
    const colRes = await pool.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name = 'release_document_tbl' AND column_name = 'mark' LIMIT 1`
    );
    if (colRes.rowCount === 0) {
      return sendResponse(res, { error: "release_document_tbl does not have a 'mark' column" }, 400);
    }

    const result = await pool.query(
      `UPDATE release_document_tbl SET mark = $1 WHERE record_doc_id = $2 RETURNING *`,
      [mark, recordDocId]
    );

    if (result.rowCount === 0) {
      return sendResponse(res, { error: 'Release record not found' }, 404);
    }

    return sendResponse(res, result.rows[0]);
  } catch (error: any) {
    console.error('Update release mark error:', error);
    return sendResponse(res, { error: 'Database error: ' + error.message }, 500);
  }
});

// GET /releases/track - get release tracking information for a document
router.get('/releases/track', async (req: Request, res: Response) => {
  const documentId = req.query.documentId ? Number(req.query.documentId) : undefined;
  const approvedDocId = req.query.approvedDocId ? Number(req.query.approvedDocId) : undefined;
  const recordDocId = req.query.recordDocId ? Number(req.query.recordDocId) : undefined;

  if (!documentId && !approvedDocId && !recordDocId) {
    return sendResponse(res, { error: 'documentId, approvedDocId or recordDocId is required' }, 400);
  }

  try {
    const colsRes = await pool.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'release_document_tbl'`
    );
    const cols = new Set<string>(colsRes.rows.map((r) => r.column_name));

    const whereParts: string[] = [];
    const values: any[] = [];

    if (documentId) {
      values.push(documentId);
      whereParts.push(`sd.document_id = $${values.length}`);
    }
    if (approvedDocId) {
      values.push(approvedDocId);
      whereParts.push(`ad.approved_doc_id = $${values.length}`);
    }
    if (recordDocId) {
      values.push(recordDocId);
      whereParts.push(`r.record_doc_id = $${values.length}`);
    }

    // Only filter by mark when provided in query (allow listing in-progress not_done entries)
    const markQuery = req.query.mark ? String(req.query.mark).trim().toLowerCase() : null;
    if (cols.has('mark') && markQuery) {
      values.push(markQuery);
      whereParts.push(`LOWER(r.mark) = $${values.length}`);
    }

    const whereSql = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';

    const selectCols: string[] = [
      'r.record_doc_id',
      'ad.approved_doc_id',
      'sd.document_id',
      'sd.type',
      'sd.document',
      'sd.user_id',
      'u.full_name',
      'r.status',
      "COALESCE(r.department, d.Department) AS department",
      "COALESCE(r.division, dv.Division) AS division",
    ];

    if (cols.has('mark')) selectCols.push('r.mark');

    const result = await pool.query(
      `SELECT ${selectCols.join(',\n         ')}
       FROM release_document_tbl r
       JOIN record_document_tbl rd ON rd.record_doc_id = r.record_doc_id
       JOIN approved_document_tbl ad ON ad.approved_doc_id = rd.approved_doc_id
       JOIN sender_document_tbl sd ON sd.document_id = ad.document_id
       LEFT JOIN user_tbl u ON u.user_id = sd.user_id
       LEFT JOIN Department_Tbl d ON u.Department_Id = d.Department_Id
       LEFT JOIN Division_Tbl dv ON u.Division_Id = dv.Division_Id
       ${whereSql}
       ORDER BY r.record_doc_id DESC`,
      values
    );

    return sendResponse(res, result.rows);
  } catch (error: any) {
    console.error('Track release error:', error);
    return sendResponse(res, { error: 'Database error: ' + error.message }, 500);
  }
});

// POST /documents/respond - Create a respond document entry in respond_document_tbl
router.post('/respond', async (req: Request, res: Response) => {
  try {
    const { release_doc_id, user_id, status, comment, document, document_name, document_type } = req.body as {
      release_doc_id?: number;
      user_id?: number;
      status?: string;
      comment?: string;
      document?: string; // base64
      document_name?: string;
      document_type?: string;
    };

    const releaseDocId = Number(release_doc_id);
    const userId = Number(user_id);
    const statusVal = String(status || '').trim().toLowerCase();
    const commentVal = String(comment || '').trim();
    const documentBase64 = document ? String(document) : '';
    const docName = document_name ? String(document_name) : '';
    const docType = document_type ? String(document_type) : '';

    if (!Number.isFinite(releaseDocId)) {
      return sendResponse(res, { error: 'Invalid release_doc_id' }, 400);
    }
    if (!Number.isFinite(userId)) {
      return sendResponse(res, { error: 'Invalid user_id' }, 400);
    }
    if (!statusVal || (statusVal !== 'actioned' && statusVal !== 'not actioned')) {
      return sendResponse(res, { error: 'Status must be "actioned" or "not actioned"' }, 400);
    }

    // Require either a comment or a file attachment
    if (!commentVal && !documentBase64) {
      return sendResponse(res, { error: 'Comment or file is required' }, 400);
    }

    // Find the foreign key constraint to determine what column it references
    const fkRes = await pool.query(`
      SELECT 
        kcu.column_name AS local_column,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = 'respond_document_tbl'
        AND tc.constraint_name LIKE '%respond_release%'
      LIMIT 1
    `);

    // Check that the release exists using record_doc_id (the value we receive from frontend)
    const releaseCheck = await pool.query(
      'SELECT * FROM release_document_tbl WHERE record_doc_id = $1 LIMIT 1',
      [releaseDocId]
    );

    if (releaseCheck.rows.length === 0) {
      return sendResponse(res, { error: 'Release document not found' }, 404);
    }

    const releaseRow = releaseCheck.rows[0];
    
    // Determine which value to use for the foreign key
    let fkValue: number;
    if (fkRes.rows.length > 0) {
      // Foreign key exists, check what it references
      const fkInfo = fkRes.rows[0];
      const foreignColumn = fkInfo.foreign_column_name;
      
      // Get the value from the release row based on the foreign column name
      if (releaseRow[foreignColumn] !== undefined && releaseRow[foreignColumn] !== null) {
        fkValue = releaseRow[foreignColumn];
      } else {
        // Fallback: if foreign key references record_doc_id, use that
        fkValue = releaseRow.record_doc_id;
      }
    } else {
      // No foreign key constraint found, use record_doc_id as fallback
      fkValue = releaseRow.record_doc_id;
    }

    // Verify that the user_id exists
    const userCheck = await pool.query('SELECT user_id FROM user_tbl WHERE user_id = $1 LIMIT 1', [userId]);
    if (userCheck.rows.length === 0) {
      return sendResponse(res, { error: 'User not found' }, 404);
    }

    // Check if respond_document_tbl exists and get its columns
    const tableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'respond_document_tbl'
    `);

    if (tableCheck.rows.length === 0) {
      return sendResponse(res, { error: 'respond_document_tbl table does not exist' }, 500);
    }

    // Get column information
    const colsRes = await pool.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns 
      WHERE table_name = 'respond_document_tbl'
    `);
    const columns = new Set<string>(colsRes.rows.map((r) => r.column_name));

    // Build insert statement based on available columns
    const insertCols: string[] = [];
    const insertValues: any[] = [];

    // Determine which column to use for the foreign key reference
    // Check what column the foreign key constraint uses in respond_document_tbl
    let fkColumnName: string | null = null;
    if (fkRes.rows.length > 0) {
      fkColumnName = fkRes.rows[0].local_column;
    }
    
    // release_doc_id is required (maps to the foreign key column)
    if (fkColumnName && columns.has(fkColumnName)) {
      // Use the column name from the foreign key constraint
      insertCols.push(fkColumnName);
      insertValues.push(fkValue);
    } else if (columns.has('release_doc_id')) {
      insertCols.push('release_doc_id');
      insertValues.push(fkValue);
    } else if (columns.has('record_doc_id')) {
      // Fallback to record_doc_id if release_doc_id doesn't exist
      insertCols.push('record_doc_id');
      insertValues.push(fkValue);
    } else {
      return sendResponse(res, { error: `respond_document_tbl does not have the required foreign key column. Expected: ${fkColumnName || 'release_doc_id or record_doc_id'}` }, 500);
    }

    // user_id is required
    if (columns.has('user_id')) {
      insertCols.push('user_id');
      insertValues.push(userId);
    } else {
      return sendResponse(res, { error: 'respond_document_tbl does not have user_id column' }, 500);
    }

    // status is required
    if (columns.has('status')) {
      insertCols.push('status');
      insertValues.push(statusVal);
    } else {
      return sendResponse(res, { error: 'respond_document_tbl does not have status column' }, 500);
    }

    // comment is required unless a document is attached
    if (columns.has('comment')) {
      if (commentVal) {
        insertCols.push('comment');
        insertValues.push(commentVal);
      } else if (!(columns.has('document') && documentBase64)) {
        return sendResponse(res, { error: 'Comment is required when no file is attached' }, 400);
      }
    } else if (!columns.has('document') || !documentBase64) {
      return sendResponse(res, { error: 'respond_document_tbl does not have comment column and no document provided' }, 500);
    }

    // If respond_document_tbl has a document column and a file was provided, include it
    if (columns.has('document') && documentBase64) {
      insertCols.push('document');
      try {
        insertValues.push(Buffer.from(documentBase64, 'base64'));
      } catch (err) {
        return sendResponse(res, { error: 'Invalid base64 document data' }, 400);
      }
    }

    // Optional document name / filename
    if (docName && (columns.has('document_name') || columns.has('filename') || columns.has('file_name'))) {
      const nameCol = columns.has('document_name') ? 'document_name' : (columns.has('filename') ? 'filename' : 'file_name');
      insertCols.push(nameCol);
      insertValues.push(docName);
    }

    // Optional document mime/type
    if (docType && (columns.has('document_type') || columns.has('mime') || columns.has('content_type'))) {
      const typeCol = columns.has('document_type') ? 'document_type' : (columns.has('mime') ? 'mime' : 'content_type');
      insertCols.push(typeCol);
      insertValues.push(docType);
    }

    // Build the INSERT statement
    const placeholders = insertCols.map((_, idx) => `$${idx + 1}`).join(', ');
    const columnNames = insertCols.join(', ');

    const result = await pool.query(
      `INSERT INTO respond_document_tbl (${columnNames}) VALUES (${placeholders}) RETURNING *`,
      insertValues
    );

    const row = result.rows[0] || {};
    // Convert any Buffer fields to base64 strings for JSON transport
    for (const key of Object.keys(row)) {
      const val = row[key];
      if (val && Buffer.isBuffer(val)) {
        row[key] = val.toString('base64');
      }
    }

    return sendResponse(res, row, 201);
  } catch (error: any) {
    console.error('Create respond document error:', error);
    return sendResponse(res, { error: 'Database error: ' + error.message }, 500);
  }
});

// GET /track - comprehensive tracking information for a document
router.get('/track', async (req: Request, res: Response) => {
  const documentId = req.query.documentId ? Number(req.query.documentId) : undefined;
  if (!documentId || !Number.isFinite(documentId)) {
    return sendResponse(res, { error: 'documentId is required' }, 400);
  }

  try {
    // Sender info (status may not exist on older schemas)
    const hasStatus = await hasSenderStatusColumn();
    const senderSql = `
      SELECT
        sd.document_id,
        ${hasStatus ? "COALESCE(sd.Status, 'pending') AS status," : "'pending' AS status,"}
        sd.user_id,
        u.full_name,
        d.department AS sender_department,
        dv.division AS sender_division,
        u.department_id AS sender_department_id,
        u.division_id AS sender_division_id
      FROM Sender_Document_Tbl sd
      LEFT JOIN User_Tbl u ON sd.User_Id = u.User_Id
      LEFT JOIN Department_Tbl d ON u.Department_Id = d.Department_Id
      LEFT JOIN Division_Tbl dv ON u.Division_Id = dv.Division_Id
      WHERE sd.Document_Id = $1
    `;

    const senderRes = await pool.query(senderSql, [documentId]);
    if (senderRes.rows.length === 0) {
      return sendResponse(res, { error: 'Document not found' }, 404);
    }

    const sender = senderRes.rows[0];

    // Approved (division head) info
    const approvedRes = await pool.query(
      'SELECT approved_doc_id, status, admin, user_id FROM approved_document_tbl WHERE document_id = $1 LIMIT 1',
      [documentId]
    );
    const approved = approvedRes.rows[0] ?? null;

    // Recorder / record_document_tbl
    let record: any = null;
    if (approved) {
      const rd = await pool.query(
        'SELECT record_doc_id, status FROM record_document_tbl WHERE approved_doc_id = $1 ORDER BY record_doc_id DESC LIMIT 1',
        [approved.approved_doc_id]
      );
      record = rd.rows[0] ?? null;
    }

    // Releases (releaser) history
    const colsRes = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'release_document_tbl'");
    const cols = new Set<string>(colsRes.rows.map((r) => r.column_name));

    const selectCols: string[] = [
      'r.record_doc_id',
      'ad.approved_doc_id',
      'sd.document_id',
      'sd.type',
      'sd.document',
      'sd.user_id',
      'u.full_name',
      'r.status',
      "COALESCE(r.department, d.Department) AS department",
      "COALESCE(r.division, dv.Division) AS division"
    ];

    if (cols.has('mark')) selectCols.push('r.mark');

    const releasesRes = await pool.query(
      `SELECT ${selectCols.join(',\n         ')}
       FROM release_document_tbl r
       JOIN record_document_tbl rd ON rd.record_doc_id = r.record_doc_id
       JOIN approved_document_tbl ad ON ad.approved_doc_id = rd.approved_doc_id
       JOIN sender_document_tbl sd ON sd.document_id = ad.document_id
       LEFT JOIN user_tbl u ON u.user_id = sd.user_id
       LEFT JOIN department_tbl d ON u.department_id = d.department_id
       LEFT JOIN division_tbl dv ON u.division_id = dv.division_id
       WHERE sd.document_id = $1
       ORDER BY r.record_doc_id DESC`,
      [documentId]
    );

    const releases = releasesRes.rows || [];

    // Fetch responses from respond_document_tbl for releases with mark='done'
    // Follow the chain: respond_document_tbl.release_doc_id -> release_document_tbl.record_doc_id 
    // -> record_document_tbl.approved_doc_id -> approved_document_tbl.document_id
    const responses: any[] = [];
    
    // Check if respond_document_tbl exists
    const respondTableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'respond_document_tbl'
    `);

    if (respondTableCheck.rows.length > 0) {
      // Get column info for respond_document_tbl
      const respondColsRes = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'respond_document_tbl'
      `);
      const respondCols = new Set<string>(respondColsRes.rows.map((r) => r.column_name));

      // Determine the foreign key column name in respond_document_tbl
      let fkColumnName = 'release_doc_id';
      if (!respondCols.has('release_doc_id') && respondCols.has('record_doc_id')) {
        fkColumnName = 'record_doc_id';
      }

      if (respondCols.has(fkColumnName)) {
        // First, check what column in release_document_tbl the foreign key references
        const fkInfoRes = await pool.query(`
          SELECT 
            ccu.column_name AS foreign_column_name
          FROM information_schema.table_constraints AS tc
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
          WHERE tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_name = 'respond_document_tbl'
            AND kcu.column_name = '${fkColumnName}'
            AND ccu.table_name = 'release_document_tbl'
          LIMIT 1
        `);

        let releaseJoinColumn = 'record_doc_id'; // default
        if (fkInfoRes.rows.length > 0) {
          releaseJoinColumn = fkInfoRes.rows[0].foreign_column_name;
        }

        // Fetch responses with user, department, and division information
        // Build the join chain depending on how respond_document_tbl references releases/records
        // If respond_document_tbl uses release_doc_id, join release -> record -> approved -> sender
        // If it uses record_doc_id, join record -> approved -> sender directly
        let respondJoin = '';
        if (fkColumnName === 'release_doc_id') {
          respondJoin = `JOIN release_document_tbl r ON r.release_doc_id = rd.${fkColumnName}
                         JOIN record_document_tbl rec ON rec.record_doc_id = r.record_doc_id
                         JOIN approved_document_tbl ad ON ad.approved_doc_id = rec.approved_doc_id
                         JOIN sender_document_tbl sd ON sd.document_id = ad.document_id`;
        } else {
          respondJoin = `JOIN record_document_tbl rec ON rec.record_doc_id = rd.${fkColumnName}
                         JOIN approved_document_tbl ad ON ad.approved_doc_id = rec.approved_doc_id
                         JOIN sender_document_tbl sd ON sd.document_id = ad.document_id`;
        }
         const respondSelectCols: string[] = [
          'rd.respond_doc_id',
          'rd.user_id',
          "u.full_name AS full_name",
          'u.department_id',
          'u.division_id',
          "d.department AS department",
          "dv.division AS division",
          'rd.status',
        ];

        if (respondCols.has('comment')) respondSelectCols.push('rd.comment');
        if (respondCols.has('document')) respondSelectCols.push('rd.document');
        if (respondCols.has('document_name')) respondSelectCols.push('rd.document_name');
        else if (respondCols.has('filename')) respondSelectCols.push('rd.filename');
        else if (respondCols.has('file_name')) respondSelectCols.push('rd.file_name');
        if (respondCols.has('document_type')) respondSelectCols.push('rd.document_type');
        else if (respondCols.has('mime')) respondSelectCols.push('rd.mime');
        else if (respondCols.has('content_type')) respondSelectCols.push('rd.content_type');

        // Always include sender document info (alias the sender's document to avoid clashing with rd.document)
        respondSelectCols.push('sd.document_id', 'sd.type', 'sd.document AS sender_document');

        const respondRes = await pool.query(
          `SELECT ${respondSelectCols.join(',\n         ')}
           FROM respond_document_tbl rd
           ${respondJoin}
           LEFT JOIN user_tbl u ON u.user_id = rd.user_id
           LEFT JOIN department_tbl d ON u.department_id = d.department_id
           LEFT JOIN division_tbl dv ON u.division_id = dv.division_id
          WHERE sd.document_id = $1
          ORDER BY rd.respond_doc_id DESC`,
         [documentId]
       );
        
        if (!respondRes.rows || respondRes.rows.length === 0) {
          console.debug(`No responses found for document ${documentId} using fk column ${fkColumnName}`);
        }
         
         if (respondRes.rows && respondRes.rows.length > 0) {
           // Convert any Buffer fields to base64 for JSON
           const converted = respondRes.rows.map((r: any) => {
             for (const k of Object.keys(r)) {
               if (r[k] && Buffer.isBuffer(r[k])) {
                 r[k] = r[k].toString('base64');
               }
             }
             return r;
           });
           responses.push(...converted);
         }
      }
    }

    // Determine stage completions and current stage
    const senderStatus = String(sender.status || '').toLowerCase();
    const approvedStatus = approved ? String(approved.status || '').toLowerCase() : null;
    const recordStatus = record ? String(record.status || '').toLowerCase() : null;

    // Latest release and marks
    const latestRelease = releases.length > 0 ? releases[0] : null;
    const latestMark = latestRelease && latestRelease.mark ? String(latestRelease.mark).toLowerCase() : null;
    const anyDoneRelease = releases.some((r: any) => String(r.mark || '').toLowerCase() === 'done');

    // Stage completion rules
    // Admin: considered done when sender row status is 'approved' or an approved_document_tbl row exists
    const adminDone = senderStatus === 'approved' || Boolean(approved);

    // Division Head: done when approved.status indicates it was forwarded or recorded
    // Treat 'recorded' as forwarded from the division perspective (it has already moved on)
    const divisionDone = Boolean(approved && (approvedStatus === 'forwarded' || approvedStatus === 'recorded'));

    // Recorder: done when a record entry indicates 'recorded' or the approved status was set to 'recorded'
    // Also consider approved.status 'released' as an indication the recorder stage should be considered complete
    const recorderDone = Boolean((record && recordStatus === 'recorded') || approvedStatus === 'recorded' || approvedStatus === 'released');

    // Releaser: done when status is 'released' in record_document_tbl (released to target)
    // Releaser is complete when it has been released to target department/division
    // This happens when status='released' in record_document_tbl, regardless of mark value
    const hasReleasedStatus = record && String(recordStatus || '').toLowerCase() === 'released';
    const releaserDone = Boolean(hasReleasedStatus);
    const releaserInProgress = Boolean(recorderDone && !releaserDone);

    // Fifth stage (Target Department/Division): in-progress when mark='not_done', done when mark='done'
    const targetDeptDone = anyDoneRelease;
    const targetDeptInProgress = Boolean(latestRelease && String(latestMark || '').toLowerCase() === 'not_done' && !targetDeptDone);

    // Determine current stage (precedence matters)
    let currentStage = 'admin';

    if (targetDeptInProgress && !targetDeptDone) {
      currentStage = 'target';
    } else if (releaserInProgress && !releaserDone) {
      currentStage = 'releaser';
    } else if (record && recordStatus === 'not_recorded') {
      currentStage = 'recorder';
    } else if (approved && approvedStatus === 'not_forwarded') {
      currentStage = 'division';
    } else if (!adminDone && senderStatus === 'pending') {
      currentStage = 'admin';
    } else if (approved && approvedStatus === 'forwarded' && (!record || (record && recordStatus !== 'recorded' && recordStatus !== 'released'))) {
      // forwarded but not yet recorded
      currentStage = 'recorder';
    } else if (releaserDone && !targetDeptDone) {
      currentStage = 'target';
    } else if (targetDeptDone) {
      currentStage = 'completed';
    } else if (approved && approvedStatus === 'forwarded') {
      currentStage = 'recorder';
    }

    const stages = [
      {
        key: 'admin',
        title: 'Admin Office',
        done: adminDone,
        // Hide the right-side status for Admin Office (UI will not display an empty status)
        status: '',
        description: senderStatus === 'pending' && !adminDone ? 'Pending Admin office' : (senderStatus === 'approved' ? 'Approved by admin' : 'Processed by admin'),
      },
      {
        key: 'division',
        title: 'Division Head',
        done: divisionDone,
        // Hide the right-side status for Division Head; keep descriptive text indicating forwarding/recorded state
        status: '',
        description: approved ? (approvedStatus === 'not_forwarded' ? 'Approved — waiting to be forwarded' : ((approvedStatus === 'forwarded' || approvedStatus === 'recorded') ? 'Forwarded to recorder' : String(approved.status || ''))) : 'Not approved yet',
      },
      {
        key: 'recorder',
        title: 'Recorder',
        done: recorderDone,
        // When approved.status indicates recorded/released, show recorder as "Recorded ready to release" and hide the status on the right
        status: (() => {
          if (record) {
            // If the approved row already indicates recorded/released, do not display a status text on the right side
            if (approvedStatus === 'recorded' || approvedStatus === 'released') return '';
            return record.status || 'not_recorded';
          }
          return (approvedStatus === 'recorded' || approvedStatus === 'released') ? '' : 'Not recorded';
        })(),
        description: record
          ? (recordStatus === 'not_recorded'
              ? 'Waiting to be recorded'
              : (recordStatus === 'recorded'
                  ? 'Recorded'
                  : (recordStatus === 'released'
                      ? 'Recorded ready to release'
                      : String(record.status || ''))))
          : ((approvedStatus === 'recorded' || approvedStatus === 'released') ? 'Recorded ready to release' : 'Not recorded yet'),
      },
      {
        key: 'releaser',
        title: 'Releaser',
        done: releaserDone,
        // Hide right-side status for releaser; release history still shown below if present
        status: '',
        description: releaserDone 
          ? (latestRelease 
              ? `Released to ${latestRelease.department || 'target department'} and ${latestRelease.division || 'target division'}`
              : 'Released to target department and division')
          : 'Waiting to be released to target department',
      },
      {
        key: 'target',
        title: 'Target Department/Division',
        done: targetDeptDone,
        status: '',
        description: targetDeptDone 
          ? 'Request completed' 
          : 'Request is being processed',
      },
    ];

    return sendResponse(res, {
      document_id: documentId,
      sender,
      approved,
      record,
      releases,
      responses,
      stages,
      currentStage,
      latestRelease,
    });
  } catch (error: any) {
    console.error('Track document error:', error);
    return sendResponse(res, { error: 'Database error: ' + error.message }, 500);
  }
});

export default router;

