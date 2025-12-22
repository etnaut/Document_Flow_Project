import pool from '../config/database.js';

let senderStatusColumnPromise: Promise<boolean> | null = null;

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
