# Phase 5: Drag & Drop with Optimistic Updates - Research

**Researched:** 2026-04-08
**Domain:** @dnd-kit drag-and-drop, optimistic state management, Backlog API PATCH, sonner toasts
**Confidence:** HIGH

## Summary

Phase 5はmileboardのコア機能であるドラッグ&ドロップを実装する。フロントエンドは@dnd-kit/core 6.3.1 + @dnd-kit/sortable 10.0.0のMultiple Containersパターンを使用し、レーン間のカード移動を実現する。Zustandストアに`moveIssue`アクションを追加してオプティミスティック更新+ロールバックパターンを実装する。Rustバックエンドには`update_issue_milestone` IPCコマンドを新設し、Backlog PATCH APIでmilestoneId[]配列を正しく再構築してプレフィックス外マイルストーンを保持する。エラー通知にはsonner 2.0.7を使用する。

技術的に最もリスクが高いのは、Backlog API PATCH時のマイルストーン配列保持ロジック（非プレフィックスマイルストーンの欠落はデータ損失）と、@dnd-kitのonDragOverでのクロスコンテナ移動ロジックである。

**Primary recommendation:** @dnd-kitのMultiple Containersパターン（DndContext + SortableContext per lane + DragOverlay）を使い、useDroppableで空レーンのドロップを補完し、boardStoreのsnapshot/rollbackパターンでオプティミスティック更新を実装する。

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Dragged card is fully opaque with slight scale-up (scale: 1.05) and large drop shadow. Linear/Jira-style solid drag overlay.
- **D-02:** Original position is hidden during drag (card removed from flow, no placeholder shown).
- **D-03:** Drop target lane gets a subtle background color highlight when hovered during drag. Simple color change only, no border modification.
- **D-04:** Phase 4's onClick handler on IssueCard must coexist with dnd-kit drag. dnd-kit handles this via activationConstraint (distance or delay threshold).
- **D-05:** Cards belonging to multiple milestones display a small warning icon between the issueKey and StatusBadge on line 1 of the card.
- **D-06:** Hovering the warning icon shows a tooltip listing the other milestone names.
- **D-07:** Multi-milestone cards appear in the earliest-start-date lane only (per DND-03 requirement).
- **D-08:** Cross-lane drag is disabled for multi-milestone cards. Attempting to drag shows a not-allowed cursor. Card does not lift or move.
- **D-09:** Error toasts displayed at bottom-right of the screen using sonner.
- **D-10:** Display-only toasts (no retry action button). Auto-dismiss after 5 seconds.
- **D-11:** Multiple errors stack vertically. Japanese error messages from Rust backend.
- **D-12:** Rollback completes before/simultaneously with toast display.
- **D-13:** Drag from unassigned lane to milestone lane is ALLOWED.
- **D-14:** Drag from milestone lane to unassigned lane is ALLOWED.
- **D-15:** If removing the prefix milestone leaves the issue with zero milestones, the issue moves to the unassigned lane.
- **D-16:** Follows snapshot -> optimistic update -> async API call -> rollback on failure + error toast pattern.
- **D-17:** boardStore gets a `moveIssue` action that handles snapshot, optimistic update, API call, and rollback internally.
- **D-18:** New Rust IPC command `update_issue_milestone` in backlog module. Fetches current issue milestone list, removes old prefix-matching milestone, adds new milestone (or none for unassigned), preserves all non-prefix milestones, sends PATCH.
- **D-19:** tauriBridge.ts gets a new `updateIssueMilestone` function as the frontend proxy.

### Claude's Discretion
- dnd-kit DragOverlay implementation details and activation constraint thresholds
- Exact highlight color for drop target lanes
- Tooltip implementation approach (CSS-only vs library)
- Scale and shadow CSS values for drag overlay
- boardStore internal snapshot/rollback implementation
- Rust PATCH request construction details
- Component decomposition for DnD wrapper layers (DndContext placement)

