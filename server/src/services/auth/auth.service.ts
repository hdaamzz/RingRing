import jwt from 'jsonwebtoken';
import { injectable, inject } from 'tsyringe';
import { IAuthService, FirebaseDecodedIdToken } from './auth.service.interface.js';
import { IUserRepository } from '../../repositories/user.repository.interface.js';
import { IUser } from '../../interfaces/schema/user.interface.js';

@injectable()
export class AuthService implements IAuthService {
  private readonly jwtSecret: string;
  private readonly jwtExpiry: string;
  private readonly userRepo: IUserRepository;

  constructor(
    @inject('IUserRepository') userRepo: IUserRepository
  ) {
    this.userRepo = userRepo;
    this.jwtSecret = process.env.JWT_SECRET!;
    this.jwtExpiry = '1h';
    
    if (!this.jwtSecret) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }
  }

  async googleLogin(decoded: FirebaseDecodedIdToken): Promise<{ user: IUser; token: string }> {
    let user = await this.userRepo.findByGoogleId(decoded.uid);

    if (!user) {
      if (!decoded.email) {
        throw new Error('Email is required for user creation');
      }

      const userData: Partial<IUser> = {
        googleId: decoded.uid,
        name: decoded.name ?? 'Unknown',
        email: decoded.email,
        picture: decoded.picture,
        emailVerified: decoded.email_verified ?? false,
      };

      user = await this.userRepo.create(userData);
    }

    const token = this.generateToken(user._id as string, user.email);
    return { user, token };
  }

  generateToken(userId: string, email: string): string {
    return jwt.sign(
      { userId, email } as object,
      this.jwtSecret as jwt.Secret,
      { expiresIn: this.jwtExpiry } as jwt.SignOptions
    ) as string;
  }

  verifyToken(token: string): { userId: string; email: string } {
    try {
      const decoded = jwt.verify(
        token, 
        this.jwtSecret as jwt.Secret
      ) as { userId: string; email: string };
      return decoded;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }
}
