import { describe, it, expect, beforeEach, vi } from 'vitest';
import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import { saveSnapshot, makeDefaultPath } from './snapshotFile';

const mockSave = vi.mocked(save);
const mockWriteTextFile = vi.mocked(writeTextFile);

describe('saveSnapshot', () => {
  beforeEach(() => {
    mockSave.mockReset();
    mockWriteTextFile.mockReset();
    // Default happy-path returns
    mockSave.mockResolvedValue('/mock/path/snapshot.json');
    mockWriteTextFile.mockResolvedValue(undefined);
  });

  // ------------------------------------------------------------------
  // Happy path
  // ------------------------------------------------------------------

  it('Test 1: returns {success:true, path} when user confirms and write succeeds', async () => {
    mockSave.mockResolvedValueOnce('/mock/path.json');

    const result = await saveSnapshot('{"a":1}', 'json', 'MILEBOARD');

    expect(result).toEqual({ success: true, path: '/mock/path.json' });
    expect(mockWriteTextFile).toHaveBeenCalledWith('/mock/path.json', '{"a":1}');
  });

  it('Test 2: calls dialog.save BEFORE writeTextFile (call order)', async () => {
    const callOrder: string[] = [];
    mockSave.mockImplementationOnce(async () => {
      callOrder.push('save');
      return '/path.json';
    });
    mockWriteTextFile.mockImplementationOnce(async () => {
      callOrder.push('writeTextFile');
    });

    await saveSnapshot('content', 'json', 'KEY');

    expect(callOrder).toEqual(['save', 'writeTextFile']);
  });

  // ------------------------------------------------------------------
  // dialog.save options: title
  // ------------------------------------------------------------------

  it('Test 3: passes title "スナップショットをエクスポート" to dialog.save', async () => {
    await saveSnapshot('content', 'json', 'KEY');

    expect(mockSave).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'スナップショットをエクスポート',
      }),
    );
  });

  // ------------------------------------------------------------------
  // dialog.save options: defaultPath template per format
  // ------------------------------------------------------------------

  it('Test 4: defaultPath matches mileboard-snapshot-{KEY}-{yyyy-MM-dd-HHmm}.json', async () => {
    await saveSnapshot('content', 'json', 'MILEBOARD');

    const callArgs = mockSave.mock.calls[0]?.[0];
    expect(callArgs?.defaultPath).toMatch(
      /^mileboard-snapshot-MILEBOARD-\d{4}-\d{2}-\d{2}-\d{4}\.json$/,
    );
  });

  it('Test 5: defaultPath ends with .md when format=markdown', async () => {
    await saveSnapshot('content', 'markdown', 'KEY');

    const callArgs = mockSave.mock.calls[0]?.[0];
    expect(callArgs?.defaultPath).toMatch(/\.md$/);
  });

  it('Test 6: defaultPath ends with .csv when format=csv', async () => {
    await saveSnapshot('content', 'csv', 'KEY');

    const callArgs = mockSave.mock.calls[0]?.[0];
    expect(callArgs?.defaultPath).toMatch(/\.csv$/);
  });

  // ------------------------------------------------------------------
  // dialog.save options: filters per format
  // ------------------------------------------------------------------

  it('Test 7: dialog.save filters = [{name:スナップショット, extensions:[json]}] for json', async () => {
    await saveSnapshot('content', 'json', 'KEY');

    expect(mockSave).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: [{ name: 'スナップショット', extensions: ['json'] }],
      }),
    );
  });

  it('Test 8: dialog.save filters extensions=[md] for markdown', async () => {
    await saveSnapshot('content', 'markdown', 'KEY');

    expect(mockSave).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: [{ name: 'スナップショット', extensions: ['md'] }],
      }),
    );
  });

  it('Test 9: dialog.save filters extensions=[csv] for csv', async () => {
    await saveSnapshot('content', 'csv', 'KEY');

    expect(mockSave).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: [{ name: 'スナップショット', extensions: ['csv'] }],
      }),
    );
  });

  // ------------------------------------------------------------------
  // Cancellation branch (Pitfall 2: null vs undefined)
  // ------------------------------------------------------------------

  it('Test 10a: returns {success:false, reason:cancelled} when dialog.save returns null', async () => {
    mockSave.mockResolvedValueOnce(null);

    const result = await saveSnapshot('content', 'json', 'KEY');

    expect(result).toEqual({ success: false, reason: 'cancelled' });
  });

  it('Test 10b: does NOT call writeTextFile when user cancels (path === null)', async () => {
    mockSave.mockResolvedValueOnce(null);

    await saveSnapshot('content', 'json', 'KEY');

    expect(mockWriteTextFile).not.toHaveBeenCalled();
  });

  // ------------------------------------------------------------------
  // Error branches
  // ------------------------------------------------------------------

  it('Test 11: returns {success:false, reason:error, error} when writeTextFile throws Error', async () => {
    mockWriteTextFile.mockRejectedValueOnce(new Error('write failed'));

    const result = await saveSnapshot('content', 'json', 'KEY');

    expect(result.success).toBe(false);
    if (!result.success && result.reason === 'error') {
      expect(result.error).toContain('write failed');
    } else {
      throw new Error('expected error result');
    }
  });

  it('Test 12: error message includes "Disk full" when writeTextFile throws new Error("Disk full")', async () => {
    mockWriteTextFile.mockRejectedValueOnce(new Error('Disk full'));

    const result = await saveSnapshot('content', 'json', 'KEY');

    expect(result.success).toBe(false);
    if (!result.success && result.reason === 'error') {
      expect(result.error).toContain('Disk full');
    } else {
      throw new Error('expected error result');
    }
  });

  it('Test 13: non-Error throw value is stringified', async () => {
    mockWriteTextFile.mockRejectedValueOnce('string error');

    const result = await saveSnapshot('content', 'json', 'KEY');

    expect(result.success).toBe(false);
    if (!result.success && result.reason === 'error') {
      expect(result.error).toBe('string error');
    } else {
      throw new Error('expected error result');
    }
  });

  it('Test 14: dialog.save throw is also caught as error branch', async () => {
    mockSave.mockRejectedValueOnce(new Error('dialog crashed'));

    const result = await saveSnapshot('content', 'json', 'KEY');

    expect(result.success).toBe(false);
    if (!result.success && result.reason === 'error') {
      expect(result.error).toContain('dialog crashed');
    } else {
      throw new Error('expected error result');
    }
    // writeTextFile must not be called when dialog.save fails
    expect(mockWriteTextFile).not.toHaveBeenCalled();
  });

  // ------------------------------------------------------------------
  // Path injection defense
  // ------------------------------------------------------------------

  it('Test 15: sanitizes projectKey "MY/PROJECT" to "MY_PROJECT" in defaultPath', async () => {
    await saveSnapshot('content', 'json', 'MY/PROJECT');

    const callArgs = mockSave.mock.calls[0]?.[0];
    expect(callArgs?.defaultPath).toMatch(/^mileboard-snapshot-MY_PROJECT-/);
    expect(callArgs?.defaultPath).not.toContain('/PROJECT');
  });

  it('Test 16: empty projectKey falls back to "mileboard" in defaultPath', async () => {
    await saveSnapshot('content', 'json', '');

    const callArgs = mockSave.mock.calls[0]?.[0];
    expect(callArgs?.defaultPath).toMatch(/^mileboard-snapshot-mileboard-/);
  });
});

