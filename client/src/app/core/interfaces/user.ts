export interface UserProfile {
  name: string;
  email: string;
  picture?: string;
  ringNumber?: string;
}

export interface LoginResponse {
  message: string;
  user: UserProfile;
  token: string;
}
export interface RingNumberResponse {
  message: string;
  ringNumber: string;
}