/**
 * Serves the mock systems over HTTP, so you can also call them with curl or
 * from another language: http://localhost:3000/api/mock/salesforce/events
 */
import { mockApp } from '@/lib/mock/app';

const handle = (request: Request) => mockApp.fetch(request);

export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const DELETE = handle;
