import { Router, Request, Response } from 'express';
import pool from '../config/database.js';
import { sendResponse, getJsonInput } from '../utils/helpers.js';
import { ForwardDocumentInput, Document } from '../types/index.js';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  try {
    const input = getJsonInput<ForwardDocumentInput>(req.body);

    if (!input.documentId) {
      return sendResponse(res, { error: 'documentId is required' }, 400);
    }

    const documentId = parseInt(String(input.documentId));
    const notes = input.notes || null;

    // Update document status to Received
    await pool.query(
      `UPDATE Sender_Document_Tbl SET Status = 'Received' WHERE Document_Id = $1`,
      [documentId]
    );

    // Fetch updated document
    const result = await pool.query(
      `
      SELECT 
        sd.Document_Id,
        sd.Type,
        sd.User_Id,
        sd.Status,
        sd.Priority,
        sd.Document,
        u.Full_Name AS sender_name,
        d.Department AS sender_department,
        dv.Division AS sender_division,
        NULL AS target_department,
        $1 AS comments,
        NULL AS forwarded_from,
        NULL AS forwarded_by_admin,
        NULL AS is_forwarded_request,
        NULL AS created_at
      FROM Sender_Document_Tbl sd
      LEFT JOIN User_Tbl u ON sd.User_Id = u.User_Id
      LEFT JOIN Department_Tbl d ON u.Department_Id = d.Department_Id
      LEFT JOIN Division_Tbl dv ON u.Division_Id = dv.Division_Id
      WHERE sd.Document_Id = $2
    `,
      [notes, documentId]
    );

    if (result.rows.length === 0) {
      return sendResponse(res, { error: 'Document not found' }, 404);
    }

    const document: Document = {
      ...result.rows[0],
      Document: result.rows[0].Document ? Buffer.from(result.rows[0].Document) : null,
      target_department: null,
      comments: notes,
      forwarded_from: null,
      forwarded_by_admin: null,
      is_forwarded_request: null,
      created_at: null,
    };

    sendResponse(res, document);
  } catch (error: any) {
    console.error('Forward document error:', error);
    sendResponse(res, { error: 'Database error: ' + error.message }, 500);
  }
});

export default router;

