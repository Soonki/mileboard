# Phase 3: Core Kanban Board - Research

**Researched:** 2026-04-08
**Domain:** React UI components (Kanban board), Zustand state management, CSS Modules
**Confidence:** HIGH

## Summary

Phase 3はBacklogのマイルストーンをカンバンレーン（縦カラム・横スクロール）として表示する読み取り専用ボードUIを構築する。Phase 2で実装済みの`fetchBoardData()` IPC関数と`BoardData`型を活用し、新規の`boardStore`（Zustand）でフェッチ状態・データを管理する。コンポーネントはBoardHeader / Board / Lane / LaneHeader / IssueCard / StatusBadge / PriorityIndicator / BoardSkeleton / BoardError / EmptyLaneの10個に分解される。

既存コードベースのパターン（CSS Modules + design tokens、Zustandの個別selector、コンポーネントディレクトリ構造）は確立されており、Phase 3はそれらを忠実に踏襲する。新規技術の導入は不要で、全てReact 19 + Zustand 5 + CSS Modulesの組み合わせで実現可能。

**Primary recommendation:** boardStoreを中心に据え、Board/Lane/IssueCardの3層コンポーネント構成で実装する。UI-SPECの仕様をピクセル単位で忠実に再現し、テストはboardStoreのロジック + 各コンポーネントのレンダリング状態を検証する。

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** 水平スクロールのカラムレイアウト（Trelloスタイル）。各マイルストーンが縦カラム、カラムが横スクロール
- **D-02:** 全レーン固定幅（~280px）。課題数に関わらず一定。将来のDnDドロップターゲット用
- **D-03:** レーンヘッダーにマイルストーン名 + 日付範囲（startDate ~ releaseDueDate）表示。例: "Sprint 2504 (4/1~4/30)"
- **D-04:** コンパクト3行カードレイアウト: Line1=issueKey+statusBadge, Line2=summary(ellipsis), Line3=assignee+priorityIcon
- **D-05:** 優先度表示: 矢印アイコン（▲▲▲ high, ▲▲ medium, ▲ low）+ 色分け（赤/橙/緑）
- **D-06:** ステータスバッジ: Backlogステータス名テキスト。Phase 3では統一グレー背景（色分けはPhase 4）
- **D-07:** 未割り当てレーンは左端（最初のレーン）に配置、マイルストーンレーンの前
- **D-08:** 未割り当てレーンは通常スクロール（stickyではない）
- **D-09:** ヘッダー: 左寄せ"mileboard"タイトル、右寄せのリロードボタン(↻) + 設定ボタン(⚙)
- **D-10:** リロードボタンはfetchBoardData()による手動再取得をトリガー
- **D-11:** スケルトンローディング: レーン・カード形状のグレープレースホルダー + パルスアニメーション
- **D-12:** ワンショットローディング: 全データ到着まで全ボードにスケルトン表示。段階的レンダリングなし
- **D-13:** インラインエラー: ボードエリア中央にエラーメッセージ(日本語) + リトライボタン。ヘッダーは表示維持
- **D-14:** ボードレベルのエラー粒度: いずれかのfetchが失敗したら全ボードをエラー表示

### Claude's Discretion
- カードの正確な寸法と内部スペーシング
- スケルトンアニメーションのタイミングとプレースホルダーカード/レーン数
- スクロール動作の詳細（smooth scroll, scroll snap）
- 空レーンのビジュアル処理（課題0件のマイルストーン）
- boardStore構造（ボード状態のZustandストア）
- コンポーネント分解（Board, Lane, Card, Skeleton, ErrorState）

