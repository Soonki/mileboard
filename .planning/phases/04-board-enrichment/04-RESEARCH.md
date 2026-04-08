# Phase 4: Board Enrichment - Research

**Researched:** 2026-04-08
**Domain:** React UI enrichment (status colors, statistics, browser navigation)
**Confidence:** HIGH

## Summary

Phase 4はPhase 3で構築した読み取り専用ボードに視覚的な情報強化を加えるフェーズである。対象は4つの要件: ステータスカラーコーディング(BOARD-04)、レーン課題数表示(BOARD-05)、メンバー別内訳表示(BOARD-06)、カードクリックによるブラウザ遷移(UX-03)。

既存コードベースの調査により、全ての変更対象コンポーネント(`StatusBadge`, `IssueCard`, `LaneHeader`)は既に存在し、型定義(`BacklogStatus.color`, `BacklogIssue.assignee`)も揃っていることを確認した。`@tauri-apps/plugin-opener`はインストール済み(v2.5.3)で、Rust側のプラグイン登録・Tauriケーパビリティ(`opener:default`)も設定済み。新規ライブラリの追加は不要。

**Primary recommendation:** 既存コンポーネントの拡張のみで実装可能。外部依存の追加なし。luminanceコントラスト計算は20行程度の純関数ユーティリティとして自作(WCAG 2.0準拠)。

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Use `BacklogStatus.color` directly from the Backlog API as the color source. No custom palette mapping. This ensures consistency with Backlog's own UI and automatically supports custom statuses.
- **D-02:** Apply color to StatusBadge background only. Card body remains white background. Badge text color should auto-contrast (white or dark) based on background luminance.
- **D-03:** Toggle-expandable display in lane header. Default state is collapsed (shows issue count only). Click to expand and reveal member-by-member breakdown. Click again to collapse.
- **D-04:** Member breakdown sorted by issue count descending. Unassigned issues shown last with "未割当" label.
- **D-05:** Hover highlight + click ripple animation + pointer cursor for visual feedback.
- **D-06:** Use `tauri-plugin-opener` to open `https://{host}/view/{issueKey}` in the user's default browser. Host URL comes from `settingsStore.hostUrl`.
- **D-07:** Phase 4 implements onClick only. Phase 5 will add DnD and adjust click vs drag detection logic at that time. No preemptive DnD-compatible event handling needed now.
- **D-08:** Issue count displayed next to milestone name in parentheses (e.g., "Sprint 2504 (6)"). Toggle button positioned at the right end of the header row.

### Claude's Discretion
- Exact ripple animation timing and style
- Badge text color contrast algorithm details (WCAG-compliant luminance check)
- Toggle animation (smooth expand/collapse transition)
- Member breakdown text formatting details (truncation for long names)
- Component decomposition for new header elements (MemberBreakdown subcomponent, etc.)

### Deferred Ideas (OUT OF SCOPE)
- カードのグルーピングと一括移動 (PWR-02)
- フィルタリング (FILT-01)
- Sanitize host URL input (Phase 1 scope)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BOARD-04 | Cards are color-coded by status for visual distinction | `BacklogStatus.color`フィールド(hex形式、例: `#ed8077`)が既に型定義に存在。StatusBadgeにcolor propを追加し、CSS inline styleでbackgroundを設定。テキストコントラストはWCAG luminance計算で白/黒を自動選択 |
| BOARD-05 | Lane headers display total issue count | LaneHeaderにissues配列(または事前計算されたcount)を渡し、マイルストーン名の横に括弧で表示。Lane→LaneHeaderのprops拡張が必要 |
| BOARD-06 | Lane headers display member-by-member issue count breakdown | issues配列からassignee別に集計するユーティリティ関数を作成。トグル展開/折りたたみUIをLaneHeaderに追加。MemberBreakdownサブコンポーネントとして分離推奨 |
| UX-03 | Clicking a card opens the Backlog issue in the default browser | `@tauri-apps/plugin-opener`の`openUrl()`を使用。URLは`https://{hostUrl}/view/{issueKey}`。tauriBridge経由ではなく直接import(フロントエンドのみで完結するAPI) |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **言語:** 日本語で応答。コード識別子・技術用語は英語可
- **Immutability:** Zustand `set()` でスプレッド構文。直接mutation禁止
- **ファイル命名:** `PascalCase.tsx`(コンポーネント)、`camelCase.ts`(サービス)、`Component.module.css`(スタイル)
- **エラー処理:** discriminated union `{ success, data?, error? }`。UIは日本語エラーメッセージ
- **テスト:** TDD (RED -> GREEN -> IMPROVE)。カバレッジ80%以上。テストファイルはソースと同階層
- **Tauri mock:** `tests/setup.ts` でTauriプラグインをグローバルモック
- **アイコン:** 外部アイコンライブラリ不使用、Unicode文字のみ(トグルボタンは▼/▲)
- **CSS Modules:** built-in。外部CSSフレームワーク不使用
- **DnD:** Phase 4ではonClickのみ。DnD対応のイベントハンドリング不要(D-07)

