import { Request, Response } from 'express';
import { injectable, inject } from 'tsyringe';
import { IRingNumberService } from '../../services/ringNumber/ringNumber.service.interface.js';

@injectable()
export class RingNumberController {
  constructor(
    @inject('IRingNumberService') private readonly ringNumberService: IRingNumberService
  ) {}

  async assignRingNumber(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const ringNumber = await this.ringNumberService.assignRingNumber(req.user.userId);

      res.json({
        message: 'Ring Number assigned successfully',
        ringNumber,
      });
    } catch (error: any) {
      if (error.message === 'User already has a Ring Number') {
        res.status(400).json({ error: error.message });
        return;
      }
      
      console.error('Ring Number assignment error:', error);
      res.status(500).json({ error: 'Failed to assign Ring Number' });
    }
  }

  async findUserByRingNumber(req: Request, res: Response): Promise<void> {
    try {
      const { ringNumber } = req.params;

      if (!ringNumber || !/^\d{4}-\d{4}$/.test(ringNumber)) {
        res.status(400).json({ error: 'Invalid Ring Number format' });
        return;
      }

      const user = await this.ringNumberService.findUserByRingNumber(ringNumber);

      res.json({ user });
    } catch (error: any) {
      if (error.message === 'User not found with this Ring Number') {
        res.status(404).json({ error: error.message });
        return;
      }

      console.error('Ring Number lookup error:', error);
      res.status(500).json({ error: 'Failed to find user' });
    }
  }
}