import pool from '../config/database.js';

let senderStatusColumnPromise: Promise<boolean> | null = null;
let reviseConstraintPromise: Promise<void> | null = null;
let approvedStatusConstraintPromise: Promise<void> | null = null;
let approvedCommentsColumnPromise: Promise<void> | null = null;
let approvedDateColumnPromise: Promise<void> | null = null;
let approvedForwardedDateColumnPromise: Promise<void> | null = null;
let recordDateColumnPromise: Promise<void> | null = null;

/**
 * Check once whether sender_document_tbl has a "status" column. Result is cached.
 */
export const hasSenderStatusColumn = async (): Promise<boolean> => {
  if (!senderStatusColumnPromise) {
    senderStatusColumnPromise = pool
      .query(
        "SELECT 1 FROM information_schema.columns WHERE table_name = 'sender_document_tbl' AND column_name = 'status'"
      )
  .then((res) => (res && typeof res.rowCount === 'number' ? res.rowCount > 0 : (res?.rows?.length ?? 0) > 0))
      .catch((err) => {
        console.error('Failed to inspect sender_document_tbl.status column', err);
        return false;
      });
  }
  return senderStatusColumnPromise;
};

/**
 * Ensure sender_document_tbl status check constraint allows 'revise'.
 * If the constraint exists and does not include 'revise', it will be recreated.
 */
export const ensureReviseStatusAllowed = async (): Promise<void> => {
  if (reviseConstraintPromise) return reviseConstraintPromise;

  reviseConstraintPromise = (async () => {
    try {
      const constraint = await pool.query(
        `SELECT cc.constraint_name, cc.check_clause
         FROM information_schema.check_constraints cc
         JOIN information_schema.table_constraints tc
           ON cc.constraint_name = tc.constraint_name
         WHERE tc.table_name = 'sender_document_tbl'
           AND tc.constraint_type = 'CHECK'
           AND cc.constraint_name ILIKE 'sender_document_tbl_status_check'
         LIMIT 1`
      );

      const clause: string | undefined = constraint.rows?.[0]?.check_clause;
      if (clause && clause.toLowerCase().includes('revise')) {
        return;
      }

      // Recreate constraint to include 'revise'
      await pool.query('ALTER TABLE sender_document_tbl DROP CONSTRAINT IF EXISTS sender_document_tbl_status_check');
      await pool.query(
        "ALTER TABLE sender_document_tbl ADD CONSTRAINT sender_document_tbl_status_check CHECK (status IN ('pending','approved','revise'))"
      );
    } catch (err) {
      console.error('Failed to ensure revise status in constraint', err);
      // Do not rethrow; allow caller to handle DB constraint error if it persists
    }
  })();

  return reviseConstraintPromise;
};

/**
 * Ensure approved_document_tbl status check constraint allows forwarded/recorded states.
 */
export const ensureApprovedStatusAllowed = async (): Promise<void> => {
  if (approvedStatusConstraintPromise) return approvedStatusConstraintPromise;

  approvedStatusConstraintPromise = (async () => {
    try {
      const constraint = await pool.query(
        `SELECT cc.check_clause
         FROM information_schema.check_constraints cc
         JOIN information_schema.table_constraints tc
           ON cc.constraint_name = tc.constraint_name
         WHERE tc.table_name = 'approved_document_tbl'
           AND tc.constraint_type = 'CHECK'
           AND cc.constraint_name ILIKE 'approved_document_tbl_status_check'
         LIMIT 1`
      );

      const clause: string | undefined = constraint.rows?.[0]?.check_clause;
      const clauseLower = clause?.toLowerCase() || '';
      // Ensure constraint includes forwarded, recorded and released (if present in older schemas this may be missing)
      if (clauseLower.includes('recorded') && clauseLower.includes('forwarded') && clauseLower.includes('released')) {
        return;
      }

      // Recreate constraint to include all expected statuses
      await pool.query('ALTER TABLE approved_document_tbl DROP CONSTRAINT IF EXISTS approved_document_tbl_status_check');
      await pool.query(
        "ALTER TABLE approved_document_tbl ADD CONSTRAINT approved_document_tbl_status_check CHECK (status IN ('not_forwarded','forwarded','recorded','released'))"
      );
    } catch (err) {
      console.error('Failed to ensure approved_document_tbl status constraint', err);
    }
  })();

  return approvedStatusConstraintPromise;
};

