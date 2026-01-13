import { Router, Request, Response } from 'express';
import pool from '../config/database.js';
import { sendResponse, getJsonInput } from '../utils/helpers.js';
import { CreateDocumentInput, UpdateDocumentInput, Document } from '../types/index.js';
import { hasSenderStatusColumn, ensureReviseStatusAllowed, ensureApprovedStatusAllowed, ensureRecordCommentColumn } from '../utils/schema.js';
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
      conditions.push("COALESCE(LOWER(a.status), '') IN ('forwarded','not_forwarded')");
    }

    if (department) {
      params.push(department);
      conditions.push(`LOWER(d.department) = LOWER($${params.length})`);
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
      a.admin AS approved_by,
      a.status AS approved_status
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

    const { updates, params, paramCount } = buildUpdates(true);

    const upsertRecordDocument = async (
      approvedDocId: number,
      recordStatus?: string,
      recordComment?: string
    ) => {
      const statusVal = recordStatus || 'recorded';
      const existingRecord = await client.query(
        'SELECT record_doc_id FROM record_document_tbl WHERE approved_doc_id = $1 LIMIT 1',
        [approvedDocId]
      );

      if (existingRecord.rows.length === 0) {
        await client.query(
          'INSERT INTO record_document_tbl (approved_doc_id, status, comment) VALUES ($1, $2, $3)',
          [approvedDocId, statusVal, recordComment ?? null]
        );
      } else {
        await client.query(
          'UPDATE record_document_tbl SET status = $1, comment = $2 WHERE record_doc_id = $3',
          [statusVal, recordComment ?? null, existingRecord.rows[0].record_doc_id]
        );
      }
    };

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
        await ensureRecordCommentColumn();
        const approvedCheck = await client.query(
          'SELECT approved_doc_id FROM approved_document_tbl WHERE document_id = $1 LIMIT 1',
          [input.Document_Id]
        );

  const recordStatusVal = (input.record_status || 'recorded').toLowerCase();
  const recordCommentVal = input.record_comment ?? undefined;
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

        await upsertRecordDocument(approvedDocId, recordStatusVal, recordCommentVal);
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
        rd.comment AS record_comment,
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
      const statusLabel = statusLower === 'recorded'
        ? 'Not Released'
        : statusLower === 'not_recorded'
          ? 'Not Recorded'
          : statusLower === 'released'
            ? 'Released'
          : row.record_status || 'Not Released';

      return {
  Document_Id: row.document_id,
  record_doc_id: row.record_doc_id,
        Type: row.type,
        Document: row.document,
        Priority: row.priority || 'Normal',
        Status: statusLabel,
        description: row.record_comment ?? row.description ?? null,
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
  const { record_doc_id, status, department, division } = req.body as { record_doc_id?: number; status?: string; department?: string; division?: string };

  const recordDocId = Number(record_doc_id);
  const statusVal = String(status || '').trim().toLowerCase();
  const departmentVal = String(department || '').trim();
  const divisionVal = String(division || '').trim();

  if (!Number.isFinite(recordDocId)) {
    return sendResponse(res, { error: 'Invalid record_doc_id' }, 400);
  }
  if (!statusVal) {
    return sendResponse(res, { error: 'Status is required' }, 400);
  }
  if (!departmentVal) {
    return sendResponse(res, { error: 'Department is required' }, 400);
  }

  if (!divisionVal) {
    return sendResponse(res, { error: 'Division is required' }, 400);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const recordRes = await client.query(
      `SELECT rd.record_doc_id, rd.approved_doc_id, rd.status AS record_status, rd.comment,
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
      ['department', departmentVal],
      ['division', divisionVal],
    ];

    const columnsToInsert = candidateColumns.filter(([col]) => releaseColumns.has(col));

    if (columnsToInsert.length === 0) {
      throw new Error('release_document_tbl has no expected columns to insert');
    }

    const columnNames = columnsToInsert.map(([col]) => col).join(', ');
    const placeholders = columnsToInsert.map((_, idx) => `$${idx + 1}`).join(', ');
    const values = columnsToInsert.map(([, val]) => val);

    await client.query(
      `INSERT INTO release_document_tbl (${columnNames}) VALUES (${placeholders})`,
      values
    );

    await client.query('UPDATE record_document_tbl SET status = $1 WHERE record_doc_id = $2', ['released', rec.record_doc_id]);

    await client.query('COMMIT');

    return sendResponse(res, {
      record_doc_id: rec.record_doc_id,
      approved_doc_id: rec.approved_doc_id,
      document_id: rec.document_id,
      type: rec.type,
      status: statusVal,
      department: departmentVal,
      division: divisionVal,
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

export default router;

