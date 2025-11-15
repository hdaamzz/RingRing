export interface IImageService {
  cacheProfilePicture(userId: string, imageUrl: string): Promise<string>;
  deleteProfilePicture(userId: string): Promise<void>;
}