### Deferred Ideas (OUT OF SCOPE)
なし（議論はフェーズスコープ内に留まった）
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BOARD-01 | プレフィックスに一致するマイルストーンを時系列レーン表示（先月〜6ヶ月先） | Rust backendが既にフィルタ+ソート済みの`milestones[]`を返す。フロントエンドは配列順序をそのまま描画するだけ |
| BOARD-02 | マイルストーン未設定の課題を「未割り当て」レーンに表示 | `BoardData.unassignedIssues`が既にフィルタ済み。左端固定レーンとして描画 |
| BOARD-03 | 各課題カードにキー・タイトル・ステータスバッジ・担当者・優先度を表示 | `BacklogIssue`型が全フィールドを含む。null/undefinedのハンドリング必要（assignee, priority） |
| UX-01 | 初期データ取得中にローディング状態表示 | boardStoreの`status`フィールドでidle/loading/loaded/errorを管理。BoardSkeletonコンポーネント |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **言語:** 日本語で応答、コード識別子・技術用語は英語のまま
- **Immutability:** Zustand `set()` でスプレッド構文による新オブジェクト生成。直接mutation禁止
- **ファイル命名:** `PascalCase.tsx`（コンポーネント）, `camelCase.ts`（サービス）, `Component.module.css`（スタイル）
- **エラー処理:** サービス層は discriminated union `{ success, data?, error? }` を返す。UIは日本語エラーメッセージ
- **テスト:** TDD（RED → GREEN → IMPROVE）。カバレッジ80%以上。テストファイルはソースと同階層
- **Tauri mock:** `tests/setup.ts` でTauriプラグインをグローバルモック
- **アイコン:** 外部アイコンライブラリ不使用、Unicode文字のみ
- **IPC:** `tauriBridge.ts` 経由のみ（直接Tauri API呼び出し禁止）
- **状態管理:** 2つのZustand store（settingsStore + boardStore）
- **スタイリング:** CSS Modules + global.css design tokens

## Standard Stack

### Core（全て既存インストール済み）

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react | 19.2.4 | UIコンポーネント | プロジェクト既存 |
| zustand | 5.0.12 | boardStore状態管理 | プロジェクト既存。settingsStoreと同パターン |
| CSS Modules | built-in | コンポーネントスタイリング | プロジェクト既存。Vite標準サポート |
| vitest | 4.1.3 | テストランナー | プロジェクト既存 |
| @testing-library/react | 16.3.2 | コンポーネントテスト | プロジェクト既存 |

[VERIFIED: npm ls output]

### Supporting（全て既存インストール済み）

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @testing-library/jest-dom | 6.9.1 | DOM matcherの拡張 | テスト内のDOM assertion |
| @testing-library/user-event | 14.6.1 | ユーザーインタラクションシミュレーション | リロード/リトライボタンのテスト |
| jsdom | 29.0.2 | テスト環境のDOM | vitest.config.ts で設定済み |

[VERIFIED: npm ls output]

### Alternatives Considered

なし。Phase 3は新規パッケージの追加が不要。全て既存スタックで実装可能。

**Installation:**
```bash
# 新規インストール不要
```

## Architecture Patterns

### Recommended Component Structure

```
src/
├── stores/
│   └── boardStore.ts           # NEW: ボードデータ + フェッチ状態
├── components/
│   ├── BoardHeader/
│   │   ├── BoardHeader.tsx     # NEW: ヘッダー（タイトル + リロード + 設定）
│   │   └── BoardHeader.module.css
│   ├── Board/
│   │   ├── Board.tsx           # NEW: メインボード（状態分岐 + レーン描画）
│   │   └── Board.module.css
│   ├── Lane/
│   │   ├── Lane.tsx            # NEW: マイルストーンレーン
│   │   └── Lane.module.css
│   ├── LaneHeader/
│   │   ├── LaneHeader.tsx      # NEW: レーンヘッダー（名前 + 日付）
│   │   └── LaneHeader.module.css
│   ├── IssueCard/
│   │   ├── IssueCard.tsx       # NEW: 課題カード（3行レイアウト）
│   │   └── IssueCard.module.css
│   ├── StatusBadge/
│   │   ├── StatusBadge.tsx     # NEW: ステータスバッジ
│   │   └── StatusBadge.module.css
│   ├── PriorityIndicator/
│   │   └── PriorityIndicator.tsx  # NEW: 優先度矢印（CSS Moduleは親に委譲可）
│   ├── BoardSkeleton/
│   │   ├── BoardSkeleton.tsx   # NEW: スケルトンローディング
│   │   └── BoardSkeleton.module.css
│   ├── BoardError/
│   │   ├── BoardError.tsx      # NEW: エラー表示 + リトライ
│   │   └── BoardError.module.css
│   ├── EmptyLane/
│   │   └── EmptyLane.tsx       # NEW: 空レーン表示（「課題なし」）
│   ├── BoardPlaceholder/       # REMOVE: Phase 3で置き換え
│   └── ... (existing Phase 1 components)
└── App.tsx                     # MODIFY: BoardPlaceholder → Board/BoardHeader
```

### Pattern 1: boardStore（Zustandストア）

