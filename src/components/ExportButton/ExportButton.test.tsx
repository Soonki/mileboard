import { describe, it } from 'vitest';

describe('ExportButton', () => {
  it.todo('renders button with aria-label="スナップショットをエクスポート"');
  it.todo('button has aria-haspopup="menu"');
  it.todo('button has aria-expanded=false when closed');
  it.todo('button is disabled when boardStore.data === null');
  it.todo('button is disabled when boardStore.status === loading');
  it.todo('button is enabled when isReloading === true (stale view export is allowed)');
  it.todo('click opens dropdown panel with role="menu"');
  it.todo('dropdown has 3 menu items: JSON / Markdown / CSV');
  it.todo('ESC closes dropdown and restores focus to trigger');
  it.todo('click outside closes dropdown');
  it.todo('clicking JSON menu item calls saveSnapshot with format=json');
  it.todo('clicking Markdown menu item calls saveSnapshot with format=markdown');
  it.todo('clicking CSV menu item calls saveSnapshot with format=csv');
  it.todo('ArrowDown moves focus to next menu item');
  it.todo('ArrowUp wraps to last menu item from first');
  it.todo('Enter on focused menu item fires format handler');
  it.todo('shows error toast when saveSnapshot returns {success:false, reason:error}');
  it.todo('silent (no toast) when saveSnapshot returns {success:false, reason:cancelled}');
  it.todo('silent (no toast) when saveSnapshot returns {success:true}');
});