### Deferred Ideas (OUT OF SCOPE)
- ドロップ位置のインサーションポイント表示 (UXP-03, v2)
- レーン内の並び替え (PWR-01, v2)
- 複数カード選択・一括移動 (PWR-02, v2)
- ホストURL入力のサニタイズ (Phase 1スコープ)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DND-01 | Dragging a card between lanes changes the issue's milestone in Backlog | @dnd-kit Multiple Containers pattern, Rust `update_issue_milestone` command, tauriBridge proxy |
| DND-02 | Optimistic UI update on drop with rollback to original lane on API failure | Zustand snapshot/rollback pattern, sonner error toast |
| DND-03 | Multi-milestone issues display in earliest-start-date lane with warning badge and cross-lane DnD disabled | `BacklogIssue.milestone[]` already available, useSortable `disabled` prop, WarningBadge component |
| UX-02 | Error toast displayed on API failure | sonner 2.0.7 `<Toaster />` + `toast.error()` |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **言語:** 日本語で応答。コード識別子・技術用語は英語
- **Immutability:** Zustand `set()` でスプレッド構文。直接mutation禁止
- **ファイル命名:** `PascalCase.tsx` (コンポーネント), `camelCase.ts` (サービス), `Component.module.css`
- **エラー処理:** サービス層は discriminated union `{ success, data?, error? }` を返す。UIは日本語メッセージ
- **テスト:** TDD。カバレッジ80%+。テストファイルはソースと同階層
- **Tauri mock:** `tests/setup.ts` でグローバルモック
- **アイコン:** 外部アイコンライブラリ不使用、Unicode文字のみ
- **IPC:** tauriBridge.ts経由のみ。直接invoke()禁止
- **DnD:** @dnd-kit/core 6.3.1 + @dnd-kit/sortable 10.0.0 (CLAUDE.md指定バージョン)
- **Toast:** sonner 2.x
- **CSS:** CSS Modules + custom properties

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @dnd-kit/core | 6.3.1 | DnD基盤 (DndContext, sensors, collision detection) | CLAUDE.md指定。React DnDの現代的後継。[VERIFIED: npm registry] |
| @dnd-kit/sortable | 10.0.0 | ソート可能なリスト (useSortable, SortableContext) | CLAUDE.md指定。Multiple Containersパターン対応。[VERIFIED: npm registry] |
| @dnd-kit/utilities | 3.2.2 | CSS.Transform等のユーティリティ | @dnd-kit/sortable の依存関係として自動インストール。[VERIFIED: npm registry] |
| sonner | 2.0.7 | トースト通知 | CLAUDE.md指定。軽量・React 19対応。[VERIFIED: npm registry] |
| zustand | 5.0.12 | 状態管理 (既存) | 既にインストール済み。moveIssueアクション追加。[VERIFIED: package.json] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| reqwest (Rust) | 既存 | Backlog PATCH APIリクエスト | update_issue_milestone command内 |
| serde (Rust) | 既存 | フォームデータシリアライズ | PATCH body構築 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @dnd-kit | react-beautiful-dnd | 非推奨(メンテナンス停止)。@dnd-kitが現代的標準 |
| sonner | react-hot-toast | sonnerはCLAUDE.md指定。より軽量で現代的 |
| CSS-only tooltip | react-tooltip | D-06の要件はシンプル。外部依存不要 |

**Installation:**
```bash
npm install @dnd-kit/core@6.3.1 @dnd-kit/sortable@10.0.0 sonner@^2.0.7
```

**Version verification:**
- @dnd-kit/core: 6.3.1 (latest) [VERIFIED: npm registry 2026-04-08]
- @dnd-kit/sortable: 10.0.0 (latest) [VERIFIED: npm registry 2026-04-08]
- @dnd-kit/utilities: 3.2.2 (transitive dep) [VERIFIED: npm registry 2026-04-08]
- sonner: 2.0.7 (latest) [VERIFIED: npm registry 2026-04-08]

## Architecture Patterns

### Recommended Project Structure (Phase 5 additions)
```
src/
├── components/
│   ├── Board/
│   │   ├── Board.tsx           # DndContext + DragOverlay追加
│   │   ├── Board.module.css    # 既存
│   │   └── Board.test.tsx      # DnDイベントテスト追加
│   ├── Lane/
│   │   ├── Lane.tsx            # useDroppable + SortableContext追加
│   │   ├── Lane.module.css     # .laneDropTarget追加
│   │   └── Lane.test.tsx       # ドロップターゲットテスト追加
│   ├── IssueCard/
│   │   ├── IssueCard.tsx       # useSortable追加、click/drag共存
│   │   ├── IssueCard.module.css # .cardDragging, .cardDragDisabled追加
│   │   └── IssueCard.test.tsx  # DnD統合テスト追加
│   ├── DragOverlayCard/
│   │   ├── DragOverlayCard.tsx       # NEW: ドラッグオーバーレイ
│   │   ├── DragOverlayCard.module.css # NEW
│   │   └── DragOverlayCard.test.tsx   # NEW
│   └── WarningBadge/
│       ├── WarningBadge.tsx           # NEW: マルチマイルストーン警告
│       ├── WarningBadge.module.css    # NEW: CSSツールチップ付き
│       └── WarningBadge.test.tsx      # NEW
├── stores/
│   ├── boardStore.ts           # moveIssueアクション追加
│   └── boardStore.test.ts     # moveIssue + rollbackテスト追加
├── services/
│   ├── tauriBridge.ts          # updateIssueMilestone追加
│   └── tauriBridge.test.ts    # テスト追加
├── types/
│   └── board.ts               # UpdateIssueMilestoneParams追加
└── global.css                 # DnDトークン3つ追加
src-tauri/src/
└── backlog/
    ├── client.rs              # update_issue_milestone メソッド追加
    ├── commands.rs            # update_issue_milestone コマンド追加
    ├── error.rs               # UpdateFailed バリアント追加
    ├── types.rs               # 既存で十分
    └── mod.rs                 # 既存(エクスポート不要 - commands.rs内)
src-tauri/src/
└── lib.rs                     # invoke_handler に update_issue_milestone 登録
```