## Standard Stack

### Core (既存 -- 追加不要)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.1.x | UI framework | 既存プロジェクト標準 [VERIFIED: package.json] |
| TypeScript | 5.8.x | 型安全性 | 既存プロジェクト標準 [VERIFIED: package.json] |
| Zustand | 5.0.x | State管理 | 既存プロジェクト標準。settingsStore.hostUrlの参照に使用 [VERIFIED: package.json] |
| CSS Modules | built-in | スタイリング | Vite built-in。既存全コンポーネントで使用 [VERIFIED: codebase] |
| @tauri-apps/plugin-opener | 2.5.3 | URL open | ブラウザでBacklog課題を開く。既にインストール・登録済み [VERIFIED: npm registry, package.json] |

### Supporting (既存 -- 追加不要)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vitest | 4.1.x | テストフレームワーク | 全ユニットテスト [VERIFIED: npm registry] |
| @testing-library/react | 16.3.x | React テスト | コンポーネントレンダリングテスト [VERIFIED: npm registry] |
| @testing-library/user-event | 14.6.x | ユーザーインタラクション | click, hoverのテスト [VERIFIED: npm registry] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| 自作luminance関数 | color-contrast-checker等のnpmライブラリ | 20行程度の純関数で十分。外部依存追加の価値なし |
| CSS Modules inline style (color) | CSS custom properties via style attr | BacklogStatus.colorは動的値のためinline styleが最適 |

**Installation:**
```bash
# 新規インストール不要。全依存は既にpackage.jsonに存在
```

## Architecture Patterns

### 変更対象ファイル構成
```
src/
├── components/
│   ├── StatusBadge/
│   │   ├── StatusBadge.tsx          # color prop追加、inline style
│   │   ├── StatusBadge.module.css   # 動的背景色対応
│   │   └── StatusBadge.test.tsx     # カラー表示テスト追加
│   ├── IssueCard/
│   │   ├── IssueCard.tsx            # onClick + color伝播
│   │   ├── IssueCard.module.css     # hover/ripple/cursor追加
│   │   └── IssueCard.test.tsx       # click, hover テスト追加
│   ├── LaneHeader/
│   │   ├── LaneHeader.tsx           # issueCount + toggle + breakdown
│   │   ├── LaneHeader.module.css    # expandable layout
│   │   └── LaneHeader.test.tsx      # 新規作成
│   ├── MemberBreakdown/             # 新規コンポーネント
│   │   ├── MemberBreakdown.tsx      # メンバー別内訳リスト
│   │   ├── MemberBreakdown.module.css
│   │   └── MemberBreakdown.test.tsx
│   └── Lane/
│       ├── Lane.tsx                 # issues count/arrayをLaneHeaderへ渡す
│       └── Lane.test.tsx            # 更新
├── utils/
│   ├── colorContrast.ts             # 新規: luminance計算ユーティリティ
│   └── colorContrast.test.ts        # 新規: テスト
└── services/
    └── tauriBridge.ts               # 変更不要 (openerは直接import)
```

### Pattern 1: StatusBadge動的カラー

**What:** Backlog APIから取得したhexカラーをStatusBadgeの背景色に直接適用し、テキスト色をluminanceに基づいて自動決定する。
**When to use:** `BacklogStatus.color`が存在する全てのステータス表示箇所。

```typescript
// StatusBadge.tsx -- 拡張後のイメージ
interface StatusBadgeProps {
  name: string;
  color?: string; // hex color from BacklogStatus.color, e.g. "#ed8077"
}

export function StatusBadge({ name, color }: StatusBadgeProps) {
  const badgeStyle = color
    ? {
        backgroundColor: color,
        color: getContrastTextColor(color), // '#ffffff' or '#000000'
        borderColor: 'transparent',
      }
    : undefined;

  return (
    <span className={styles.badge} style={badgeStyle} aria-label={name}>
      {name}
    </span>
  );
}
```
[VERIFIED: 既存StatusBadge.tsxの構造から拡張パターンを設計]

