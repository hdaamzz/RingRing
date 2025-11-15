export interface UserProfile {
  name: string;
  email: string;
  picture?: string;
}

export interface LoginResponse {
  message: string;
  user: UserProfile;
  token: string;
}