**What:** ボードデータ（milestones + unassignedIssues）とフェッチ状態を管理するストア
**When to use:** Board関連の全コンポーネントから参照

```typescript
// Source: settingsStore.ts の既存パターンに準拠 [VERIFIED: codebase]
import { create } from 'zustand';
import type { BoardData } from '../types/board';

type BoardStatus = 'idle' | 'loading' | 'loaded' | 'error';

interface BoardStoreState {
  status: BoardStatus;
  data: BoardData | null;
  error: string | null;

  fetchBoard: () => Promise<void>;
  reset: () => void;
}

export const useBoardStore = create<BoardStoreState>()((set, get) => ({
  status: 'idle',
  data: null,
  error: null,

  fetchBoard: async () => {
    // settingsStoreから接続パラメータを取得
    const { settings } = useSettingsStore.getState();
    const currentStatus = get().status;

    // 初回ロード vs リロードの分岐
    if (currentStatus !== 'loaded') {
      set({ status: 'loading', error: null });
    }
    // loaded状態からのリロードはstatusを変えない（D-12: 既存ボード表示維持）

    try {
      const data = await fetchBoardData(
        settings.hostUrl,
        settings.apiKey,
        settings.projectKey,
        settings.milestonePrefix,
      );
      set({ status: 'loaded', data, error: null });
    } catch (err: unknown) {
      const message = typeof err === 'string' ? err : 'データの取得に失敗しました';
      set({ status: 'error', data: null, error: message });
    }
  },

  reset: () => set({ status: 'idle', data: null, error: null }),
}));
```

**Key design decisions:**
- `status`はdiscriminated union的な4状態。`isLoading`/`isError`のようなboolean多重管理を避ける
- リロード時（`status === 'loaded'`）は`status`を`loading`に変えない。ユーザーが既存データを見続けられる（UI-SPEC Interaction Contract参照）
- `useSettingsStore.getState()`で外部ストアを直接参照。Zustand公式パターン [ASSUMED]
- tauriBridgeの`fetchBoardData`はエラー時に文字列をthrowする（日本語メッセージ）

### Pattern 2: リロードフロー

**What:** リロードボタンによるデータ再取得のUI状態遷移
**When to use:** Board + BoardHeader間の状態連携

```
[ユーザーがリロードボタン押下]
  → boardStore: isReloading = true（追加フラグ）
  → BoardHeader: リロードアイコンがスピンアニメーション + disabled
  → Board: 既存コンテンツ表示維持（スケルトンに切り替えない）
  → fetchBoard() 成功
    → boardStore: data更新, isReloading = false
    → Board: 新データで再レンダリング
  → fetchBoard() 失敗
    → boardStore: status = 'error', isReloading = false
    → Board: BoardError表示
```

boardStoreに`isReloading: boolean`フラグを追加して、初回ロードとリロードを区別する。

```typescript
// リロード対応のfetchBoard
fetchBoard: async () => {
  const { settings } = useSettingsStore.getState();
  const { status } = get();

  if (status === 'loaded') {
    // リロード: 既存データ維持
    set({ isReloading: true, error: null });
  } else {
    // 初回ロード
    set({ status: 'loading', error: null, isReloading: false });
  }

  try {
    const data = await fetchBoardData(/* ... */);
    set({ status: 'loaded', data, error: null, isReloading: false });
  } catch (err: unknown) {
    const message = typeof err === 'string' ? err : 'データの取得に失敗しました';
    set({ status: 'error', data: null, error: message, isReloading: false });
  }
},
```

### Pattern 3: 日付フォーマット

**What:** マイルストーンのstartDate/releaseDueDateを "M/D~M/D" 形式に変換
**When to use:** LaneHeaderでの日付範囲表示

```typescript
// Source: Rust backend types.rs [VERIFIED: codebase]
// Backlog API dates come as "YYYY-MM-DD" strings (nullable)
// Format to "M/D~M/D" for Japanese locale display

function formatDateRange(startDate: string | null, releaseDueDate: string | null): string | null {
  if (!startDate && !releaseDueDate) return null;

  const formatDate = (dateStr: string): string => {
    const [, month, day] = dateStr.split('-');
    return `${parseInt(month, 10)}/${parseInt(day, 10)}`;
  };

  if (startDate && releaseDueDate) {
    return `${formatDate(startDate)}~${formatDate(releaseDueDate)}`;
  }
  if (startDate) {
    return `${formatDate(startDate)}~`;
  }
  return `~${formatDate(releaseDueDate!)}`;
}
```