### Pattern 2: WCAG Luminance コントラスト計算

**What:** hex色コードから相対輝度を計算し、テキスト色を白か黒に決定する。
**When to use:** StatusBadgeのテキスト色自動決定。

```typescript
// utils/colorContrast.ts
// Source: WCAG 2.0 G17 spec (https://www.w3.org/TR/WCAG20-TECHS/G17.html)

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

function relativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

export function getContrastTextColor(hexColor: string): string {
  const [r, g, b] = hexToRgb(hexColor);
  const luminance = relativeLuminance(r, g, b);
  // Threshold 0.179 gives ~4.5:1 contrast ratio against both white and black
  return luminance > 0.179 ? '#000000' : '#ffffff';
}
```
[CITED: https://www.w3.org/TR/WCAG20-TECHS/G17.html]

### Pattern 3: LaneHeader トグル展開

**What:** レーンヘッダに課題数表示とメンバー別内訳のトグル展開UIを追加する。
**When to use:** 全レーンヘッダ。

```typescript
// LaneHeader.tsx -- 拡張後のイメージ
interface LaneHeaderProps {
  name: string;
  startDate: string | null;
  releaseDueDate: string | null;
  issueCount: number;
  memberBreakdown: MemberCount[];
}

interface MemberCount {
  name: string;
  count: number;
}

export function LaneHeader({
  name, startDate, releaseDueDate, issueCount, memberBreakdown,
}: LaneHeaderProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={styles.header}>
      <div className={styles.titleRow}>
        <div className={styles.name}>
          {name} ({issueCount})
        </div>
        {memberBreakdown.length > 0 && (
          <button
            className={styles.toggleButton}
            onClick={() => setIsExpanded((prev) => !prev)}
            aria-expanded={isExpanded}
            aria-label={isExpanded ? '内訳を閉じる' : '内訳を開く'}
          >
            {isExpanded ? '\u25B2' : '\u25BC'}
          </button>
        )}
      </div>
      {dateRange && <div className={styles.dateRange}>{dateRange}</div>}
      {isExpanded && (
        <MemberBreakdown members={memberBreakdown} />
      )}
    </div>
  );
}
```
[VERIFIED: 既存LaneHeader.tsxの構造から拡張パターンを設計]

### Pattern 4: Card Click → Browser Open

**What:** IssueCardクリック時に`@tauri-apps/plugin-opener`でBacklog課題ページを開く。
**When to use:** 全IssueCard。

```typescript
// IssueCard.tsx -- onClick追加
import { openUrl } from '@tauri-apps/plugin-opener';
import { useSettingsStore } from '../../stores/settingsStore';

export function IssueCard({ issue }: IssueCardProps) {
  const hostUrl = useSettingsStore((s) => s.settings.hostUrl);

  const handleClick = async () => {
    const url = `https://${hostUrl}/view/${issue.issueKey}`;
    try {
      await openUrl(url);
    } catch {
      // opener failure is non-critical -- silently ignore
    }
  };

  return (
    <div
      className={styles.card}
      onClick={handleClick}
      role="link"
      aria-label={`${issue.issueKey}をBacklogで開く`}
    >
      {/* ... existing card content ... */}
    </div>
  );
}
```
[VERIFIED: @tauri-apps/plugin-opener API: `openUrl(url: string): Promise<void>`]
[VERIFIED: capabilities/default.json に `opener:default` 権限設定済み]

### Pattern 5: メンバー別集計ユーティリティ

**What:** issues配列からassignee別のカウントを算出する純関数。
**When to use:** Lane → LaneHeader のprops計算。

```typescript
// Lane.tsx 内、またはユーティリティとして切り出し
interface MemberCount {
  name: string;
  count: number;
}

