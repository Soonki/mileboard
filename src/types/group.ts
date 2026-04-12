import type { BacklogIssue } from './backlog';

/**
 * グループ ID。`group:` プレフィックス付きのテンプレートリテラル型。
 * 永続化時は orderMap の ReorderEntry と互換（D-15）。
 * 採番例: `group:1712930400000-a1b2c3`（Q1 衝突回避: timestamp + 6文字ランダム）
 */
export type GroupId = `group:${string}`;

/**
 * グループ本体。ローカル機能（D-12）のため Backlog 側には保存しない。
 */
export interface Group {
  /** `group:` プレフィックス付き ID */
  id: GroupId;
  /** メンバー issue ID。常に keyId 昇順に保つ（D-04 代表カード選出と整合） */
  memberIds: number[];
  /** 現在所属しているレーン ID */
  laneId: string;
}

/** groupId から Group へのマッピング。groupStore.groups の型。 */
export type GroupMap = Record<GroupId, Group>;

/**
 * レーン表示時のグループスロット。applyGroupExpansion が生成する。
 * - representativeIssue: フィルタ前後両方を考慮した代表カード（D-04 + Q2 フォールバック）
 * - visibleMembers: フィルタ適用後に残るメンバー
 * - totalMembers: フィルタ前のメンバー総数（件数バッジ V/T 計算用、D-14）
 * - badgeText: "N" (全可視) / "V/T" (一部非表示) 形式で確定した文字列
 */
export interface GroupSlot {
  kind: 'group';
  group: Group;
  representativeIssue: BacklogIssue;
  visibleMembers: BacklogIssue[];
  totalMembers: number;
  badgeText: string;
}
