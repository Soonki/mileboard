import { describe, it } from 'vitest';

describe('buildMarkdownSnapshot', () => {
  it.todo('renders H1 "mileboard snapshot"');
  it.todo('renders Project / Generated / View / Revision header metadata');
  it.todo('renders one H2 per lane with visible/hidden count');
  it.todo('renders table with 7 columns: Key Summary Status Assignee Priority Due Group');
  it.todo('escapes | as \\| in summary cells');
  it.todo('escapes newline as <br> in summary cells');
  it.todo('renders group row with groupId and k/n format');
  it.todo('renders empty cell when dueDate is null');
  it.todo('renders empty cell when assignee is null');
});