function computeMemberBreakdown(issues: BacklogIssue[]): MemberCount[] {
  const counts = new Map<string, number>();
  let unassignedCount = 0;

  for (const issue of issues) {
    if (issue.assignee !== null) {
      const name = issue.assignee.name;
      counts.set(name, (counts.get(name) ?? 0) + 1);
    } else {
      unassignedCount += 1;
    }
  }

  const sorted = [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count); // D-04: descending by count

  if (unassignedCount > 0) {
    sorted.push({ name: '未割当', count: unassignedCount }); // D-04: unassigned last
  }

  return sorted;
}
```
[VERIFIED: BacklogIssue.assignee: BacklogUser | null -- 型定義確認済み]

### Anti-Patterns to Avoid

- **StatusBadgeでのCSSクラス切り替え:** ステータス名からCSSクラスへのマッピングは禁止(D-01)。API colorを直接使うことでカスタムステータスも自動対応
- **tauriBridgeラッパー経由のopenUrl:** openerはIPC不要のフロントエンドAPI。tauriBridge.tsに追加する必要なし
- **DnD互換のイベントハンドリング:** Phase 4ではonClickのみ。onMouseDown/onMouseUp等のDnD対応は不要(D-07)
- **ヘッダー内でのissues配列直接参照:** LaneHeaderは集計済みデータ(count, memberBreakdown)をpropsで受け取るべき。集計ロジックをヘッダー内に置かない

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| ブラウザでURL開く | window.open() / Rust IPC | `@tauri-apps/plugin-opener` の `openUrl()` | Tauriのセキュリティモデル内で動作。window.openはWebViewでブロックされる可能性あり [VERIFIED: CLAUDE.md] |
| カラーコントラスト | 目視によるハードコード | WCAG luminance計算関数 | 20行程度で実装可能。Backlogのカスタムステータスカラーに対応必須 [CITED: WCAG 2.0 G17] |

**Key insight:** このフェーズは外部ライブラリ追加なしで完結する。全ての機能は既存依存 + 小さなユーティリティ関数で実装可能。

## Common Pitfalls

### Pitfall 1: openUrl のTauriモック不足
**What goes wrong:** テスト環境で`@tauri-apps/plugin-opener`がモックされておらず、テスト実行時にエラーになる。
**Why it happens:** `tests/setup.ts`は`@tauri-apps/api/core`、`plugin-http`、`plugin-store`をモックしているが、`plugin-opener`はまだモックされていない。
**How to avoid:** `tests/setup.ts`に`@tauri-apps/plugin-opener`のモックを追加する。
**Warning signs:** IssueCard clickテストが `Cannot find module '@tauri-apps/plugin-opener'` で失敗。

```typescript
// tests/setup.ts に追加
vi.mock('@tauri-apps/plugin-opener', () => ({
  openUrl: vi.fn().mockResolvedValue(undefined),
}));
```
[VERIFIED: tests/setup.tsの現在のモック内容を確認済み]

### Pitfall 2: hostUrl の形式不整合
**What goes wrong:** `settingsStore.hostUrl`が`https://example.backlog.com`形式で保存されている場合、URLが`https://https://example.backlog.com/view/KEY-1`になる。
**Why it happens:** URL構築時にhostUrlにプロトコルが含まれているケースを考慮していない。
**How to avoid:** URL構築時に`hostUrl`からプロトコルプレフィックスを除去する正規化処理を入れる。
**Warning signs:** カードクリック時にブラウザが開くがページが見つからない(404)。

```typescript
function buildIssueUrl(hostUrl: string, issueKey: string): string {
  const host = hostUrl.replace(/^https?:\/\//, '');
  return `https://${host}/view/${issueKey}`;
}
```
[VERIFIED: settingsStore.ts -- hostUrl: string -- 保存形式の制約なし]

### Pitfall 3: StatusBadge colorがundefinedの場合
**What goes wrong:** 古いデータや一部のAPIレスポンスで`BacklogStatus.color`がundefinedの可能性がある。
**Why it happens:** `BacklogStatus`型では`color: string`だが、APIレスポンスの信頼性は保証されない。
**How to avoid:** `color` propをoptionalにし、undefinedの場合は既存のグレーバッジスタイルにフォールバック。
**Warning signs:** バッジが透明になる、またはluminance計算でNaN。

### Pitfall 4: トグル状態のパフォーマンス
**What goes wrong:** 各LaneHeaderがuseStateでトグル状態を持つため、リレンダリングが多発。
**Why it happens:** レーンが7つ程度なので実際にはパフォーマンス問題は起きにくい。
**How to avoid:** useStateのローカル状態で十分。Zustandストアへの昇格は不要。
**Warning signs:** この規模では問題にならない。将来的にレーン数が増えた場合のみ検討。

### Pitfall 5: Ripple アニメーションのCSS実装
**What goes wrong:** CSS keyframeアニメーションでripple効果を実装する際、要素のoverflow設定やposition設定が既存レイアウトを崩す。
**Why it happens:** ripple効果には`position: relative`と`overflow: hidden`が必要。既存の`.card`スタイルとの干渉。
**How to avoid:** `.card`に`position: relative`と`overflow: hidden`を追加。ripple用の`::after`擬似要素を使用。
**Warning signs:** カード内のテキストが切れる、レイアウトがずれる。

## Code Examples

### Ripple Animation CSS

```css
/* IssueCard.module.css */
.card {
  /* 既存styles ... */
  position: relative;
  overflow: hidden;
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.card:hover {
  background: var(--color-bg);
}

.card:active::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at var(--click-x, 50%) var(--click-y, 50%),
    rgba(0, 0, 0, 0.08) 0%,
    transparent 60%);
  animation: ripple 300ms ease-out forwards;
}