// --------------------------------------------------------------------
// makeDefaultPath helper (deterministic via injected `now`)
// --------------------------------------------------------------------

describe('makeDefaultPath', () => {
  it('Test 17: formats deterministic timestamp with injected now', () => {
    // 2026-04-14 07:55:12 local — pick a fixed local date so tests are TZ-stable
    const fixedNow = new Date(2026, 3, 14, 7, 55, 12); // month is 0-indexed → April

    const path = makeDefaultPath('MILEBOARD', 'json', fixedNow);

    expect(path).toBe('mileboard-snapshot-MILEBOARD-2026-04-14-0755.json');
  });

  it('Test 17b: pads single-digit month/day/hour/minute correctly', () => {
    const fixedNow = new Date(2026, 0, 5, 3, 7, 0); // Jan 5 03:07

    const path = makeDefaultPath('KEY', 'markdown', fixedNow);

    expect(path).toBe('mileboard-snapshot-KEY-2026-01-05-0307.md');
  });

  it('Test 17c: csv extension', () => {
    const fixedNow = new Date(2026, 11, 31, 23, 59, 0); // Dec 31 23:59

    const path = makeDefaultPath('PROJ', 'csv', fixedNow);

    expect(path).toBe('mileboard-snapshot-PROJ-2026-12-31-2359.csv');
  });

  it('Test 17d: sanitizes non-[\\w-] chars in projectKey', () => {
    const fixedNow = new Date(2026, 3, 14, 7, 55, 0);

    const path = makeDefaultPath('MY/PROJ@2024', 'json', fixedNow);

    // /, @ → _; alphanumerics and digits preserved
    expect(path).toBe('mileboard-snapshot-MY_PROJ_2024-2026-04-14-0755.json');
  });

  it('Test 17e: empty projectKey falls back to "mileboard"', () => {
    const fixedNow = new Date(2026, 3, 14, 7, 55, 0);

    const path = makeDefaultPath('', 'json', fixedNow);

    expect(path).toBe('mileboard-snapshot-mileboard-2026-04-14-0755.json');
  });
});