### Pattern 1: @dnd-kit Multiple Containers (Cross-Lane DnD)
**What:** DndContextが全レーンを包み、各レーンがSortableContextを持つ。onDragOverでコンテナ間移動を検出し状態更新。
**When to use:** レーン間カード移動が必要な場合（全DnD操作）

```typescript
// Source: https://github.com/clauderic/dnd-kit/blob/master/stories/2%20-%20Presets/Sortable/MultipleContainers.tsx
// [VERIFIED: GitHub official example]

// Board.tsx
import { DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core';

const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: { distance: 5 }, // D-04: 5px threshold
  })
);

<DndContext
  sensors={sensors}
  collisionDetection={closestCorners}
  onDragStart={handleDragStart}
  onDragEnd={handleDragEnd}
>
  {/* Lanes with SortableContext */}
  <DragOverlay>
    {activeId ? <DragOverlayCard issue={activeIssue} /> : null}
  </DragOverlay>
</DndContext>
```

### Pattern 2: Lane as Droppable + SortableContext
**What:** 各レーンがuseDroppable（空レーンでもドロップ可能にする）とSortableContext（アイテムの並び順管理）を組み合わせる
**When to use:** 全てのLaneコンポーネント

```typescript
// [CITED: https://dndkit.com/presets/sortable]

// Lane.tsx
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

function Lane({ laneId, issues }: LaneProps) {
  const { setNodeRef, isOver } = useDroppable({ id: laneId });
  const issueIds = issues.map(i => i.id);

  return (
    <div ref={setNodeRef} className={clsx(styles.lane, isOver && styles.laneDropTarget)}>
      <SortableContext items={issueIds} strategy={verticalListSortingStrategy}>
        {issues.map(issue => <IssueCard key={issue.id} issue={issue} />)}
      </SortableContext>
    </div>
  );
}
```

### Pattern 3: Sortable Card with Click Coexistence
**What:** IssueCardにuseSortableを適用し、距離ベースのactivationConstraintでクリックとドラッグを判別
**When to use:** 全IssueCardコンポーネント

```typescript
// [CITED: https://github.com/clauderic/dnd-kit/discussions/476]

// IssueCard.tsx
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function IssueCard({ issue }: IssueCardProps) {
  const isMultiMilestone = issue.milestone.length > 1;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: issue.id,
    disabled: isMultiMilestone, // D-08: multi-milestone cards cannot drag
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={clsx(
        styles.card,
        isDragging && styles.cardDragging,
        isMultiMilestone && styles.cardDragDisabled,
      )}
      onClick={handleClick} // activationConstraint(5px)でクリック時はonClickが発火
    >
      {/* card content */}
    </div>
  );
}
```

### Pattern 4: Optimistic Update with Snapshot/Rollback
**What:** Zustandストアでスナップショットを取り、UIを即時更新し、API失敗時にロールバック
**When to use:** moveIssueアクション

```typescript
// [CITED: ARCHITECTURE.md §State Management]

// boardStore.ts
moveIssue: async (issueId: number, fromLaneId: string, toLaneId: string) => {
  const snapshot = get().data; // 1. スナップショット
  
  // 2. オプティミスティック更新（イミュータブル）
  set((state) => ({
    ...state,
    data: applyMoveIssue(state.data!, issueId, fromLaneId, toLaneId),
  }));
  
  try {
    // 3. API呼び出し
    await updateIssueMilestone(/* params */);
  } catch (error) {
    // 4. ロールバック + トースト
    set((state) => ({ ...state, data: snapshot }));
    toast.error(typeof error === 'string' ? error : 'マイルストーンの変更に失敗しました');
  }
}
```

### Pattern 5: Rust PATCH with Milestone Preservation
**What:** Backlog課題の現在のマイルストーンリストからプレフィックス一致のものだけを差し替え、それ以外を保持してPATCH
**When to use:** update_issue_milestoneコマンド

