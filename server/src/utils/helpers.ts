import { Response } from 'express';

export function sendResponse<T>(
  res: Response,
  data: T | { error: string },
  statusCode: number = 200
): void {
  res.status(statusCode).json(data);
}

export function getJsonInput<T>(body: any): T {
  return body as T;
}