**Important:** Backlog APIの日付は`"YYYY-MM-DD"`形式の文字列。Rust backendsの`is_milestone_in_range`が同じフォーマットを`NaiveDate::parse_from_str(s, "%Y-%m-%d")`で解析している [VERIFIED: client.rs line 429]。

### Pattern 4: コンポーネントプロップス設計

**What:** 各コンポーネントのProps interface
**When to use:** コンポーネント間のデータ受け渡し

```typescript
// Board: storeから直接読み取り（propsなし）
// Boardが状態分岐を担当
function Board() {
  const status = useBoardStore(s => s.status);
  const data = useBoardStore(s => s.data);
  const error = useBoardStore(s => s.error);

  if (status === 'loading') return <BoardSkeleton />;
  if (status === 'error') return <BoardError message={error!} />;
  if (!data) return null;
  return <BoardContent data={data} />;
}

// Lane: propsで受け取り（純粋表示コンポーネント）
interface LaneProps {
  title: string;
  dateRange: string | null;  // null = 未割り当てレーン
  issues: BacklogIssue[];
}

// IssueCard: propsで受け取り
interface IssueCardProps {
  issue: BacklogIssue;
}
```

### Anti-Patterns to Avoid

- **直接Tauri APIコール禁止:** `invoke()`をコンポーネントから直接呼ばない。必ず`tauriBridge.ts`経由 [VERIFIED: CLAUDE.md]
- **ストアの過剰購読:** `useBoardStore()`で全体を購読しない。`useBoardStore(s => s.status)`のように個別selector使用 [VERIFIED: settingsStore.ts の既存パターン]
- **CSS変数のハードコード禁止:** `color: #111827`ではなく`color: var(--color-text-primary)`を使用 [VERIFIED: global.css + existing CSS Modules]
- **boolean多重管理禁止:** `isLoading && !isError`のような組み合わせではなく、`status: 'loading' | 'loaded' | 'error' | 'idle'`で管理
- **プレースホルダーテキストの英語化禁止:** 全UIテキストは日本語 [VERIFIED: CLAUDE.md]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 状態管理 | useReducer + useContext | Zustand store | プロジェクト標準、既存パターンあり |
| CSSスコーピング | styled-components / Tailwind | CSS Modules | プロジェクト標準、追加依存なし |
| 日付ライブラリ | date-fns / dayjs | 単純文字列パース | "YYYY-MM-DD"→"M/D"変換は3行で済む。ライブラリ不要 |
| スケルトンUI | react-loading-skeleton | CSS animation | 4レーン x 3カード = 12個のdiv。ライブラリは過剰 |
| アイコン | react-icons / lucide | Unicode文字 | CLAUDE.md で外部アイコンライブラリ不使用と明記 |

**Key insight:** Phase 3は純粋なUI表示フェーズ。データ取得（Phase 2完了）もDnD（Phase 5）も不要。CSS Modules + Zustand + 既存型定義だけで全機能が実装可能。

## Common Pitfalls

### Pitfall 1: リロード時のUI状態遷移ミス

**What goes wrong:** リロードボタン押下時にスケルトンに切り替えてしまい、ユーザーが現在のボード状態を見失う
**Why it happens:** 初回ロードとリロードの状態遷移を区別しないfetchBoard実装
**How to avoid:** `isReloading`フラグを別に持ち、`status`が`loaded`の場合はスケルトンに切り替えない。リロードアイコンのスピンだけで「読み込み中」を示す
**Warning signs:** リロードボタンを押すと画面が一瞬スケルトンになる

### Pitfall 2: null/undefinedフィールドのハンドリング漏れ

**What goes wrong:** `issue.assignee.name`でundefinedアクセスしてランタイムエラー
**Why it happens:** BacklogIssueの`assignee`と`priority`はnullable。TypeScript型定義で`| null`と宣言されているが、テンプレート内でオプショナルチェインを忘れる
**How to avoid:** IssueCardで`issue.assignee?.name ?? '---'`、`issue.priority`のnullチェック。PriorityIndicatorはpriority===nullで何も表示しない
**Warning signs:** "Cannot read properties of null"エラー

### Pitfall 3: CSS Modules + global.css tokenの不整合

