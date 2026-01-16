import pool from '../config/database.js';

let senderStatusColumnPromise: Promise<boolean> | null = null;
let reviseConstraintPromise: Promise<void> | null = null;
let approvedStatusConstraintPromise: Promise<void> | null = null;
let approvedCommentsColumnPromise: Promise<void> | null = null;

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
