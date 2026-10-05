
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

// Extend Express User type for test simulations
declare global {
  namespace Express {
    interface User {
      [key: string]: any;
    }
  }
}

@Injectable()
export class TestAuthMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // For testing purposes, simulate authenticated users based on headers
    const testUserHeader = req.headers['x-test-user'];
    
    if (testUserHeader === 'admin') {
      req.user = {
        id: 9,
        email: 'admin@example.com',
        globalRole: 'ADMIN',
        firebaseId: 'mock-uid-admin'
      };
    } else if (testUserHeader === 'user') {
      req.user = {
        id: 1,
        email: 'test@example.com',
        globalRole: 'USER',
        firebaseId: 'mock-uid-user'
      };
    }
    
    next();
  }
}