**What goes wrong:** design tokenと異なるハードコード値を使い、将来のテーマ変更で不整合が発生
**Why it happens:** UI-SPECの具体値（280px, 56pxなど）をそのままハードコードする誘惑
**How to avoid:** 固定値（280px lane width, 56px header height）は明示的にコメント付きでハードコード。色・スペーシング・フォントサイズは必ずCSS変数を使う
**Warning signs:** `grep -r '#[0-9a-fA-F]' *.module.css`で直接カラーコードが見つかる

### Pitfall 4: App.tsx の⚙ボタン移設漏れ

**What goes wrong:** 既存App.tsxの⚙ボタン（inline style）がBoardHeaderに移動されず、2つの⚙ボタンが表示される
**Why it happens:** App.tsx lines 22-44にある既存の⚙ボタンを削除し忘れる
**How to avoid:** App.tsxの修正タスクでは、(1)⚙ボタン削除、(2)BoardPlaceholder削除、(3)Board+BoardHeaderの挿入を1つのタスクにまとめる
**Warning signs:** 画面右上に⚙ボタンが2つ表示される

### Pitfall 5: テスト時のZustandストアリセット漏れ

**What goes wrong:** テスト間でboardStoreの状態が漏洩し、テスト結果が不安定になる
**Why it happens:** Zustand storeはモジュールスコープのシングルトン。beforeEachでリセットしないと前テストの状態が残る
**How to avoid:** 各テストファイルのbeforeEachで`useBoardStore.setState({ ... defaultState })`を呼ぶ。settingsStore.test.tsxの既存パターンに従う
**Warning signs:** テストが個別実行では通るが、全体実行で失敗する

### Pitfall 6: BacklogIssue.priority.idのマッピング間違い

**What goes wrong:** 優先度IDとアイコンのマッピングが正しくない
**Why it happens:** Backlog APIのpriority IDは2=高, 3=中, 4=低。直感に反する（1から始まらない、降順でもない）
**How to avoid:** UI-SPECのPriorityIndicator仕様に明記されたID→表示マッピングをそのまま使う。switch文で明示的にマッピングする
**Warning signs:** 高優先度の課題に▲1つ、低優先度の課題に▲3つ表示される

## Code Examples

### boardStore完全実装

```typescript
// Source: settingsStore.ts pattern + CONTEXT.md decisions [VERIFIED: codebase]
import { create } from 'zustand';
import type { BoardData } from '../types/board';
import { fetchBoardData } from '../services/tauriBridge';
import { useSettingsStore } from './settingsStore';

type BoardStatus = 'idle' | 'loading' | 'loaded' | 'error';

interface BoardStoreState {
  status: BoardStatus;
  data: BoardData | null;
  error: string | null;
  isReloading: boolean;

  fetchBoard: () => Promise<void>;
  reset: () => void;
}

export const useBoardStore = create<BoardStoreState>()((set, get) => ({
  status: 'idle',
  data: null,
  error: null,
  isReloading: false,

  fetchBoard: async () => {
    const { settings } = useSettingsStore.getState();
    const currentStatus = get().status;

    if (currentStatus === 'loaded') {
      set({ isReloading: true, error: null });
    } else {
      set({ status: 'loading', error: null, isReloading: false });
    }

    try {
      const data = await fetchBoardData(
        settings.hostUrl,
        settings.apiKey,
        settings.projectKey,
        settings.milestonePrefix,
      );
      set({ status: 'loaded', data, error: null, isReloading: false });
    } catch (err: unknown) {
      const message = typeof err === 'string' ? err : 'データの取得に失敗しました';
      set({ status: 'error', data: null, error: message, isReloading: false });
    }
  },

  reset: () => set({ status: 'idle', data: null, error: null, isReloading: false }),
}));
```

### IssueCardコンポーネント

```typescript
// Source: UI-SPEC + CONTEXT.md D-04, D-05, D-06 [VERIFIED: UI-SPEC]
import type { BacklogIssue } from '../../types/backlog';
import { StatusBadge } from '../StatusBadge/StatusBadge';
import { PriorityIndicator } from '../PriorityIndicator/PriorityIndicator';
import styles from './IssueCard.module.css';

interface IssueCardProps {
  issue: BacklogIssue;
}

export function IssueCard({ issue }: IssueCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.line1}>
        <span className={styles.issueKey}>{issue.issueKey}</span>
        <StatusBadge name={issue.status.name} />
      </div>
      <div className={styles.line2}>
        {issue.summary}
      </div>
      <div className={styles.line3}>
        <span className={styles.assignee}>
          {issue.assignee?.name ?? '---'}
        </span>
        <PriorityIndicator priority={issue.priority} />
      </div>
    </div>
  );
}
```

