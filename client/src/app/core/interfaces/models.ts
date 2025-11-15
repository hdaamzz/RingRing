export interface IUser {
  id: string;
  googleId: string;
  name: string;
  email: string;
  picture?: string;
  emailVerified: boolean;
  createdAt: string;
}