import { describe, it } from 'vitest';

describe('trimIssue', () => {
  it.todo('includes id, issueKey, keyId, summary');
  it.todo('includes status.name, assignee.name, priority.name');
  it.todo('includes dueDate, startDate');
  it.todo('includes category[].name (multiple)');
  it.todo('includes milestone[].name (multiple)');
  it.todo('excludes description, created, updated, projectId');
  it.todo('handles assignee=null → null');
  it.todo('handles priority=null → null');
  it.todo('handles category=[] → []');
});

describe('hydrateFilterState', () => {
  it.todo('resolves statusIds to {id, name} using boardData lookup');
  it.todo('resolves assigneeIds including null → {id:null, name:"(未割当)"}');
  it.todo('resolves categoryIds to {id, name}');
  it.todo('falls back to {id, name:"(不明)"} when lookup fails');
});

describe('groupSlotToSnapshot', () => {
  it.todo('converts existing GroupSlot to {kind, groupId, memberIds, members}');
  it.todo('maps visibleMembers via trimIssue');
  it.todo('omits representativeIssue, totalMembers, badgeText');
});
