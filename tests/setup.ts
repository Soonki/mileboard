import { vi } from 'vitest';

vi.mock('@tauri-apps/plugin-http', () => ({
  fetch: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-store', () => ({
  load: vi.fn(),
}));
