import { Response } from 'express';

export function sendResponse<T>(
  res: Response,
  data: T | { error: string },
  statusCode: number = 200
): void {
  // For server (5xx) errors, avoid returning potentially sensitive internal error
  // messages (e.g., database authentication errors) to clients. Log the full
  // error on the server and send a generic message to the client instead.
  if (statusCode >= 500 && data && typeof (data as any).error === 'string') {
    console.error('Server error (500):', (data as any).error);
    res.status(statusCode).json({ error: 'Internal server error' });
    return;
  }

  res.status(statusCode).json(data);
}

export function getJsonInput<T>(body: any): T {
  return body as T;
}

