import { Request, Response } from 'express';
import { injectable, inject } from 'tsyringe';
import { IAuthService } from '../../services/auth/auth.service.interface.js';
import { firebaseAuth } from '../../config/firebase.config.js';


@injectable()
export class AuthController {
  private readonly authService: IAuthService;

  constructor(
    @inject('IAuthService') authService: IAuthService
  ) {
    this.authService = authService;
  }

  async googleLogin(req: Request, res: Response): Promise<void> {
    try {
      const { idToken } = req.body;

      if (!idToken) {
        res.status(400).json({ error: 'idToken required' });
        return;
      }

      const decoded = await firebaseAuth.verifyIdToken(idToken);
      const { user, token } = await this.authService.googleLogin(decoded);

      
      res.cookie('authToken', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 1000,
      });

      
      res.json({
        message: 'Login successful',
        user: {
          name: user.name,
          email: user.email,
          picture: user.picture,
        },
        token,
      });
    } catch (err) {
      console.error('Google login error:', err);
      res.status(401).json({ error: 'Invalid Firebase token' });
    }
  }

  async logout(_req: Request, res: Response): Promise<void> {
    try {
      res.clearCookie('authToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
      });

      res.json({ message: 'Logged out successfully' });
    } catch (err) {
      console.error('Logout error:', err);
      res.status(500).json({ error: 'Logout failed' });
    }
  }
}