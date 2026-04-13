import { describe, it, expect, beforeEach } from 'vitest';
import { useUiModeStore } from './uiModeStore';

describe('uiModeStore', () => {
  beforeEach(() => {
    useUiModeStore.setState({ mode: 'sort' });
  });

  it('defaults to sort mode', () => {
    expect(useUiModeStore.getState().mode).toBe('sort');
  });

  it('setMode switches to group', () => {
    useUiModeStore.getState().setMode('group');
    expect(useUiModeStore.getState().mode).toBe('group');
  });

  it('setMode switches back to sort', () => {
    useUiModeStore.getState().setMode('group');
    useUiModeStore.getState().setMode('sort');
    expect(useUiModeStore.getState().mode).toBe('sort');
  });

  it('toggleMode flips sort -> group', () => {
    useUiModeStore.getState().toggleMode();
    expect(useUiModeStore.getState().mode).toBe('group');
  });

  it('toggleMode flips group -> sort', () => {
    useUiModeStore.setState({ mode: 'group' });
    useUiModeStore.getState().toggleMode();
    expect(useUiModeStore.getState().mode).toBe('sort');
  });

  it('toggleMode is idempotent across two calls', () => {
    const initial = useUiModeStore.getState().mode;
    useUiModeStore.getState().toggleMode();
    useUiModeStore.getState().toggleMode();
    expect(useUiModeStore.getState().mode).toBe(initial);
  });

  it('does NOT expose any persistence API', () => {
    const state = useUiModeStore.getState();
    expect('loadFromStorage' in state).toBe(false);
    expect('saveToStorage' in state).toBe(false);
  });
});
