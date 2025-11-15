import { IUser } from "../../interfaces/schema/user.interface.js";

export interface FirebaseDecodedIdToken {
  uid: string;
  name?: string;
  email?: string;
  picture?: string;
  email_verified?: boolean;
}

export interface IAuthService {
  googleLogin(decoded: FirebaseDecodedIdToken): Promise<{ user: IUser; token: string }>;
  generateToken(userId: string, email: string): string;
  verifyToken(token: string): { userId: string; email: string };
}
