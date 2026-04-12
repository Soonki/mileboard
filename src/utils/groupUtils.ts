import type { BacklogIssue } from '../types/backlog';
import type { Group, GroupId, GroupMap, GroupSlot } from '../types/group';
import type { ReorderEntry } from '../types/reorder';
import { isGroupEntry } from '../types/reorder';

/**
 * グループの代表カードを決定する純粋関数（D-04）。
 *
 * Q2 フォールバック:
 *  - 「memberIds 全体の keyId 最小」ではなく「可視メンバー内の keyId 最小」
 *  - これにより keyId 最小カードがフィルタで非表示でも代表が壊れない
 *  - 全メンバーが非表示なら null を返す（呼び出し側はグループを非表示にする）
 */
export function resolveRepresentativeCard(
  group: Group,
  visibleIssues: ReadonlyArray<BacklogIssue>,
): BacklogIssue | null {
  const visibleMap = new Map(visibleIssues.map((i) => [i.id, i]));
  const visibleMembers = group.memberIds
    .map((id) => visibleMap.get(id))
    .filter((i): i is BacklogIssue => i !== undefined);

  if (visibleMembers.length === 0) return null;

  return visibleMembers.reduce((min, current) =>
    current.keyId < min.keyId ? current : min,
  );
}

/**
 * issue が multi-milestone カードかを判定する（Q4 ガード）。
 * D-16: グループ化もバルク移動も禁止する。
 *
 * - prefix に一致するマイルストーンが 2 つ以上ある場合 true
 * - 1 つ以下なら false（通常カードまたは prefix 一致なし）
 */
export function rejectMultiMilestoneMember(
  issue: BacklogIssue,
  milestonePrefix: string,
): boolean {
  const matching = issue.milestone.filter((m) =>
    m.name.startsWith(milestonePrefix),
  );
  return matching.length > 1;
}

/**
 * boardData re-fetch 後の GroupMap クリーンアップ（Q3）。
 *
 * - allIssues に存在しない memberIds を削除
 * - memberIds.length が 2 未満になったグループは削除（自動 dissolve）
 * - 変更のないグループは元の参照を保持（参照同一性で最適化判定可能）
 * - 元の GroupMap は mutate しない
 */
export function pruneStaleMembers(
  groups: GroupMap,
  allIssues: ReadonlyArray<BacklogIssue>,
): GroupMap {
  const issueIdSet = new Set(allIssues.map((i) => i.id));
  const result: GroupMap = {};

  for (const [id, group] of Object.entries(groups) as Array<[GroupId, Group]>) {
    const validMembers = group.memberIds.filter((m) => issueIdSet.has(m));
    if (validMembers.length < 2) continue; // 自動 dissolve

    if (validMembers.length === group.memberIds.length) {
      result[id] = group; // 変更なし — 参照を保持
    } else {
      result[id] = { ...group, memberIds: validMembers };
    }
  }

  return result;
}

/**
 * レーン内の表示項目（単体カード + グループスロット）を生成する純粋関数。
 * applyCustomOrder の後段として Board.tsx の filteredAndSortedView から呼ばれる。
 *
 * 入力:
 *  - filteredIssues: フィルタ適用後の同レーン issue 群
 *  - rawLaneIssues: フィルタ前の同レーン issue 群（V/T バッジ計算に使う）
 *  - groups: groupStore 全体（laneId !== このレーン のものは除外）
 *  - laneId: 対象レーン
 *  - savedEntries: orderMap[laneId]（number と group:${id} を含む）
 *
 * 戻り値:
 *  - items: 表示順で並んだ Array<BacklogIssue | GroupSlot>
 *  - hiddenGroupCount: 全メンバー非表示で消えたグループ数（D-14、hiddenCount に加算）
 *
 * 動作:
 *  - groups[id].laneId !== laneId の group はスキップ
 *  - 各 group について visibleMembers / totalMembers / badgeText / representative を確定
 *  - savedEntries 内の number エントリがグループメンバーなら、グループ未挿入時のみ
 *    GroupSlot を挿入し、メンバー id 自体は top-level に出さない（重複防止）
 *  - savedEntries に無い filteredIssues は keyId 昇順で末尾に追加
 *  - savedEntries に無い新規グループも末尾に追加
 *  - rawMembers が 2 未満のグループ（cross-lane move 結果など）は描画不能としてスキップ
 */
