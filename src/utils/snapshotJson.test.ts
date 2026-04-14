import { describe, it } from 'vitest';

describe('buildJsonSnapshot', () => {
  it.todo('includes schemaVersion=1 at top level');
  it.todo('includes snapshotAt as ISO-8601 local string with offset');
  it.todo('includes boardRevision from input');
  it.todo('includes meta.projectKey and meta.milestonePrefix');
  it.todo('includes meta.viewState.filter as HydratedFilterState');
  it.todo('includes meta.viewState.sort {field, direction}');
  it.todo('includes meta.viewState.reorder as ReorderMap');
  it.todo('includes meta.viewState.groups as full GroupMap snapshot');
  it.todo('includes meta.viewState.uiMode');
  it.todo('lanes[] has laneId, name, visible, hidden, items');
  it.todo('items[] inlines group as {kind:group, groupId, memberIds, members}');
  it.todo('matches v1 golden envelope (toMatchSnapshot with normalized snapshotAt)');
});