```rust
// [ASSUMED] - Based on ARCHITECTURE.md §5 and Backlog API docs

pub async fn update_issue_milestone(
    &self,
    host: &str,
    api_key: &str,
    issue_id_or_key: &str,
    new_milestone_id: Option<u64>,  // None = unassigned
    prefix: &str,
) -> Result<Issue, BacklogError> {
    // 1. 現在の課題を取得
    let current = self.fetch_issue(host, api_key, issue_id_or_key).await?;
    
    // 2. 非プレフィックスマイルストーンを保持
    let mut milestone_ids: Vec<u64> = current.milestone
        .iter()
        .filter(|m| !m.name.starts_with(prefix))
        .map(|m| m.id)
        .collect();
    
    // 3. 新しいマイルストーンを追加（Noneなら追加しない = unassigned移動）
    if let Some(mid) = new_milestone_id {
        milestone_ids.push(mid);
    }
    
    // 4. PATCH (milestoneId[]は全配列置換)
    self.patch_issue(host, api_key, issue_id_or_key, &milestone_ids).await
}
```

### Anti-Patterns to Avoid
- **onDragOverでの頻繁なAPI呼び出し:** DnDのonDragOverはマウス移動中に大量発火する。API呼び出しはonDragEnd時のみ [VERIFIED: dnd-kit docs]
- **DragOverlay内でuseSortableを使う:** IDが重複してレンダリングが壊れる。プレゼンテーショナルコンポーネント（DragOverlayCard）を使う [VERIFIED: dnd-kit docs]
- **ミュータブルな状態更新:** `state.data.milestones[i].issues.push(issue)` は禁止。常にスプレッド構文で新オブジェクト生成
- **フロントエンドでのマイルストーン配列再構築:** マイルストーン保持ロジックはRustバックエンドに集約。フロントエンドはlaneIdのみ送信
- **直接invoke()呼び出し:** 全てtauriBridge経由（CLAUDE.mdルール）

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| ドラッグ&ドロップ | カスタムmousedown/mousemove | @dnd-kit/core + sortable | タッチ対応、アクセシビリティ、collision detection、パフォーマンス最適化が組み込み |
| DragOverlayのポジショニング | position:fixedの自作計算 | @dnd-kit DragOverlay | viewportスクロール、transformオフセットの計算が複雑 |
| トースト通知 | カスタムトーストコンポーネント | sonner | スタック管理、アニメーション、aria-liveが組み込み |
| collision detection | カスタムヒットテスト | closestCorners / pointerWithin | エッジケース（重なり、スクロール中）の処理が複雑 |
| CSSトランスフォーム文字列化 | 手書きtranslate3d文字列 | @dnd-kit/utilities CSS.Transform | ブラウザ互換性と最適化 |

**Key insight:** @dnd-kitのMultiple Containersパターンはkanbanボードに最適化されている。公式Storybookの`MultipleContainers.tsx`が正確なリファレンス実装を提供している。

## Common Pitfalls

### Pitfall 1: milestoneId[]の全配列置換
**What goes wrong:** Backlog PATCH APIは`milestoneId[]`パラメータで送った値で既存のマイルストーン配列を**完全に置換**する。新しいマイルストーンIDだけを送ると、他のマイルストーンが消失する。
**Why it happens:** 多くのAPIは差分更新だが、Backlogは全配列置換方式。
**How to avoid:** Rust側で必ず (1) 現在の課題を取得 → (2) 非プレフィックスマイルストーンを抽出 → (3) 新マイルストーンを追加 → (4) 完全な配列をPATCH送信。
**Warning signs:** ドラッグ後にBacklog UIで他のマイルストーンが消えている。

### Pitfall 2: onDragOver vs onDragEnd の使い分け
**What goes wrong:** onDragOverでAPI呼び出しやトースト表示をすると、ドラッグ中に大量の副作用が発生する。
**Why it happens:** onDragOverはポインタ移動ごとに発火。クロスコンテナ検出に使うが、API呼び出しはonDragEndのみ。
**How to avoid:** onDragOverはUI状態の更新のみ（どのレーンにホバーしているかの表示）。onDragEndで確定処理。注意: このフェーズではレーン内並べ替えがないため、onDragOverは不要。onDragEndのみでfromLaneId/toLaneIdを判定すれば十分。
**Warning signs:** ドラッグ中のパフォーマンス劣化、ネットワークリクエストの大量発生。

