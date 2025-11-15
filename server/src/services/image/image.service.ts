import { injectable } from 'tsyringe';
import { IImageService } from './image.service.interface.js';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

@injectable()
export class ImageService implements IImageService {
  private readonly uploadDir: string;

  constructor() {
    this.uploadDir = path.join(__dirname, '../../../uploads/profile-pictures');
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }


  async cacheProfilePicture(userId: string, imageUrl: string): Promise<string> {
    try {
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      const contentType = response.headers['content-type'];
      const extension = contentType?.includes('png') ? 'png' : 'jpg';

      const filename = `${userId}.${extension}`;
      const filepath = path.join(this.uploadDir, filename);

      fs.writeFileSync(filepath, response.data);

      return `/uploads/profile-pictures/${filename}`;
    } catch (error) {
      console.error('Error caching profile picture:', error);
      throw error;
    }
  }

  async deleteProfilePicture(userId: string): Promise<void> {
    try {
      const extensions = ['jpg', 'png', 'jpeg'];
      
      for (const ext of extensions) {
        const filepath = path.join(this.uploadDir, `${userId}.${ext}`);
        if (fs.existsSync(filepath)) {
          fs.unlinkSync(filepath);
        }
      }
    } catch (error) {
      console.error('Error deleting profile picture:', error);
      throw error;
    }
  }
}