/**
 * Ensure approved_document_tbl has a nullable comments column for user notes.
 */
export const ensureApprovedCommentsColumn = async (): Promise<void> => {
  if (approvedCommentsColumnPromise) return approvedCommentsColumnPromise;

  approvedCommentsColumnPromise = (async () => {
    try {
      const columnCheck = await pool.query(
        `SELECT 1 FROM information_schema.columns WHERE table_name = 'approved_document_tbl' AND column_name = 'comments' LIMIT 1`
      );

      if (columnCheck.rowCount && columnCheck.rowCount > 0) return;

      await pool.query('ALTER TABLE approved_document_tbl ADD COLUMN comments text');
    } catch (err) {
      console.error('Failed to ensure approved_document_tbl.comments column', err);
    }
  })();

  return approvedCommentsColumnPromise;
};

/**
 * Ensure approved_document_tbl has a nullable 'date' column to record approval timestamp.
 */
export const ensureApprovedDateColumn = async (): Promise<void> => {
  if (approvedDateColumnPromise) return approvedDateColumnPromise;

  approvedDateColumnPromise = (async () => {
    try {
      const columnCheck = await pool.query(
        `SELECT 1 FROM information_schema.columns WHERE table_name = 'approved_document_tbl' AND column_name = 'date' LIMIT 1`
      );

      if (columnCheck.rowCount && columnCheck.rowCount > 0) return;

      // Add a timestamp with timezone column with default current timestamp
      await pool.query("ALTER TABLE approved_document_tbl ADD COLUMN date timestamptz DEFAULT CURRENT_TIMESTAMP");
    } catch (err) {
      console.error('Failed to ensure approved_document_tbl.date column', err);
    }
  })();

  return approvedDateColumnPromise;
};

/**
 * Ensure approved_document_tbl has a nullable 'forwarded_date' column to record when a document was forwarded.
 * Do not set a default here; forwarded_date is explicitly set when the document is forwarded.
 */
export const ensureApprovedForwardedDateColumn = async (): Promise<void> => {
  if (approvedForwardedDateColumnPromise) return approvedForwardedDateColumnPromise;

  approvedForwardedDateColumnPromise = (async () => {
    try {
      const columnCheck = await pool.query(
        `SELECT 1 FROM information_schema.columns WHERE table_name = 'approved_document_tbl' AND column_name = 'forwarded_date' LIMIT 1`
      );

      if (columnCheck.rowCount && columnCheck.rowCount > 0) return;

      await pool.query('ALTER TABLE approved_document_tbl ADD COLUMN forwarded_date timestamptz');
    } catch (err) {
      console.error('Failed to ensure approved_document_tbl.forwarded_date column', err);
    }
  })();

  return approvedForwardedDateColumnPromise;
};

/**
 * Ensure record_document_tbl has a nullable 'record_date' column to record when a document was recorded by the recorder.
 * Do not set a default here; record_date is explicitly set when the document is recorded.
 */
export const ensureRecordDateColumn = async (): Promise<void> => {
  if (recordDateColumnPromise) return recordDateColumnPromise;

  recordDateColumnPromise = (async () => {
    try {
      const columnCheck = await pool.query(
        `SELECT 1 FROM information_schema.columns WHERE table_name = 'record_document_tbl' AND column_name = 'record_date' LIMIT 1`
      );

      if (columnCheck.rowCount && columnCheck.rowCount > 0) return;

      await pool.query('ALTER TABLE record_document_tbl ADD COLUMN record_date timestamptz');
    } catch (err) {
      console.error('Failed to ensure record_document_tbl.record_date column', err);
    }
  })();

  return recordDateColumnPromise;
};