### Pitfall 3: DragOverlay内のID重複
**What goes wrong:** DragOverlay内でuseSortableを持つ同じコンポーネントをレンダリングすると、同一IDのSortableが2つ存在しDnDが破綻する。
**Why it happens:** DragOverlayはドラッグ中の視覚的クローンを表示する専用コンポーネント。DnDフックは不要。
**How to avoid:** DragOverlayCard（プレゼンテーショナル）とIssueCard（useSortable付き）を分離する。DragOverlayCardはIssueCardと同じ見た目だがDnDフックを持たない。
**Warning signs:** ドラッグ開始時にコンソールエラー、カードが意図しない位置に表示。

### Pitfall 4: click/drag判別の失敗
**What goes wrong:** activationConstraintが無い場合、全てのクリックがドラッグとして扱われ、カードクリックでBacklog URLが開かなくなる。
**Why it happens:** useSortableはデフォルトでポインタダウン即ドラッグ開始。
**How to avoid:** `PointerSensor`に`activationConstraint: { distance: 5 }` を設定（UI-SPEC指定値）。5px以内の移動はクリックとして処理。
**Warning signs:** カードをクリックしてもBacklog URLが開かない。

### Pitfall 5: 空レーンへのドロップ不能
**What goes wrong:** SortableContextのみでは、アイテムが0個のレーンにドロップできない（ドロップターゲットとなるアイテムが存在しないため）。
**Why it happens:** SortableContextはアイテム間の並べ替えを前提としている。
**How to avoid:** 各レーンにuseDroppableを追加し、レーン自体をドロップターゲットにする。SortableContextと併用。closestCornersのcollision detectionがレーン全体を検出する。
**Warning signs:** 空レーンにカードをドラッグしてもドロップインジケーターが表示されない。

### Pitfall 6: Unassigned Lane ID の一貫性
**What goes wrong:** unassigned laneのIDを文字列 `"unassigned"` にした場合、マイルストーンレーンのIDが数値 `milestone.id` だとID型が混在する。
**Why it happens:** @dnd-kitのIDは`string | number`のuniqueidentifier型。
**How to avoid:** レーンIDを統一的に文字列で管理: `"unassigned"`, `"milestone-{id}"` 形式。findContainer関数でパース。
**Warning signs:** ドラッグ時にTypeScriptの型エラー。

### Pitfall 7: Tauriコマンドの借用パラメータ
**What goes wrong:** Rustの`#[tauri::command]`で`&str`パラメータを使うとコンパイルエラー。
**Why it happens:** Tauri asyncコマンドはSend制約があり、借用パラメータを渡せない。
**How to avoid:** 全パラメータを`String`型にする（既存のfetch_board_dataと同じパターン）。
**Warning signs:** Rustコンパイルエラー: `borrowed data escapes`。

## Code Examples

### 1. Board.tsx: DndContext + DragOverlay セットアップ

```typescript
// Source: @dnd-kit official docs + MultipleContainers example
// [VERIFIED: https://github.com/clauderic/dnd-kit/blob/master/stories/2%20-%20Presets/Sortable/MultipleContainers.tsx]

import { DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { Toaster } from 'sonner';

export function Board() {
  const [activeIssue, setActiveIssue] = useState<BacklogIssue | null>(null);
  const data = useBoardStore((s) => s.data);
  const moveIssue = useBoardStore((s) => s.moveIssue);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const issueId = event.active.id as number;
    const issue = findIssueById(data, issueId);
    setActiveIssue(issue ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveIssue(null);

    if (!over) return;

    const fromLaneId = findLaneContaining(data, active.id as number);
    const toLaneId = extractLaneId(over.id);

    if (fromLaneId && toLaneId && fromLaneId !== toLaneId) {
      moveIssue(active.id as number, fromLaneId, toLaneId);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className={styles.board}>
        {/* Lanes */}
      </div>
      <DragOverlay>
        {activeIssue ? <DragOverlayCard issue={activeIssue} /> : null}
      </DragOverlay>
      <Toaster position="bottom-right" duration={5000} closeButton />
    </DndContext>
  );
}
```

### 2. Lane.tsx: useDroppable + SortableContext

```typescript
// Source: dnd-kit sortable docs
// [CITED: https://dndkit.com/presets/sortable]

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

interface LaneProps {
  laneId: string;  // "unassigned" | "milestone-{id}"
  name: string;
  issues: BacklogIssue[];
  // ... other existing props
}

export function Lane({ laneId, name, issues, ...rest }: LaneProps) {
  const { setNodeRef, isOver } = useDroppable({ id: laneId });
  const issueIds = issues.map((i) => i.id);

  return (
    <div
      ref={setNodeRef}
      className={`${styles.lane} ${isOver ? styles.laneDropTarget : ''}`}
    >
      <LaneHeader name={name} issueCount={issues.length} /* ... */ />
      <SortableContext items={issueIds} strategy={verticalListSortingStrategy}>
        <div className={styles.cardList}>
          {issues.length === 0 ? (
            <EmptyLane />
          ) : (
            issues.map((issue) => <IssueCard key={issue.id} issue={issue} />)
          )}
        </div>
      </SortableContext>
    </div>
  );
}
```

