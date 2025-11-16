export interface IRingNumberService {
  generateRingNumber(): Promise<string>;
  assignRingNumber(userId: string): Promise<string>;
  isRingNumberAvailable(ringNumber: string): Promise<boolean>;
  findUserByRingNumber(ringNumber: string): Promise<any>;
}