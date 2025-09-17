import { describe, expect, it, vi } from 'vitest';
import { WindowStateManager } from '../src/WindowStateManager';

// Mock electron modules
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => '/mock/path'),
  },
  screen: {
    getAllDisplays: vi.fn(() => []),
    getPrimaryDisplay: vi.fn(() => ({
      id: 1,
      bounds: { x: 0, y: 0, width: 1920, height: 1080 },
      workArea: { x: 0, y: 0, width: 1920, height: 1040 },
    })),
  },
}));

// Mock fs modules
vi.mock('node:fs', () => ({
  existsSync: vi.fn(() => false),
}));

describe('windowStateManager', () => {
  it('should create an instance', () => {
    const wsm = new WindowStateManager();
    expect(wsm).toBeInstanceOf(WindowStateManager);
  });

  it('should have required properties', () => {
    const wsm = new WindowStateManager();
    expect(typeof wsm.width).toBe('number');
    expect(typeof wsm.height).toBe('number');
    expect(typeof wsm.zoomFactor).toBe('number');
  });

  it('should have required methods', () => {
    const wsm = new WindowStateManager();
    expect(typeof wsm.manage).toBe('function');
    expect(typeof wsm.unmanage).toBe('function');
    expect(typeof wsm.updateZoomFactorState).toBe('function');
    expect(typeof wsm.saveState).toBe('function');
    expect(typeof wsm.saveStateAsync).toBe('function');
  });
});