### 3. boardStore.ts: moveIssue with Snapshot/Rollback

```typescript
// Source: ARCHITECTURE.md §State Management
// [CITED: .planning/codebase/ARCHITECTURE.md]

import { toast } from 'sonner';
import { updateIssueMilestone } from '../services/tauriBridge';

interface BoardStoreState {
  // ... existing fields
  moveIssue: (issueId: number, fromLaneId: string, toLaneId: string) => void;
}

moveIssue: (issueId, fromLaneId, toLaneId) => {
  const snapshot = get().data;
  if (!snapshot) return;

  // Optimistic update (immutable)
  const updatedData = applyMoveIssue(snapshot, issueId, fromLaneId, toLaneId);
  set({ data: updatedData });

  // Extract milestone ID for API call
  const newMilestoneId = parseMilestoneIdFromLaneId(toLaneId); // null for "unassigned"
  const issue = findIssueInBoardData(snapshot, issueId);
  if (!issue) return;

  // Async API call
  const { settings } = useSettingsStore.getState();
  updateIssueMilestone(
    settings.hostUrl,
    settings.apiKey,
    issue.issueKey,
    newMilestoneId,
    settings.milestonePrefix,
  ).catch((error: unknown) => {
    // Rollback
    set({ data: snapshot });
    const message = typeof error === 'string'
      ? `マイルストーンの変更に失敗しました: ${error}`
      : 'マイルストーンの変更に失敗しました';
    toast.error(message);
  });
}
```

### 4. Rust: update_issue_milestone コマンド

```rust
// Source: ARCHITECTURE.md §5, Backlog API docs
// [CITED: https://developer.nulab.com/docs/backlog/api/2/update-issue/]

#[tauri::command]
pub async fn update_issue_milestone(
    client: State<'_, BacklogClient>,
    host: String,
    api_key: String,
    issue_id_or_key: String,
    new_milestone_id: Option<u64>,
    milestone_prefix: String,
) -> Result<(), String> {
    client
        .update_milestone(
            &host,
            &api_key,
            &issue_id_or_key,
            new_milestone_id,
            &milestone_prefix,
        )
        .await
        .map_err(|e| e.to_string())
}
```

### 5. Rust: BacklogClient PATCH method

```rust
// Source: Backlog API docs
// [CITED: https://developer.nulab.com/docs/backlog/api/2/update-issue/]

pub async fn update_milestone(
    &self,
    host: &str,
    api_key: &str,
    issue_id_or_key: &str,
    new_milestone_id: Option<u64>,
    prefix: &str,
) -> Result<(), BacklogError> {
    // 1. Fetch current issue to get existing milestones
    let issue = self.fetch_issue(host, api_key, issue_id_or_key).await?;

    // 2. Preserve non-prefix milestones, remove prefix-matching ones
    let mut milestone_ids: Vec<u64> = issue
        .milestone
        .iter()
        .filter(|m| !m.name.starts_with(prefix))
        .map(|m| m.id)
        .collect();

    // 3. Add new milestone (None = moving to unassigned)
    if let Some(mid) = new_milestone_id {
        milestone_ids.push(mid);
    }

    // 4. Build form body: milestoneId[]=1&milestoneId[]=2
    let url = format!(
        "https://{host}/api/v2/issues/{issue_id_or_key}?apiKey={api_key}"
    );
    let mut form_params: Vec<(&str, String)> = Vec::new();
    for mid in &milestone_ids {
        form_params.push(("milestoneId[]", mid.to_string()));
    }
    // If no milestones remain, send empty milestoneId[] to clear
    // Backlog API: sending no milestoneId[] param leaves existing values,
    // so we must explicitly send an empty value
    if milestone_ids.is_empty() {
        form_params.push(("milestoneId[]", String::new()));
    }

    let response = self.http.patch(&url)
        .form(&form_params)
        .send()
        .await
        .map_err(map_reqwest_error)?;
    let _response = self.check_response(response).await?;
    Ok(())
}
```

### 6. WarningBadge: CSS-only Tooltip

```typescript
// Source: UI-SPEC D-05, D-06
// [CITED: 05-UI-SPEC.md §Interaction Contract: Multi-Milestone Warning Badge]

interface WarningBadgeProps {
  otherMilestones: string[]; // 他マイルストーン名の配列
}

export function WarningBadge({ otherMilestones }: WarningBadgeProps) {
  const tooltipText = `他のマイルストーン: ${otherMilestones.join(', ')}`;
  return (
    <span
      className={styles.badge}
      data-tooltip={tooltipText}
      aria-label={tooltipText}
    >
      {'\u26A0'}
    </span>
  );
}
```

