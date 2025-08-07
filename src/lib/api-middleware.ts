import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse } from '@/lib/types';

// Rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
}

export class ValidationError extends Error {
  statusCode = 400;
  code = 'VALIDATION_ERROR';
  
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  statusCode = 404;
  code = 'NOT_FOUND';
  
  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends Error {
  statusCode = 429;
  code = 'RATE_LIMIT_EXCEEDED';
  
  constructor(message: string = 'Rate limit exceeded') {
    super(message);
    this.name = 'RateLimitError';
  }
}

// Error handler wrapper
export function withErrorHandler(
  handler: (request: NextRequest, ...args: any[]) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: any[]): Promise<NextResponse> => {
    try {
      return await handler(request, ...args);
    } catch (error) {
      console.error('API Error:', error);
      
      if ((error as any)?.statusCode) {
        const response: ApiResponse = {
          success: false,
          error: (error as any).message
        };
        return NextResponse.json(response, { status: (error as any).statusCode || 500 });
      }
      
      // Handle MongoDB errors
      if (error instanceof Error && error.name === 'MongoError') {
        const response: ApiResponse = {
          success: false,
          error: 'Database operation failed'
        };
        return NextResponse.json(response, { status: 500 });
      }
      
      // Generic error
      const response: ApiResponse = {
        success: false,
        error: 'Internal server error'
      };
      return NextResponse.json(response, { status: 500 });
    }
  };
}

// Rate limiting middleware
export function withRateLimit(
  maxRequests: number = 100,
  windowMs: number = 15 * 60 * 1000 // 15 minutes
) {
  return function(
    handler: (request: NextRequest, ...args: any[]) => Promise<NextResponse>
  ) {
    return async (request: NextRequest, ...args: any[]): Promise<NextResponse> => {
      const clientIp = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown';
      
      const now = Date.now();
      const clientData = rateLimitStore.get(clientIp);
      
      if (!clientData || now > clientData.resetTime) {
        // Reset or initialize rate limit data
        rateLimitStore.set(clientIp, {
          count: 1,
          resetTime: now + windowMs
        });
      } else if (clientData.count >= maxRequests) {
        throw new RateLimitError();
      } else {
        clientData.count++;
      }
      
      return handler(request, ...args);
    };
  };
}

// Input validation middleware
export function withValidation<T>(
  schema: (data: any) => T,
  handler: (request: NextRequest, validatedData: T, ...args: any[]) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: any[]): Promise<NextResponse> => {
    try {
      const body = await request.json();
      const validatedData = schema(body);
      return handler(request, validatedData, ...args);
    } catch (error) {
      if (error instanceof Error) {
        throw new ValidationError(error.message);
      }
      throw new ValidationError('Invalid request data');
    }
  };
}

// CORS middleware
export function withCors(
  handler: (request: NextRequest, ...args: any[]) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: any[]): Promise<NextResponse> => {
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      });
    }
    
    const response = await handler(request, ...args);
    
    // Add CORS headers to response
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    return response;
  };
}

// Compose multiple middleware
export function withMiddleware(
  ...middlewares: Array<(handler: any) => any>
) {
  return function(handler: any) {
    return middlewares.reduceRight((acc, middleware) => middleware(acc), handler);
  };
}