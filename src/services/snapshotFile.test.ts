import { describe, it } from 'vitest';

describe('saveSnapshot', () => {
  it.todo('returns {success:true, path} when user confirms and write succeeds');
  it.todo('calls dialog.save with correct defaultPath (mileboard-snapshot-{key}-{stamp}.{ext})');
  it.todo('calls dialog.save with correct filter extensions [json]/[md]/[csv]');
  it.todo('calls writeTextFile with the returned path and provided content');
  it.todo('returns {success:false, reason:cancelled} when dialog returns null');
  it.todo('does NOT call writeTextFile when user cancels');
  it.todo('returns {success:false, reason:error, error} when writeTextFile throws Error');
  it.todo('returns {success:false, reason:error, error} when dialog.save throws');
  it.todo('sanitizes projectKey: non [\\w-] replaced with _');
});
