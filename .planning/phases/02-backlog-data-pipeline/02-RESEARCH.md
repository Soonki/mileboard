# Phase 2: Backlog Data Pipeline - Research

**Researched:** 2026-04-07
**Domain:** Rust/Tauri IPC commands, Backlog REST API v2, rate limiting, pagination
**Confidence:** HIGH

## Summary

Phase 2ではRust側にBacklog APIクライアントを構築し、マイルストーン一覧・課題一覧・未割当課題をIPC経由でフロントエンドに提供するデータパイプラインを実装する。既存の`tauri-plugin-http`がreqwestをre-exportしているため、追加のHTTPクレート依存は不要。Tauri 2のManaged State + async commandsパターンでreqwestクライアントを共有し、レート制限はレスポンスヘッダー`X-RateLimit-Remaining`を監視して逐次実行する。

Backlog APIのマイルストーンエンドポイント(`/api/v2/projects/:key/versions`)はページネーション不要で全件返却。課題エンドポイント(`/api/v2/issues`)はcount/offsetベースのページネーション（最大100件/リクエスト）を持つ。「未割当」課題（マイルストーン未設定）にはAPI側にフィルタパラメータが存在しないため、プロジェクト全課題を取得してRust側でmilestone配列が空の課題をフィルタリングする戦略が必要。ただしCount Issue APIで総数を事前取得でき、ページネーション計画に活用可能。

**Primary recommendation:** `tauri_plugin_http::reqwest` re-exportを使い、BacklogClientを単一のRust structとしてManaged Stateに登録。async commandsで3つのIPC — `fetch_board_data`（一括取得）を単一コマンドとして実装し、フロントエンドは1回のinvokeで全データを受け取る。

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** One-shot bulk fetch -- all milestones + all issues fetched before the board renders. Single loading state (skeleton) while fetching. No progressive/streaming display.
- **D-02:** The IPC command returns a complete board data structure: milestones with their issues, plus unassigned issues. Frontend receives everything in one typed response.
- **D-03:** Board-level error granularity -- if ANY fetch operation fails, the entire board shows an error state with a retry button. No partial data display.
- **D-04:** Error messages are Japanese strings matching the UI-SPEC copywriting pattern established in Phase 1.
- **D-05:** "Unassigned" = issues with NO milestone AND status is NOT closed/completed (未完了のみ).
- **D-06:** Category-based filtering at fetch time -- the API query should support filtering unassigned issues by Backlog category.
- **D-07:** Board data fetching is implemented as Rust IPC commands using reqwest (NOT frontend plugin-http). Rate limiting, pagination, and JSON parsing all happen in Rust.
- **D-08:** Phase 1's testConnection/fetchProjects remain as-is in TypeScript (plugin-http). No migration needed.
- **D-09:** Frontend calls Rust commands via tauriBridge.ts proxy (invoke pattern).

### Claude's Discretion
- Rate limiting algorithm (header-based throttle, backoff strategy, delay between requests)
- Pagination strategy for issue fetching
- Exact IPC command names and parameter/return types
- Milestone date range calculation ("last month to 6 months ahead")

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

## Project Constraints (from CLAUDE.md)

- **Immutability:** Zustand `set()` でスプレッド構文。直接mutation禁止
- **ファイル命名:** `PascalCase.tsx`（コンポーネント）, `camelCase.ts`（サービス）
- **エラー処理:** discriminated union `{ success, data?, error? }`。UIは日本語エラーメッセージ
- **テスト:** TDD（RED -> GREEN -> IMPROVE）。カバレッジ80%以上。ソースと同階層
- **Tauri mock:** `tests/setup.ts` でグローバルモック
- **tauriBridge:** 直接Tauri APIを呼ばない。tauriBridge.ts経由
- **Rust rules:** `thiserror` for typed errors, `cargo fmt` + `cargo clippy`, `Result<T, E>` + `?` propagation, `unsafe`不使用

## Standard Stack