@keyframes ripple {
  from {
    opacity: 1;
    transform: scale(0.5);
  }
  to {
    opacity: 0;
    transform: scale(2);
  }
}
```
[ASSUMED: ripple実装パターン -- CSS :active擬似要素ベース。JS制御のrippleも選択肢だが、CSSのみの方がシンプル]

### MemberBreakdown コンポーネント

```typescript
// MemberBreakdown.tsx
import styles from './MemberBreakdown.module.css';

interface MemberCount {
  name: string;
  count: number;
}

interface MemberBreakdownProps {
  members: MemberCount[];
}

export function MemberBreakdown({ members }: MemberBreakdownProps) {
  return (
    <ul className={styles.list} role="list" aria-label="メンバー別課題数">
      {members.map((member) => (
        <li key={member.name} className={styles.item}>
          <span className={styles.memberName}>{member.name}</span>
          <span className={styles.count}>{member.count}</span>
        </li>
      ))}
    </ul>
  );
}
```
[VERIFIED: 既存プロジェクトのコンポーネントパターンに準拠]

### Toggle Animation CSS

```css
/* LaneHeader.module.css -- 展開アニメーション */
.breakdownContainer {
  overflow: hidden;
  max-height: 0;
  opacity: 0;
  transition: max-height var(--transition-normal), opacity var(--transition-normal);
}

