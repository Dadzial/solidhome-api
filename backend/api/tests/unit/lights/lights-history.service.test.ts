import { describe, it, expect, beforeEach, vi } from 'vitest';
import LightsHistoryService from '../../../lib/modules/services/lights/lights-history.service';
import lightsHistoryModel from '../../../lib/modules/schemas/lights/lights-history.schema';
import UserModel from '../../../lib/modules/schemas/user/user.schema';
import SseService from '../../../lib/modules/services/sse/sse.service';
import { Types } from 'mongoose';

describe('LightsHistoryService', () => {
  let service: LightsHistoryService;

  beforeEach(() => {
    service = new LightsHistoryService();
  });

  describe('addHistoryEntry', () => {
    it('should create and return a history log entry with name, state, and userId', async () => {
      const userId = new Types.ObjectId();
      const entry = await service.addHistoryEntry('kitchen', 1, userId);

      expect(entry).toBeDefined();
      expect(entry.name).toBe('kitchen');
      expect(entry.state).toBe(1);
      expect(entry.userId?.toString()).toBe(userId.toString());

      const inDb = await lightsHistoryModel.findById(entry._id);
      expect(inDb).not.toBeNull();
      expect(inDb!.name).toBe('kitchen');
    });

    it('should allow adding entry without userId', async () => {
      const entry = await service.addHistoryEntry('garage', 0);
      expect(entry.name).toBe('garage');
      expect(entry.state).toBe(0);
      expect(entry.userId).toBeUndefined();
    });

    it('should throw error when database create fails', async () => {
      vi.spyOn(lightsHistoryModel, 'create').mockRejectedValueOnce(new Error('DB create error'));

      await expect(service.addHistoryEntry('bathroom', 1)).rejects.toThrow('DB create error');
    });
  });

  describe('getHistory', () => {
    it('should return history entries sorted by createdAt descending with populated user info', async () => {
      const user = await UserModel.create({ email: 'user@history.com', userName: 'historyUser' });

      await service.addHistoryEntry('living_room', 1, user._id);
      await new Promise((resolve) => setTimeout(resolve, 10));
      await service.addHistoryEntry('kitchen', 1, user._id);

      const history = await service.getHistory(10);
      expect(history.length).toBe(2);
      expect(history[0].name).toBe('kitchen'); // newest first
      expect(history[1].name).toBe('living_room');
      expect((history[0].userId as any).userName).toBe('historyUser');
      expect((history[0].userId as any).email).toBe('user@history.com');
    });

    it('should respect the limit parameter', async () => {
      await service.addHistoryEntry('living_room', 1);
      await service.addHistoryEntry('kitchen', 1);
      await service.addHistoryEntry('garage', 1);

      const history = await service.getHistory(2);
      expect(history.length).toBe(2);
    });

    it('should throw error when query fails', async () => {
      vi.spyOn(lightsHistoryModel, 'find').mockImplementationOnce(() => {
        throw new Error('Find error');
      });

      await expect(service.getHistory()).rejects.toThrow('Find error');
    });
  });

  describe('resetHistory', () => {
    it('should remove all history entries from database', async () => {
      await service.addHistoryEntry('living_room', 1);
      await service.addHistoryEntry('kitchen', 0);

      const preCount = await lightsHistoryModel.countDocuments();
      expect(preCount).toBe(2);

      const resetResult = await service.resetHistory();
      expect(resetResult.deletedCount).toBe(2);

      const postCount = await lightsHistoryModel.countDocuments();
      expect(postCount).toBe(0);
    });

    it('should throw error when deleteMany fails', async () => {
      vi.spyOn(lightsHistoryModel, 'deleteMany').mockRejectedValueOnce(new Error('Reset error'));

      await expect(service.resetHistory()).rejects.toThrow('Reset error');
    });
  });

  describe('SSE history_updated broadcast', () => {
    let sseServiceMock: {
      broadcast: ReturnType<typeof vi.fn>;
      activeSessionsCount: number;
    };
    let sseHistoryService: LightsHistoryService;

    beforeEach(() => {
      sseServiceMock = {
        broadcast: vi.fn(),
        activeSessionsCount: 1,
      };
      sseHistoryService = new LightsHistoryService(sseServiceMock as unknown as SseService);
    });

    it('should broadcast lights:history_updated after addHistoryEntry when sessions exist', async () => {
      await sseHistoryService.addHistoryEntry('kitchen', 1);

      expect(sseServiceMock.broadcast).toHaveBeenCalledTimes(1);
      expect(sseServiceMock.broadcast).toHaveBeenCalledWith(
        'lights',
        'history_updated',
        expect.arrayContaining([expect.objectContaining({ name: 'kitchen', state: 1 })]),
      );
    });

    it('should skip broadcast after addHistoryEntry when no active SSE sessions exist', async () => {
      sseServiceMock.activeSessionsCount = 0;

      await sseHistoryService.addHistoryEntry('kitchen', 1);

      expect(sseServiceMock.broadcast).not.toHaveBeenCalled();
    });

    it('should broadcast empty array on lights:history_updated after resetHistory', async () => {
      await sseHistoryService.resetHistory();

      expect(sseServiceMock.broadcast).toHaveBeenCalledWith('lights', 'history_updated', []);
    });
  });
});
