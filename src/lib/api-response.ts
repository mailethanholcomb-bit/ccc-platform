import { NextResponse } from 'next/server';

interface ApiSuccess<T> {
  success: true;
  data: T;
  error: null;
}

interface ApiError {
  success: false;
  data: null;
  error: {
    code: string;
    message: string;
  };
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;

export function successResponse<T>(data: T, status: number = 200): NextResponse<ApiSuccess<T>> {
  return NextResponse.json(
    {
      success: true as const,
      data,
      error: null,
    },
    { status },
  );
}

export function errorResponse(
  code: string,
  message: string,
  status: number = 500,
): NextResponse<ApiError> {
  return NextResponse.json(
    {
      success: false as const,
      data: null,
      error: { code, message },
    },
    { status },
  );
}

export function validationError(message: string = 'Validation failed'): NextResponse<ApiError> {
  return errorResponse('VALIDATION_ERROR', message, 400);
}

export function notFoundError(message: string = 'Resource not found'): NextResponse<ApiError> {
  return errorResponse('NOT_FOUND', message, 404);
}

export function unauthorizedError(): NextResponse<ApiError> {
  return errorResponse('UNAUTHORIZED', 'Authentication required', 401);
}

export function forbiddenError(): NextResponse<ApiError> {
  return errorResponse('FORBIDDEN', 'Insufficient permissions', 403);
}
