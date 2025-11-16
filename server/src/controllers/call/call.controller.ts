import { Request, Response } from 'express';
import { injectable, inject } from 'tsyringe';
import { ICallService } from '../../services/call/call.service.interface.js';

@injectable()
export class CallController {
  constructor(
    @inject('ICallService') private readonly callService: ICallService
  ) {}

  async getCallHistory(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      console.log('📊 Getting call history for user:', req.user.userId);

      const result = await this.callService.getCallHistory(req.user.email, page, limit);

      console.log('✅ Call history fetched:', result.total, 'total calls');

      res.json(result);
    } catch (error: any) {
      console.error('❌ Get call history error:', error);
      res.status(500).json({ error: 'Failed to fetch call history' });
    }
  }
}