### Core (Rust)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| tauri-plugin-http (reqwest re-export) | 2.x (reqwest 0.12.28) | HTTP client for Backlog API calls | Already in Cargo.toml, re-exports reqwest -- no additional dependency needed [VERIFIED: Cargo.lock shows reqwest 0.12.28] |
| serde + serde_json | 1.x | JSON serialization/deserialization of API responses and IPC data | Already in Cargo.toml [VERIFIED: Cargo.toml] |
| thiserror | 2.x | Typed error definitions for BacklogClient | Rust coding convention requires thiserror for library errors [CITED: project rules/rust/coding-style.md] |
| chrono | 0.4.x | Date range calculation (last month to 6 months ahead) | Standard Rust date/time library for milestone date filtering [VERIFIED: crates.io latest 0.4.43] |
| tokio | 1.51.x | Async runtime (already pulled by tauri) | Required for async commands, already in dependency tree [VERIFIED: Cargo.lock shows tokio 1.51.0] |

### Core (Frontend - TypeScript)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @tauri-apps/api | 2.10.1 | `invoke()` for calling Rust commands | tauriBridge.ts proxy functions [VERIFIED: npm ls] |

### New Dependencies to Add

```toml
# src-tauri/Cargo.toml [dependencies]
thiserror = "2"
chrono = { version = "0.4", features = ["serde"] }
```