### PriorityIndicatorコンポーネント

```typescript
// Source: UI-SPEC PriorityIndicator spec [VERIFIED: UI-SPEC]
import type { BacklogPriority } from '../../types/backlog';

interface PriorityIndicatorProps {
  priority: BacklogPriority | null;
}

const PRIORITY_CONFIG: Record<number, { arrows: string; className: string }> = {
  2: { arrows: '\u25B2\u25B2\u25B2', className: 'high' },    // ▲▲▲
  3: { arrows: '\u25B2\u25B2', className: 'medium' },          // ▲▲
  4: { arrows: '\u25B2', className: 'low' },                    // ▲
};

export function PriorityIndicator({ priority }: PriorityIndicatorProps) {
  if (!priority) return null;
  const config = PRIORITY_CONFIG[priority.id];
  if (!config) return null;
  return (
    <span className={`priority ${config.className}`}>
      {config.arrows}
    </span>
  );
}
```

### global.css追加トークン

```css
/* Source: UI-SPEC New CSS Tokens Required [VERIFIED: UI-SPEC] */
/* Phase 3 additions to :root */
--color-warning: #F59E0B;
--color-skeleton: #E5E7EB;
--color-skeleton-shine: #F3F4F6;
--shadow-lane: 0 1px 2px rgba(0, 0, 0, 0.05);
--radius-badge: 4px;
```

### スケルトンアニメーション