.breakdownContainer.expanded {
  max-height: 300px; /* 十分な最大値 */
  opacity: 1;
}
```
[ASSUMED: max-height transitionパターン -- CSS transitionでスムーズな展開/折りたたみ]

### openUrl テストパターン

```typescript
// IssueCard.test.tsx
import { vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { openUrl } from '@tauri-apps/plugin-opener';

vi.mocked(openUrl);

it('opens Backlog issue URL on click', async () => {
  const user = userEvent.setup();
  render(<IssueCard issue={mockIssue} />);
  await user.click(screen.getByRole('link'));
  expect(openUrl).toHaveBeenCalledWith('https://example.backlog.com/view/TEST-1');
});
```
[VERIFIED: @testing-library/user-event 14.6.x API、tests/setup.ts モックパターン]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `tauri-plugin-shell` open() | `tauri-plugin-opener` openUrl() | Tauri 2.0 (2024) | shell pluginは非推奨。opener pluginを使用 [VERIFIED: CLAUDE.md, lib.rs] |
| CSS class toggle for colors | Inline style with dynamic hex | React 19 | 動的カラーにはinline styleが最適 |
| `window.open()` | Tauri opener plugin | Tauri 2.0 | WebView内でwindow.openはブロックされる可能性 |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | CSS :active擬似要素ベースのrippleで十分なフィードバックが得られる | Code Examples (Ripple) | JSベースのrippleに変更が必要。実装工数は小さい |
| A2 | max-height transitionでスムーズな展開/折りたたみが実現できる | Code Examples (Toggle) | 別のアニメーション手法(例: CSS grid template rows)に変更。影響小 |
| A3 | luminance閾値0.179でWCAG AA 4.5:1を達成できる | Pattern 2 | テストで確認可能。閾値の微調整で対応可能 |

## Open Questions (RESOLVED)

1. **hostUrl保存形式**
   - What we know: `settingsStore.hostUrl`はstring型で保存される
   - What's unclear: `https://`プレフィックス付きで保存されているか、ホスト名のみか
   - Recommendation: URL構築時に正規化処理を入れることで両方に対応。Phase 1の保存ロジックを確認するのが理想だが、正規化で安全にカバー可能

2. **openUrl失敗時のUX**
   - What we know: openUrlはPromise<void>を返し、失敗時はrejectする
   - What's unclear: どの程度の頻度で失敗するか(通常はOS側の問題)
   - Recommendation: catch して silent ignore(D-05のrippleフィードバックがクリック確認になる)。エラートーストは過剰

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.x + @testing-library/react 16.3.x |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run src/components/StatusBadge src/components/IssueCard src/components/LaneHeader src/components/MemberBreakdown src/utils` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BOARD-04 | StatusBadge displays background color from API | unit | `npx vitest run src/components/StatusBadge/StatusBadge.test.tsx -x` | Exists (要拡張) |
| BOARD-04 | getContrastTextColor returns white/black correctly | unit | `npx vitest run src/utils/colorContrast.test.ts -x` | Wave 0 |
| BOARD-05 | LaneHeader shows issue count next to name | unit | `npx vitest run src/components/LaneHeader/LaneHeader.test.tsx -x` | Wave 0 |
| BOARD-06 | LaneHeader toggles member breakdown display | unit | `npx vitest run src/components/LaneHeader/LaneHeader.test.tsx -x` | Wave 0 |
| BOARD-06 | MemberBreakdown renders sorted member list | unit | `npx vitest run src/components/MemberBreakdown/MemberBreakdown.test.tsx -x` | Wave 0 |
| BOARD-06 | computeMemberBreakdown aggregates correctly | unit | `npx vitest run src/utils/memberBreakdown.test.ts -x` | Wave 0 |
| UX-03 | IssueCard click calls openUrl with correct URL | unit | `npx vitest run src/components/IssueCard/IssueCard.test.tsx -x` | Exists (要拡張) |

### Sampling Rate
- **Per task commit:** `npx vitest run src/components/StatusBadge src/components/IssueCard src/components/LaneHeader src/components/MemberBreakdown src/utils`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/utils/colorContrast.test.ts` -- covers BOARD-04 luminance calculation
- [ ] `src/components/LaneHeader/LaneHeader.test.tsx` -- covers BOARD-05, BOARD-06
- [ ] `src/components/MemberBreakdown/MemberBreakdown.test.tsx` -- covers BOARD-06
- [ ] `src/utils/memberBreakdown.test.ts` -- covers BOARD-06 aggregation (if extracted as utility)
- [ ] `tests/setup.ts` mock追加 -- `@tauri-apps/plugin-opener` mock

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | N/A (Phase 1 scope) |
| V3 Session Management | no | N/A |
| V4 Access Control | no | N/A |
| V5 Input Validation | yes | hostUrl正規化でURL injection防止 |
| V6 Cryptography | no | N/A |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| URL injection via hostUrl | Tampering | hostUrlからプロトコルを除去し、`https://`を固定プレフィックスとして付与。任意URLの開放を防止 |
| XSS via status name | Tampering | React JSXが自動エスケープ。dangerouslySetInnerHTML不使用 |

## Sources

### Primary (HIGH confidence)
- [VERIFIED: codebase] -- StatusBadge.tsx, IssueCard.tsx, LaneHeader.tsx, Lane.tsx, backlog.ts, board.ts, settingsStore.ts, tauriBridge.ts, tests/setup.ts, global.css, package.json, capabilities/default.json, lib.rs の全ソースコード確認
- [VERIFIED: npm registry] -- @tauri-apps/plugin-opener 2.5.3, vitest 4.1.3, @testing-library/react 16.3.2, @testing-library/user-event 14.6.1

### Secondary (MEDIUM confidence)
- [CITED: https://v2.tauri.app/reference/javascript/opener/] -- openUrl API signature: `openUrl(url: string | URL, openWith?: string): Promise<void>`
- [CITED: https://www.w3.org/TR/WCAG20-TECHS/G17.html] -- WCAG 2.0 相対輝度・コントラスト比計算式
- [CITED: https://developer.nulab.com/docs/backlog/api/2/get-status-list-of-project/] -- BacklogStatus.color format: hex string (e.g., "#ed8077")

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - 全パッケージがpackage.jsonとnpm registryで検証済み。新規追加なし
- Architecture: HIGH - 全変更対象コンポーネントのソースコード確認済み。型定義完備
- Pitfalls: HIGH - Tauri mock状況、hostUrl形式、color undefinedケースを実コードから特定

**Research date:** 2026-04-08
**Valid until:** 2026-05-08 (安定したスタック、変動要素なし)