**Note:** reqwestは`tauri-plugin-http`経由でre-exportされるため別途追加不要。`use tauri_plugin_http::reqwest;`で利用可能。 [CITED: https://v2.tauri.app/plugin/http-client/]

## Architecture Patterns

### Recommended Rust Module Structure

```
src-tauri/src/
├── lib.rs              # Plugin registration + invoke_handler
├── main.rs             # Entry point (existing)
├── backlog/
│   ├── mod.rs          # Module exports
│   ├── client.rs       # BacklogClient struct (HTTP + rate limiting)
│   ├── types.rs        # Serde structs for API responses
│   ├── commands.rs     # #[tauri::command] async functions
│   └── error.rs        # BacklogError enum (thiserror)
└── ...
```

### Pattern 1: Managed State with BacklogClient

**What:** reqwest::Clientをラップしたstruct をTauri Managed Stateに登録し、全commandsで共有
**When to use:** 複数のIPC commandsが同一HTTPクライアント・設定を必要とする場合

```rust
// Source: https://v2.tauri.app/develop/state-management/
use tauri_plugin_http::reqwest;

pub struct BacklogClient {
    http: reqwest::Client,
}

impl BacklogClient {
    pub fn new() -> Self {
        Self {
            http: reqwest::Client::new(),
        }
    }

    pub async fn fetch_milestones(
        &self,
        host: &str,
        api_key: &str,
        project_key: &str,
    ) -> Result<Vec<Milestone>, BacklogError> {
        let url = format!(
            "https://{}/api/v2/projects/{}/versions?apiKey={}",
            host, project_key, api_key
        );
        let resp = self.http.get(&url).send().await?;
        self.check_rate_limit(&resp);
        // ...
    }
}

// Registration in lib.rs:
tauri::Builder::default()
    .manage(BacklogClient::new())
    .invoke_handler(tauri::generate_handler![fetch_board_data])
```

**Important:** `reqwest::Client` is already `Clone` and uses connection pooling internally. Mutex wrapping is NOT needed for read-only HTTP requests. [CITED: https://v2.tauri.app/develop/state-management/]

### Pattern 2: Single Board Data Command (D-01, D-02)

**What:** 1つのIPC commandで全データ（milestones + issues + unassigned）を取得して返す
**When to use:** One-shot bulk fetch戦略（ユーザー決定D-01, D-02に準拠）

```rust
#[tauri::command]
async fn fetch_board_data(
    client: tauri::State<'_, BacklogClient>,
    host: String,
    api_key: String,
    project_key: String,
    milestone_prefix: String,
    category_ids: Option<Vec<u64>>,
) -> Result<BoardData, String> {
    client.fetch_board(
        &host, &api_key, &project_key, &milestone_prefix, category_ids.as_deref()
    )
    .await
    .map_err(|e| e.to_string())  // Tauri commands need String errors or serde::Serialize
}
```

### Pattern 3: Rate Limit Header Monitoring

**What:** 各APIレスポンスのX-RateLimit-Remainingヘッダーを監視し、残りが少ない場合はResetまで待機
**Recommendation (Claude's Discretion):**

```rust
async fn throttle_if_needed(response: &reqwest::Response) {
    if let Some(remaining) = response.headers()
        .get("X-RateLimit-Remaining")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.parse::<u32>().ok())
    {
        if remaining <= 5 {
            if let Some(reset) = response.headers()
                .get("X-RateLimit-Reset")
                .and_then(|v| v.to_str().ok())
                .and_then(|v| v.parse::<u64>().ok())
            {
                let now = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_secs();
                if reset > now {
                    tokio::time::sleep(
                        std::time::Duration::from_secs(reset - now + 1)
                    ).await;
                }
            }
        }
    }
}
```

**Rate limit type awareness:** Issue search endpoints fall under "Search" category (150/min limit), milestone list falls under "Read" (600/min limit). Typical board fetch: 1 milestone call + N issue calls + 1 unassigned call. With ~7 milestones, total = ~9 Search requests + 1 Read request per board load. Well within limits even on free plans. [VERIFIED: https://developer.nulab.com/docs/backlog/rate-limit/]

### Pattern 4: Pagination with Count-First Strategy

**Recommendation (Claude's Discretion):**

```rust
// Step 1: Get total count via /api/v2/issues/count
// Step 2: Fetch pages sequentially with offset += 100
async fn fetch_all_issues(
    &self,
    host: &str,
    api_key: &str,
    project_key: &str,
    milestone_id: u64,
) -> Result<Vec<Issue>, BacklogError> {
    let count = self.fetch_issue_count(host, api_key, project_key, Some(milestone_id)).await?;
    let mut all_issues = Vec::with_capacity(count as usize);
    let mut offset = 0u64;
    let page_size = 100u64; // API maximum

    while offset < count {
        let page = self.fetch_issues_page(
            host, api_key, project_key, Some(milestone_id), offset, page_size
        ).await?;
        all_issues.extend(page);
        offset += page_size;
    }

    Ok(all_issues)
}
```

### Anti-Patterns to Avoid

- **並列API呼び出し:** Rate limit共有のため、Backlog APIへのリクエストは必ず逐次実行。`tokio::join!`での並列化は禁止
- **Frontend直接invoke:** `tauri::invoke()`を直接使わず、必ず`tauriBridge.ts`経由
- **Partial data返却:** D-03に基づき、エラー時は部分データを返さない。Result::Errで全体エラー
- **reqwestの別途追加:** `tauri_plugin_http::reqwest`のre-exportを使う。Cargo.tomlにreqwest直接追加すると重複

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP client | 自前のHTTPリクエスト実装 | `tauri_plugin_http::reqwest` re-export | Connection pooling, async/await, TLS設定済み |
| JSON parsing | 手動のJSON文字列パース | `serde_json` + derive macros | 型安全、コンパイル時チェック |
| Error types | 手動のDisplay/Error impl | `thiserror` derive macros | ボイラープレート削減、From trait自動実装 |
| Date calculation | 手動の月計算ロジック | `chrono` crate | うるう年、月末、タイムゾーン処理済み |
| Rate limit backoff | 固定sleep/retry | ヘッダーベースの適応型スロットリング | X-RateLimit-Reset値に基づく正確な待機 |

## Common Pitfalls

### Pitfall 1: reqwestの重複依存

**What goes wrong:** Cargo.tomlにreqwestを直接追加すると、tauri-plugin-httpのre-exportと異なるバージョンが解決され、コンパイルエラーやバイナリサイズ増大
**Why it happens:** tauri-plugin-http v2はreqwest 0.12をdefault-features=false付きでre-export
**How to avoid:** `use tauri_plugin_http::reqwest;` を使い、Cargo.tomlにreqwestを追加しない
**Warning signs:** `Cargo.lock`に同名クレートの複数バージョンが出現 [VERIFIED: Cargo.lock already has reqwest 0.12.28 from tauri-plugin-http]

### Pitfall 2: 未割当課題フィルタのAPI制限

**What goes wrong:** Backlog APIに「マイルストーン未設定」の課題をフィルタするパラメータが存在しない
**Why it happens:** `milestoneId[]`パラメータは特定のマイルストーンIDを指定するフィルタで、「なし」を指定する方法が公式ドキュメントに記載されていない
**How to avoid:** プロジェクト全課題を取得し、Rust側で`milestone`配列が空かつステータスが完了でない課題をフィルタ。Count Issue APIで事前に総数を取得してページネーション最適化
**Warning signs:** 大量の課題があるプロジェクトでは全件取得のコストが高い [ASSUMED]

### Pitfall 3: ステータスIDのハードコーディング

**What goes wrong:** Backlog defaultステータスID（1=Open, 2=In Progress, 3=Resolved, 4=Closed）を前提にハードコードすると、カスタムステータスを持つプロジェクトで「完了」判定が不正確
**Why it happens:** Backlogはプロジェクト毎に最大8つのカスタムステータスを追加可能。「Closed」(id=4)は常に存在するが、カスタムの完了系ステータスもある
**How to avoid:** `/api/v2/projects/:key/statuses` で全ステータスを取得し、id=4（Closed）を「完了」として使用。または statusId=4のみで判定（Backlogの設計上、Closedは常に最終ステータス）
**Warning signs:** ステータスIDが4以外の完了状態が存在する可能性 [CITED: https://developer.nulab.com/docs/backlog/api/2/get-status-list-of-project/]

### Pitfall 4: async commandのborrowedパラメータ

**What goes wrong:** Tauri async commandsで`&str`引数を使うとコンパイルエラー
**Why it happens:** Tauriのasync commandはseparate task poolで実行されるため、borrowed referenceが使えない
**How to avoid:** 引数に`String`を使い、Result型を返す。`State<'_, T>`は例外的にborrowedが使用可能
**Warning signs:** "`borrowed argument in async command`" コンパイルエラー [CITED: https://v2.tauri.app/develop/calling-rust/]

### Pitfall 5: milestoneId[]の全配列置換

**What goes wrong:** Phase 5（DnD）でPATCH API使用時、milestoneIdを単一値で送ると他のマイルストーンが消える
**Why it happens:** Backlog PATCH APIはmilestoneId[]を差分更新ではなく全配列置換する
**How to avoid:** Phase 2で取得する課題データにmilestone配列全体を含め、Phase 5でPATCH時に現在の全milestoneIdを再送信。この情報はPhase 5で必要だが、Phase 2のデータ構造設計時に考慮が必要
**Warning signs:** CLAUDE.mdに明記されている既知の罠 [VERIFIED: CLAUDE.md]

### Pitfall 6: Search API Rate Limitカウント

**What goes wrong:** Issue listとissue countは"Search"カテゴリ（150/min）であり、"Read"（600/min）より厳しい
**Why it happens:** BacklogはRead/Update/Search/Iconで独立したレート制限を持つ
**How to avoid:** Search系リクエスト数を監視。~7マイルストーン + 未割当 = ~9 Search requests/board load は余裕あり。ただし各マイルストーンの課題ページネーションが深い場合は注意
**Warning signs:** X-RateLimit-Remaining (Search) の急減 [VERIFIED: https://developer.nulab.com/docs/backlog/rate-limit/]

## Code Examples

### Backlog API Types (Rust serde structs)

```rust
// Source: https://developer.nulab.com/docs/backlog/api/2/get-version-milestone-list/
// Source: https://developer.nulab.com/docs/backlog/api/2/get-issue/

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Milestone {
    pub id: u64,
    pub project_id: u64,
    pub name: String,
    pub description: String,
    pub start_date: Option<String>,
    pub release_due_date: Option<String>,
    pub archived: bool,
    pub display_order: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Issue {
    pub id: u64,
    pub project_id: u64,
    pub issue_key: String,
    pub key_id: u64,
    pub summary: String,
    pub description: Option<String>,
    pub status: Status,
    pub priority: Option<Priority>,
    pub assignee: Option<User>,
    pub milestone: Vec<Milestone>,
    pub category: Vec<Category>,
    pub start_date: Option<String>,
    pub due_date: Option<String>,
    pub created: String,
    pub updated: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Status {
    pub id: u64,
    pub project_id: Option<u64>,
    pub name: String,
    pub color: String,
    pub display_order: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Priority {
    pub id: u64,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct User {
    pub id: u64,
    pub user_id: Option<String>,
    pub name: String,
    pub role_type: u64,
    pub mail_address: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Category {
    pub id: u64,
    pub name: String,
    pub display_order: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IssueCount {
    pub count: u64,
}
```

### Board Data IPC Response Type

```rust
// Rust side
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BoardData {
    pub milestones: Vec<MilestoneWithIssues>,
    pub unassigned_issues: Vec<Issue>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MilestoneWithIssues {
    pub milestone: Milestone,
    pub issues: Vec<Issue>,
}
```

```typescript
// TypeScript side (src/types/board.ts)
export interface BoardData {
  milestones: MilestoneWithIssues[];
  unassignedIssues: Issue[];
}

export interface MilestoneWithIssues {
  milestone: BacklogMilestone;
  issues: BacklogIssue[];
}
```

### Error Type (thiserror)

```rust
// Source: project rules/rust/coding-style.md
use thiserror::Error;

#[derive(Debug, Error)]
pub enum BacklogError {
    #[error("ホストに接続できません: {0}")]
    ConnectionFailed(String),

    #[error("APIキーが無効です")]
    Unauthorized,

    #[error("APIレート制限に達しました。しばらくしてから再試行してください")]
    RateLimited,

    #[error("プロジェクトが見つかりません: {0}")]
    ProjectNotFound(String),

    #[error("データの取得に失敗しました: {0}")]
    FetchFailed(String),

    #[error("レスポンスの解析に失敗しました: {0}")]
    ParseError(String),
}

// Tauri commands need Serialize for error types
impl serde::Serialize for BacklogError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::ser::Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}
```

### tauriBridge Proxy Function

```typescript
// Source: https://v2.tauri.app/develop/calling-rust/
import { invoke } from '@tauri-apps/api/core';
import type { BoardData } from '../types/board';

export async function fetchBoardData(
  host: string,
  apiKey: string,
  projectKey: string,
  milestonePrefix: string,
  categoryIds?: number[],
): Promise<BoardData> {
  return invoke<BoardData>('fetch_board_data', {
    host,
    apiKey,
    projectKey,
    milestonePrefix,
    categoryIds: categoryIds ?? null,
  });
}
```

### Milestone Date Range Calculation

```rust
// Recommendation (Claude's Discretion):
// "Last month to 6 months ahead" = approximately 7 lanes
use chrono::{Local, Datelike, NaiveDate, Months};

fn milestone_date_range() -> (NaiveDate, NaiveDate) {
    let today = Local::now().date_naive();

    // 先月の1日
    let start = today
        .checked_sub_months(Months::new(1))
        .unwrap_or(today)
        .with_day(1)
        .unwrap_or(today);

    // 6ヶ月後の末日
    let end_month = today
        .checked_add_months(Months::new(7))
        .unwrap_or(today)
        .with_day(1)
        .unwrap_or(today)
        .pred_opt()
        .unwrap_or(today);

    (start, end_month)
}

fn is_milestone_in_range(milestone: &Milestone, start: &NaiveDate, end: &NaiveDate) -> bool {
    // マイルストーンの開始日またはリリース日が範囲内にある場合、表示対象
    let start_in_range = milestone.start_date.as_ref()
        .and_then(|d| NaiveDate::parse_from_str(d, "%Y-%m-%d").ok())
        .map(|d| d >= *start && d <= *end);
    let due_in_range = milestone.release_due_date.as_ref()
        .and_then(|d| NaiveDate::parse_from_str(d, "%Y-%m-%d").ok())
        .map(|d| d >= *start && d <= *end);

    start_in_range.unwrap_or(false) || due_in_range.unwrap_or(false)
}
```

## Backlog API Reference Summary

### Endpoints Used

| Endpoint | Method | Category | Purpose | Paginated |
|----------|--------|----------|---------|-----------|
| `/api/v2/projects/:key/versions` | GET | Read | マイルストーン一覧 | No |
| `/api/v2/issues` | GET | Search | 課題検索（milestoneId指定） | Yes (count/offset) |
| `/api/v2/issues/count` | GET | Search | 課題数取得（ページネーション計画用） | No |
| `/api/v2/projects/:key/statuses` | GET | Read | ステータス一覧（完了判定用） | No |

### Rate Limits

| Type | Limit/min | Used For |
|------|-----------|----------|
| Read | 600 | Milestone list, Status list |
| Search | 150 | Issue list, Issue count |
| Update | 150 | (Phase 5で使用) |

[VERIFIED: https://developer.nulab.com/docs/backlog/rate-limit/]

### Pagination Parameters (Issue List)

- `count`: 1-100 (default: 20, max: 100)
- `offset`: 0-based starting position
- Total is obtained via separate `/api/v2/issues/count` call with same filters

[VERIFIED: https://developer.nulab.com/docs/backlog/api/2/get-issue-list/]

### Unassigned Issues Strategy

Backlog APIには「マイルストーン未設定」を直接フィルタするパラメータがない。以下の戦略を推奨:

1. `/api/v2/issues/count` で `projectId[]` + 完了系ステータスを除外したフィルタで総数取得
2. `/api/v2/issues` で全ページ取得
3. Rust側で `issue.milestone.is_empty()` をフィルタ
4. D-06に従い、`categoryId[]`パラメータをAPI呼び出し時に渡してカテゴリフィルタはAPI側で実行

**Note:** 完了ステータスの除外は`statusId[]`パラメータで実現可能 -- ただし「完了以外」を指定するには、プロジェクトの全ステータスを取得し、Closed (id=4)以外を列挙する必要がある。 [ASSUMED]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| tauri-plugin-http JS fetch | Rust reqwest re-export | Tauri 2.0 (2024 Q4) | Rust側でHTTPクライアント利用可能 |
| `#[command]` sync functions | `#[tauri::command] async` | Tauri 2.0 | UIブロック回避、reqwest awaitサポート |
| Get Status List API | Get Status List of Project | 2025-08-28 deprecated | プロジェクト単位でステータス取得 |

## Assumptions Log

> List all claims tagged `[ASSUMED]` in this research.

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | 大量課題プロジェクトでの全件取得コストが高い | Pitfall 2 | Performance issue on first load; mitigation: count API for size estimation |
| A2 | statusId=4（Closed）のみで「完了」判定が十分 | Unassigned Issues Strategy | カスタム完了ステータスを持つプロジェクトで未割当レーンに完了課題が混入。リスク: LOW（Closedは全プロジェクト共通） |

## Open Questions

1. **Backlog APIの「マイルストーン未設定」フィルタ**
   - What we know: `milestoneId[]` パラメータは特定IDの指定のみ。公式ドキュメントに「なし」指定の方法なし
   - What's unclear: undocumentedな特殊値（-1, 0等）が機能する可能性
   - Recommendation: 実装時に`milestoneId[]=-1`と`milestoneId[]=0`を試行。機能しなければ全件取得+Rustフィルタ戦略を採用。両方のコードパスを準備

2. **Backlog Free Plan Rate Limit**
   - What we know: Paid planは Read=600, Search=150, Update=150/min
   - What's unclear: Free planの具体的な数値（ドキュメントに明記なし）
   - Recommendation: 実行時に`/api/v2/rateLimit`を呼び出して実際の制限値を取得し、動的に調整

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Rust toolchain | Tauri backend compilation | Yes | rustc 1.94.0 (stable) | -- |
| Cargo | Dependency management | Yes | 1.94.0 | -- |
| Node.js / npm | Frontend build | Yes | (in project) | -- |
| tauri-plugin-http | reqwest re-export | Yes | 2.x (in Cargo.toml) | -- |
| Network access | Backlog API calls | Yes (dev time) | -- | -- |

**Missing dependencies with no fallback:** None

**Missing dependencies with fallback:** None

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework (Frontend) | Vitest 4.1.x + RTL 16.x |
| Framework (Rust) | Built-in `#[test]` + `#[tokio::test]` |
| Config file (Frontend) | `vitest.config.ts` |
| Quick run command | `npx vitest run src/services/boardApi.test.ts` |
| Full suite command | `npx vitest run` |
| Rust test command | `cd src-tauri && cargo test` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SC-1 | Milestone fetch returns prefix-filtered milestones in date range | unit (Rust) + integration (TS) | `cargo test -- test_milestone_filter` / `npx vitest run src/services/boardApi.test.ts` | Wave 0 |
| SC-2 | Issue fetch returns all pages for a milestone | unit (Rust) | `cargo test -- test_pagination` | Wave 0 |
| SC-3 | Unassigned issues = no milestone + not closed | unit (Rust) | `cargo test -- test_unassigned_filter` | Wave 0 |
| SC-4 | Rate limit header monitoring prevents 429 | unit (Rust) | `cargo test -- test_rate_limit` | Wave 0 |
| tauriBridge | invoke proxy correctly calls Rust command | unit (TS) | `npx vitest run src/services/tauriBridge.test.ts` | Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run` + `cd src-tauri && cargo test`
- **Per wave merge:** Full suite (both frameworks)
- **Phase gate:** All tests green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src-tauri/src/backlog/` -- entire module tree is new
- [ ] `src/services/boardApi.test.ts` -- tauriBridge board data tests
- [ ] `src/types/board.ts` -- TypeScript type definitions for board data
- [ ] `tests/setup.ts` -- needs `@tauri-apps/api/core` invoke mock addition
- [ ] `thiserror` + `chrono` dependencies in Cargo.toml

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes (API key handling) | API key passed as URL parameter (Backlog API design), never logged |
| V3 Session Management | No | Stateless API calls |
| V4 Access Control | No | Delegated to Backlog server |
| V5 Input Validation | Yes | Validate host URL format, project key format before API calls |
| V6 Cryptography | No | HTTPS only (reqwest default) |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| API key exposure in logs | Information Disclosure | Never log API key; URL construction strips key from error messages |
| SSRF via host URL | Spoofing | Validate host URL matches `*.backlog.com`, `*.backlog.jp`, `*.backlogtool.com` patterns |
| Rate limit abuse | Denial of Service | Header-based throttling prevents 429; sequential requests only |

## Sources

### Primary (HIGH confidence)

- [Backlog API: Get Version/Milestone List](https://developer.nulab.com/docs/backlog/api/2/get-version-milestone-list/) -- endpoint URL, response fields
- [Backlog API: Get Issue List](https://developer.nulab.com/docs/backlog/api/2/get-issue-list/) -- query parameters, pagination, response format
- [Backlog API: Count Issue](https://developer.nulab.com/docs/backlog/api/2/count-issue/) -- issue count for pagination planning
- [Backlog API: Rate Limit](https://developer.nulab.com/docs/backlog/rate-limit/) -- header names, request categories, limits
- [Backlog API: Get Rate Limit](https://developer.nulab.com/docs/backlog/api/2/get-rate-limit/) -- runtime limit query, exact quotas
- [Backlog API: Error Response](https://developer.nulab.com/docs/backlog/error-response/) -- error code list including TooManyRequests (code 13)
- [Backlog API: Get Status List of Project](https://developer.nulab.com/docs/backlog/api/2/get-status-list-of-project/) -- project-specific status IDs
- [Tauri 2: Calling Rust](https://v2.tauri.app/develop/calling-rust/) -- command definition, async commands, error handling
- [Tauri 2: State Management](https://v2.tauri.app/develop/state-management/) -- Managed State, Mutex patterns
- [Tauri 2: HTTP Client Plugin](https://v2.tauri.app/plugin/http-client/) -- reqwest re-export usage
- Cargo.lock -- reqwest 0.12.28, tokio 1.51.0 versions verified
- Cargo.toml -- existing dependencies confirmed

### Secondary (MEDIUM confidence)

- [chrono 0.4.43 on crates.io](https://crates.io/crates/chrono) -- latest version
- [thiserror 2.0.18 on crates.io](https://crates.io/crates/thiserror) -- latest version

### Tertiary (LOW confidence)

- Backlog API "no milestone" filter -- undocumented behavior, needs runtime testing

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all dependencies verified in Cargo.lock/npm, official docs consulted
- Architecture: HIGH -- Tauri 2 patterns well-documented, Backlog API endpoints confirmed
- Pitfalls: HIGH -- rate limit structure, pagination limits, milestoneId[] behavior verified from official docs
- Unassigned filter strategy: MEDIUM -- API limitation confirmed (no "no milestone" param), but workaround is straightforward

**Research date:** 2026-04-07
**Valid until:** 2026-05-07 (Backlog API is stable; Tauri 2.x is stable release)
