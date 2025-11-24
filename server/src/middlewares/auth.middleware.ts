import { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'tsyringe';
import { IAuthService } from '../services/auth/auth.service.interface.js';

declare global {
  namespace Express {
    interface Request {
      user?: { userId: string; email: string };
    }
  }
}

@injectable()
export class AuthMiddleware {
  constructor(
    @inject('IAuthService') private readonly authService: IAuthService
  ) { }

  verify = (req: Request, res: Response, next: NextFunction): void => {
    try {
      let token: string | undefined = undefined;
      const authHeader = req.headers['authorization'];
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }

      if (!token && req.cookies) {
        token = req.cookies['authToken'];
      }

      if (!token) {
        res.status(401).json({ error: 'No token provided' });
        return;
      }

      const decoded = this.authService.verifyToken(token);
      req.user = decoded;
      next();
    } catch (error) {
      res.status(403).json({ error: 'Invalid or expired token' });
    }
  };

}