export function applyGroupExpansion(
  filteredIssues: ReadonlyArray<BacklogIssue>,
  rawLaneIssues: ReadonlyArray<BacklogIssue>,
  groups: GroupMap,
  laneId: string,
  savedEntries: ReorderEntry[],
): { items: Array<BacklogIssue | GroupSlot>; hiddenGroupCount: number } {
  // 1. このレーンに属する group のみ対象
  const laneGroups = Object.values(groups).filter((g) => g.laneId === laneId);

  // 2. 各グループについて GroupSlot を事前構築
  const filteredMap = new Map(filteredIssues.map((i) => [i.id, i]));
  const rawMap = new Map(rawLaneIssues.map((i) => [i.id, i]));
  const groupSlots = new Map<GroupId, GroupSlot>();
  // memberId → groupId の逆引き。GroupSlot として描画される（renderable）グループのみ登録。
  // 描画不能なグループ（totalMembers < 2 等）のメンバーは通常カードとして単独描画させる。
  const memberIdToGroupId = new Map<number, GroupId>();
  let hiddenGroupCount = 0;

  for (const g of laneGroups) {
    const rawMembers = g.memberIds
      .map((id) => rawMap.get(id))
      .filter((i): i is BacklogIssue => i !== undefined);
    const visibleMembers = g.memberIds
      .map((id) => filteredMap.get(id))
      .filter((i): i is BacklogIssue => i !== undefined);
    const totalMembers = rawMembers.length;

    // 描画不能: 実質メンバーがレーンに 1 人以下しかいない（cross-lane 移動跡など）
    // この場合グループは表示せず、残メンバーは通常カードとして単独描画させる
    if (totalMembers < 2) continue;

    // 全メンバーがフィルタで非表示 → グループ自体を非表示化、カウントだけ加算
    // メンバーは memberIdToGroupId に登録して top-level から除外する（D-14）
    if (visibleMembers.length === 0) {
      hiddenGroupCount += 1;
      for (const m of g.memberIds) memberIdToGroupId.set(m, g.id);
      continue;
    }

    const representative = resolveRepresentativeCard(g, visibleMembers);
    if (!representative) continue;

    const badgeText =
      visibleMembers.length === totalMembers
        ? `${totalMembers}`
        : `${visibleMembers.length}/${totalMembers}`;

    groupSlots.set(g.id, {
      kind: 'group',
      group: g,
      representativeIssue: representative,
      visibleMembers: [...visibleMembers].sort((a, b) => a.keyId - b.keyId),
      totalMembers,
      badgeText,
    });
    // renderable な group のみ memberIdToGroupId に登録
    for (const m of g.memberIds) memberIdToGroupId.set(m, g.id);
  }

  // 4. savedEntries を走査して順序を組み立てる
  const items: Array<BacklogIssue | GroupSlot> = [];
  const usedIssueIds = new Set<number>();
  const usedGroupIds = new Set<GroupId>();

  for (const entry of savedEntries) {
    if (isGroupEntry(entry)) {
      const slot = groupSlots.get(entry as GroupId);
      if (slot && !usedGroupIds.has(slot.group.id)) {
        items.push(slot);
        usedGroupIds.add(slot.group.id);
      }
      continue;
    }

    // number エントリ
    const issueId = entry;
    const maybeGroupId = memberIdToGroupId.get(issueId);
    if (maybeGroupId) {
      // メンバーの場合: グループスロットがまだ未挿入なら挿入、メンバー自体は top-level に出さない
      if (!usedGroupIds.has(maybeGroupId)) {
        const slot = groupSlots.get(maybeGroupId);
        if (slot) {
          items.push(slot);
          usedGroupIds.add(maybeGroupId);
        }
      }
      continue;
    }

    const issue = filteredMap.get(issueId);
    if (issue && !usedIssueIds.has(issueId)) {
      items.push(issue);
      usedIssueIds.add(issueId);
    }
  }

  // 5. savedEntries に含まれない filteredIssues を keyId 昇順で末尾に追加
  //    （ただしグループメンバーは除外）
  const remaining = filteredIssues
    .filter((i) => !usedIssueIds.has(i.id))
    .filter((i) => !memberIdToGroupId.has(i.id))
    .sort((a, b) => a.keyId - b.keyId);
  items.push(...remaining);

  // 6. savedEntries に登録されていない新規 GroupSlot を末尾に追加
  for (const [id, slot] of groupSlots.entries()) {
    if (!usedGroupIds.has(id)) {
      items.push(slot);
      usedGroupIds.add(id);
    }
  }

  return { items, hiddenGroupCount };
}
