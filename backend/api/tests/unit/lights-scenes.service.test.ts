import { describe, it, expect, beforeEach, vi } from 'vitest';
import LightsScenesService from '../../lib/modules/services/lights/lights-scenes.service';
import LightSceneModel from '../../lib/modules/schemas/lights/lights-scene.schema';
import { Types } from 'mongoose';

describe('LightsScenesService', () => {
  let service: LightsScenesService;
  const testUserId = new Types.ObjectId();

  beforeEach(() => {
    service = new LightsScenesService();
  });

  describe('createScene', () => {
    it('should create a light scene with specified properties and active=false', async () => {
      const scene = await service.createScene({
        name: 'Wieczor filmowy',
        icon: 'assets/icons/film.svg',
        rooms: ['living_room', 'kitchen'],
        userId: testUserId,
      });

      expect(scene).toBeDefined();
      expect(scene.name).toBe('Wieczor filmowy');
      expect(scene.icon).toBe('assets/icons/film.svg');
      expect(scene.rooms).toEqual(['living_room', 'kitchen']);
      expect(scene.active).toBe(false);
      expect(scene.userId?.toString()).toBe(testUserId.toString());

      const inDb = await LightSceneModel.findById(scene._id);
      expect(inDb).not.toBeNull();
    });

    it('should throw error when database create fails', async () => {
      vi.spyOn(LightSceneModel, 'create').mockRejectedValueOnce(new Error('Scene creation failed'));

      await expect(
        service.createScene({
          name: 'Test Error',
          icon: 'assets/icons/heart.svg',
          rooms: ['bedroom'],
        }),
      ).rejects.toThrow('Scene creation failed');
    });
  });

  describe('getScenes', () => {
    it('should return scenes sorted by createdAt descending', async () => {
      await service.createScene({
        name: 'Scena 1',
        icon: 'assets/icons/heart.svg',
        rooms: ['kitchen'],
      });
      await new Promise((r) => setTimeout(r, 10));
      await service.createScene({
        name: 'Scena 2',
        icon: 'assets/icons/work.svg',
        rooms: ['garage'],
      });

      const scenes = await service.getScenes();
      expect(scenes.length).toBe(2);
      expect(scenes[0].name).toBe('Scena 2');
      expect(scenes[1].name).toBe('Scena 1');
    });

    it('should throw error when query fails', async () => {
      vi.spyOn(LightSceneModel, 'find').mockImplementationOnce(() => {
        throw new Error('Find scenes error');
      });

      await expect(service.getScenes()).rejects.toThrow('Find scenes error');
    });
  });

  describe('toggleScene', () => {
    it('should toggle active from false to true', async () => {
      const scene = await service.createScene({
        name: 'Do przelaczenia',
        icon: 'assets/icons/film.svg',
        rooms: ['living_room'],
      });

      const updated = await service.toggleScene(scene._id!.toString());
      expect(updated).not.toBeNull();
      expect(updated?.active).toBe(true);
    });

    it('should set explicit active value when provided', async () => {
      const scene = await service.createScene({
        name: 'Jawne ustawienie',
        icon: 'assets/icons/film.svg',
        rooms: ['living_room'],
      });

      const updated = await service.toggleScene(scene._id!.toString(), true);
      expect(updated?.active).toBe(true);

      const updatedFalse = await service.toggleScene(scene._id!.toString(), false);
      expect(updatedFalse?.active).toBe(false);
    });

    it('should return null for invalid ObjectId', async () => {
      const result = await service.toggleScene('invalid-id');
      expect(result).toBeNull();
    });

    it('should return null for non-existent ID', async () => {
      const nonExistent = new Types.ObjectId().toString();
      const result = await service.toggleScene(nonExistent);
      expect(result).toBeNull();
    });

    it('should throw error when save fails', async () => {
      const scene = await service.createScene({
        name: 'Save error test',
        icon: 'assets/icons/film.svg',
        rooms: ['living_room'],
      });

      vi.spyOn(LightSceneModel, 'findById').mockResolvedValueOnce({
        active: false,
        name: 'Save error test',
        save: vi.fn().mockRejectedValue(new Error('Save error')),
      } as any);

      await expect(service.toggleScene(scene._id!.toString())).rejects.toThrow('Save error');
    });
  });

  describe('deleteScene', () => {
    it('should delete existing scene and return true', async () => {
      const scene = await service.createScene({
        name: 'Do usuniecia',
        icon: 'assets/icons/heart.svg',
        rooms: ['kitchen'],
      });

      const result = await service.deleteScene(scene._id!.toString());
      expect(result).toBe(true);

      const inDb = await LightSceneModel.findById(scene._id);
      expect(inDb).toBeNull();
    });

    it('should return false for invalid ObjectId', async () => {
      const result = await service.deleteScene('invalid_id');
      expect(result).toBe(false);
    });

    it('should return false for non-existent ID', async () => {
      const nonExistent = new Types.ObjectId().toString();
      const result = await service.deleteScene(nonExistent);
      expect(result).toBe(false);
    });

    it('should throw error when findByIdAndDelete fails', async () => {
      const id = new Types.ObjectId().toString();
      vi.spyOn(LightSceneModel, 'findByIdAndDelete').mockRejectedValueOnce(
        new Error('Delete error'),
      );

      await expect(service.deleteScene(id)).rejects.toThrow('Delete error');
    });
  });
});