```css
/* WarningBadge.module.css */
.badge {
  font-size: var(--font-size-sm);
  color: var(--color-warning);
  cursor: help;
  position: relative;
  margin-left: var(--space-xs);
}

.badge::after {
  content: attr(data-tooltip);
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  background: var(--color-text-primary);
  color: var(--color-surface);
  font-size: var(--font-size-sm);
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--radius-badge);
  max-width: 240px;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 300ms;
  transition-delay: 300ms;
  z-index: 10;
}

.badge:hover::after {
  opacity: 1;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-beautiful-dnd | @dnd-kit | 2023 | rbd はAtlassianが非推奨化。@dnd-kitがReact DnDの標準 |
| react-dnd | @dnd-kit | 2022-2023 | @dnd-kitはよりモダンなAPI、フック中心設計 |
| react-toastify | sonner | 2023 | sonnerは軽量、良好なデフォルトUI |

**Deprecated/outdated:**
- react-beautiful-dnd: Atlassianがメンテナンス停止を発表。@dnd-kitへの移行推奨 [ASSUMED]
- react-dnd: 機能は十分だがAPI設計が古い。@dnd-kitがモダンな代替 [ASSUMED]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Backlog PATCH APIでmilestoneId[]を空で送信するとマイルストーンがクリアされる | Code Examples §5 | unassigned移動が機能しない。空配列送信の代替方法を調査する必要あり |
| A2 | @dnd-kit 6.3.1でonDragEnd内のover.idからレーンIDを取得可能 | Architecture Patterns §1 | レーン特定ロジックの変更が必要。closestCornersがレーンIDではなくアイテムIDを返す可能性あり |
| A3 | sonner 2.xがReact 19.1と互換性がある | Standard Stack | 互換性問題があればバージョン固定またはフォールバック必要 |
| A4 | reqwest PATCH + form dataでmilestoneId[]を正しく送信可能 | Code Examples §5 | reqwestのform()がarray parameterを正しくエンコードするか要確認 |

## Open Questions

1. **milestoneId[]のクリア方法**
   - What we know: PATCH APIはmilestoneId[]を全配列置換する
   - What's unclear: 全マイルストーンを削除する場合、空配列をどう送るか。`milestoneId[]=` (空文字列) か、パラメータ自体を省略するか
   - Recommendation: Rustの実装で実験するか、Backlog API仕様を確認。最悪の場合、unassigned移動を明示的に「既存マイルストーン削除」として実装

2. **closestCorners vs pointerWithin のcollision detection**
   - What we know: 公式exampleではpointerWithin → rectIntersectionのカスケード戦略を使用
   - What's unclear: 280pxの狭いレーンでどちらが適切か
   - Recommendation: closestCornersで開始し、ドロップ精度に問題があればpointerWithinにフォールバック

3. **onDragEnd内のover target判別**
   - What we know: onDragEnd の`over`はドロップ先のdroppable/sortable。useDroppableのレーンIDかuseSortableのアイテムIDのどちらかが入る
   - What's unclear: アイテムの上にドロップした場合、`over.id`はアイテムID。レーンIDを取得するにはfindContainer関数が必要
   - Recommendation: `findLaneContaining(over.id)` ヘルパーでover.idからレーンIDを解決する。over.idがレーンIDならそのまま、アイテムIDならそのアイテムが属するレーンを検索

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.x + @testing-library/react 16.x |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run src/stores/boardStore.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DND-01 | Cross-lane drag changes milestone | unit + integration | `npx vitest run src/stores/boardStore.test.ts -t "moveIssue"` | Needs update (Wave 0) |
| DND-02 | Optimistic update + rollback | unit | `npx vitest run src/stores/boardStore.test.ts -t "rollback"` | Needs update (Wave 0) |
| DND-03 | Multi-milestone warning + drag disabled | unit | `npx vitest run src/components/WarningBadge/WarningBadge.test.tsx` | New file (Wave 0) |
| DND-03 | Earliest-start-date lane placement | unit | `npx vitest run src/stores/boardStore.test.ts -t "multi-milestone"` | Needs update (Wave 0) |
| UX-02 | Error toast on API failure | unit | `npx vitest run src/stores/boardStore.test.ts -t "toast"` | Needs update (Wave 0) |
| DND-01 | tauriBridge.updateIssueMilestone | unit | `npx vitest run src/services/tauriBridge.test.ts -t "updateIssueMilestone"` | Needs update (Wave 0) |
| DND-01 | DragOverlayCard renders correctly | unit | `npx vitest run src/components/DragOverlayCard/DragOverlayCard.test.tsx` | New file (Wave 0) |
| DND-01 | Lane droppable + drop target highlight | unit | `npx vitest run src/components/Lane/Lane.test.tsx -t "droppable"` | Needs update (Wave 0) |
| DND-01 | IssueCard sortable + click/drag coexist | unit | `npx vitest run src/components/IssueCard/IssueCard.test.tsx -t "sortable"` | Needs update (Wave 0) |
| DND-01 | Rust update_issue_milestone command | unit | `cd src-tauri && cargo test update_issue_milestone` | New tests (Wave 0) |

### Sampling Rate
- **Per task commit:** `npx vitest run` (frontend) + `cd src-tauri && cargo test` (Rust)
- **Per wave merge:** Full suite: `npx vitest run && cd src-tauri && cargo test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/components/DragOverlayCard/DragOverlayCard.test.tsx` -- DragOverlayCard rendering
- [ ] `src/components/WarningBadge/WarningBadge.test.tsx` -- WarningBadge + tooltip
- [ ] `src/stores/boardStore.test.ts` -- moveIssue, rollback, multi-milestone tests (追加)
- [ ] `src/services/tauriBridge.test.ts` -- updateIssueMilestone test (追加)
- [ ] `src/components/Lane/Lane.test.tsx` -- droppable zone tests (追加)
- [ ] `src/components/IssueCard/IssueCard.test.tsx` -- sortable + disabled tests (追加)
- [ ] `src-tauri/src/backlog/client.rs` -- update_milestone + fetch_issue tests (追加)
- [ ] sonner mock: `tests/setup.ts` にsonnerのモック追加が必要
- [ ] @dnd-kit mock: テスト内でDndContextをモックまたはラップする戦略が必要

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | 既存: API key via Rust backend |
| V3 Session Management | No | N/A (デスクトップアプリ) |
| V4 Access Control | Yes (部分的) | Backlog APIの権限チェック (サーバーサイド) |
| V5 Input Validation | Yes | Rust側でissueIdOrKeyを検証、フロントエンドでlaneId検証 |
| V6 Cryptography | No | N/A |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| APIキーのWebView露出 | Information Disclosure | APIキーはRust側のみ。フロントエンドには渡さない (既存パターン) |
| 不正なissueId送信 | Tampering | Backlog APIが権限チェック。Rust側でのパラメータ検証 |
| レート制限超過 | Denial of Service | 既存のthrottle_if_needed。PATCH呼び出しも同じクライアント経由 |

## Sources

### Primary (HIGH confidence)
- [npm registry] - @dnd-kit/core 6.3.1, @dnd-kit/sortable 10.0.0, @dnd-kit/utilities 3.2.2, sonner 2.0.7 バージョン確認
- [GitHub: clauderic/dnd-kit MultipleContainers.tsx](https://github.com/clauderic/dnd-kit/blob/master/stories/2%20-%20Presets/Sortable/MultipleContainers.tsx) - 公式 Multiple Containers example
- [dnd-kit docs: Sortable](https://dndkit.com/presets/sortable) - SortableContext, useSortable API
- [dnd-kit docs: DragOverlay](https://dndkit.com/api-documentation/draggable/drag-overlay) - DragOverlay API
- [Backlog API: Update Issue](https://developer.nulab.com/docs/backlog/api/2/update-issue/) - PATCH /api/v2/issues/:issueIdOrKey

### Secondary (MEDIUM confidence)
- [DeepWiki: dnd-kit Multiple Containers](https://deepwiki.com/clauderic/dnd-kit/4.4-multiple-containers) - 実装パターン解説
- [GitHub Discussion #476](https://github.com/clauderic/dnd-kit/discussions/476) - click vs drag discrimination
- [sonner docs](https://sonner.emilkowal.ski/) - Toaster API

### Tertiary (LOW confidence)
- react-beautiful-dnd非推奨化の時期: 正確な日付未確認 [ASSUMED]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - npm registryで全バージョン確認済み。CLAUDE.md指定ライブラリ
- Architecture: HIGH - @dnd-kit公式exampleとドキュメントで検証。既存コードベースのパターンと整合
- Pitfalls: HIGH - 公式ドキュメント、GitHubイシュー、既存コードベースの分析に基づく
- Rust PATCH: MEDIUM - Backlog API仕様は確認済みだが、空milestoneId[]の挙動は要検証(A1)

**Research date:** 2026-04-08
**Valid until:** 2026-05-08 (安定ライブラリのため30日)
