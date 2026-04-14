import { describe, it } from 'vitest';

describe('csvEscape', () => {
  it.todo('returns raw field when no special chars');
  it.todo('wraps in quotes when containing comma');
  it.todo('escapes internal quotes by doubling');
  it.todo('wraps in quotes when containing LF');
  it.todo('wraps in quotes when containing CRLF');
  it.todo('handles empty string');
  it.todo('preserves Japanese characters as-is');
});

describe('buildCsvSnapshot', () => {
  it.todo('starts with UTF-8 BOM \\uFEFF');
  it.todo('uses CRLF line endings (RFC 4180)');
  it.todo('emits header row: lane,issueKey,summary,status,assignee,priority,dueDate,startDate,category,groupId');
  it.todo('joins multiple categories with semicolon');
  it.todo('renders empty string for dueDate=null');
  it.todo('renders empty string for groupId when not in a group');
  it.todo('includes group members as rows with groupId column set');
});