```css
/* Source: UI-SPEC BoardSkeleton spec [VERIFIED: UI-SPEC] */
@keyframes pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}

.skeleton {
  background-color: var(--color-skeleton);
  border-radius: var(--radius-input);
  animation: pulse 1.5s ease-in-out infinite;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Zustand 4 middleware | Zustand 5 vanilla (no middleware needed) | 2024 | `create<T>()(fn)` パターン。middlewareなしでシンプル |
| React.FC component type | function declaration | React 18+ | `React.FC`は不要。CLAUDE.mdのTypeScript rulesでも確認 |
| CSS-in-JS (styled-components) | CSS Modules | Project convention | ランタイムコストゼロ、Vite標準サポート |

**Deprecated/outdated:**
- `React.FC` type annotation: 使用しない [VERIFIED: TypeScript rules]
- `any` type: `unknown`を使用して型安全にnarrowする [VERIFIED: TypeScript rules]
- `console.log`: 本番コードに含めない [VERIFIED: TypeScript hooks]

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.3 + @testing-library/react 16.3.2 |
| Config file | `vitest.config.ts` (jsdom environment, tests/setup.ts) |
| Quick run command | `npx vitest run src/{target}` |
| Full suite command | `npx vitest run` |

[VERIFIED: vitest.config.ts, package.json]

### Phase Requirements --> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BOARD-01 | マイルストーンがレーンとして表示される | unit | `npx vitest run src/components/Board/Board.test.tsx -x` | Wave 0 |
| BOARD-02 | 未割り当てレーンが左端に表示される | unit | `npx vitest run src/components/Board/Board.test.tsx -x` | Wave 0 |
| BOARD-03 | カードにkey, title, status, assignee, priorityが表示される | unit | `npx vitest run src/components/IssueCard/IssueCard.test.tsx -x` | Wave 0 |
| UX-01 | ローディング中にスケルトンが表示される | unit | `npx vitest run src/components/Board/Board.test.tsx -x` | Wave 0 |
| STORE-01 | fetchBoard()が正しい状態遷移を行う | unit | `npx vitest run src/stores/boardStore.test.ts -x` | Wave 0 |
| STORE-02 | リロード時に既存データを維持する | unit | `npx vitest run src/stores/boardStore.test.ts -x` | Wave 0 |
| UI-HEADER | リロードボタンがfetchBoard()を呼ぶ | unit | `npx vitest run src/components/BoardHeader/BoardHeader.test.tsx -x` | Wave 0 |
| UI-ERROR | エラー時にリトライボタンが表示される | unit | `npx vitest run src/components/BoardError/BoardError.test.tsx -x` | Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run src/components/{changed} -x`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src/stores/boardStore.test.ts` -- boardStoreの状態遷移テスト
- [ ] `src/components/Board/Board.test.tsx` -- Board状態分岐テスト（loading/loaded/error）
- [ ] `src/components/IssueCard/IssueCard.test.tsx` -- カードフィールド表示テスト
- [ ] `src/components/BoardHeader/BoardHeader.test.tsx` -- リロードボタンテスト
- [ ] `src/components/BoardError/BoardError.test.tsx` -- エラー表示 + リトライテスト
- [ ] `src/components/Lane/Lane.test.tsx` -- レーン描画テスト
- [ ] `src/components/StatusBadge/StatusBadge.test.tsx` -- バッジ表示テスト
- [ ] `src/components/PriorityIndicator/PriorityIndicator.test.tsx` -- 優先度マッピングテスト

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Phase 1で処理済み（API key保存） |
| V3 Session Management | no | デスクトップアプリ、セッション概念なし |
| V4 Access Control | no | 単一ユーザー、ロールなし |
| V5 Input Validation | yes | boardStoreでAPIレスポンスの型チェック（TypeScript型 + nullable handling） |
| V6 Cryptography | no | Phase 3ではなし |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS via issue summary | Tampering | React JSXがデフォルトでエスケープ。dangerouslySetInnerHTML不使用 |
| APIキーの画面表示 | Information Disclosure | boardStoreはAPIキーを保持しない。settingsStoreからの一時取得のみ |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `useSettingsStore.getState()`でZustand外部ストアを同期的に参照可能 | Architecture Patterns - Pattern 1 | LOW: Zustand公式ドキュメントで推奨されるパターン。代替は引数渡し |
| A2 | BacklogのpriorittyID 2=高, 3=中, 4=低 | Pitfall 6 | MEDIUM: UI-SPECに明記済みだが、Backlog APIドキュメントとの照合は未実施。テストデータで検証可能 |
| A3 | CSS Modulesのcomposesは不使用（各コンポーネント独立） | Architecture Patterns | LOW: composes使用は可能だが不要 |

## Open Questions

1. **リロード中のエラーハンドリング**
   - What we know: D-14でエラー時は全ボードエラー表示。リロード時もこの挙動
   - What's unclear: リロード中に新しいエラーが発生した場合、既存データを破棄してエラー表示するかどうか
   - Recommendation: CONTEXT.md D-14に従い、リロード失敗時もBoardError表示に遷移する。UI-SPEC Interaction Contractの「Reloading → Error: BoardError replaces board content」で確認済み

2. **未割り当てレーンの日付表示**
   - What we know: UI-SPEC LaneHeader specで「Unassigned lane header: name = "未割り当て", no date range line」と明記
   - What's unclear: なし（解決済み）
   - Recommendation: LaneHeaderコンポーネントでdateRange===nullの場合、日付行を非表示にする

## Sources

### Primary (HIGH confidence)
- `src/types/board.ts` - BoardData, MilestoneWithIssues型定義
- `src/types/backlog.ts` - BacklogIssue, BacklogMilestone, BacklogPriority型定義
- `src/services/tauriBridge.ts` - fetchBoardData() IPC proxy
- `src/stores/settingsStore.ts` - Zustand storeパターンの参考実装
- `src/global.css` - design tokens（spacing, colors, typography, radii, transitions）
- `src/App.tsx` - 現在のApp構造（⚙ボタン, BoardPlaceholder）
- `src-tauri/src/backlog/types.rs` - Rust側のBoardData構造（camelCase serialization）
- `src-tauri/src/backlog/client.rs` - 日付フォーマット確認（%Y-%m-%d）
- `.planning/phases/03-core-kanban-board/03-CONTEXT.md` - Phase 3の全決定事項
- `.planning/phases/03-core-kanban-board/03-UI-SPEC.md` - UI仕様契約

### Secondary (MEDIUM confidence)
- `npm ls` output - パッケージバージョン確認（React 19.2.4, Zustand 5.0.12, Vitest 4.1.3）
- `package.json` - 依存関係定義
- `vitest.config.ts` - テスト環境設定（jsdom, setup file）
- `tests/setup.ts` - Tauri mockパターン

### Tertiary (LOW confidence)
なし

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - 全パッケージ既存インストール、バージョン確認済み
- Architecture: HIGH - 既存パターン（settingsStore, CSS Modules）の拡張。新規概念なし
- Pitfalls: HIGH - 実コードベースから特定。全てコードレベルで検証可能

**Research date:** 2026-04-08
**Valid until:** 2026-05-08 (30 days - 安定したスタック、外部依存なし)
