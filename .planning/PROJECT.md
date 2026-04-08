# mileboard

## What This Is

Backlogのマイルストーンをカンバンレーンとして表示し、ドラッグ&ドロップで課題のマイルストーン移動を可能にするTauriデスクトップアプリ。月次スプリントプランニング、デイリースクラムでの調整、ロングスパンの計画俯瞰に使用する。

## Core Value

マイルストーン間の課題移動をドラッグ&ドロップで直感的に行え、チームの計画調整を高速化すること。

## Current Milestone: v1.1 フィルタリング・ソート・一括操作

**Goal:** カードのフィルタリング・ソート・複数選択一括移動でボード操作の効率を大幅に向上させる

**Target features:**
- ステータス・担当者・カテゴリによるフィルタリング（複数選択OR条件）
- 担当者順・期限日順のソート
- レーン内DnDによるカード並べ替え（ローカル保持）
- 複数カード選択 + まとめてレーン間移動

## Current State

**Shipped:** v1.0 MVP (2026-04-08)
**Codebase:** TypeScript 4,087 LOC / Rust 1,412 LOC / CSS 963 LOC
**Tests:** 167 frontend + 45 Rust = 212 total

## Requirements

### Validated

- ✓ APIキー・ホスト・プロジェクトキーの接続設定と永続化 — v1.0
- ✓ プレフィックスに一致するマイルストーンをカンバンレーンとして時系列表示 — v1.0
- ✓ マイルストーン別に課題をカードとして表示（キー・件名・ステータス・担当者・優先度） — v1.0
- ✓ ステータス別の色分け — v1.0
- ✓ 「未割当」レーン — v1.0
- ✓ レーンヘッダーに課題数 + メンバー別課題数の内訳を表示 — v1.0
- ✓ レーン間ドラッグ&ドロップでマイルストーン変更 — v1.0
- ✓ 複数マイルストーン持ちは最古レーン + 警告 + DnD禁止 — v1.0
- ✓ 楽観的UI更新 + 失敗時ロールバック — v1.0
- ✓ ローディング状態・エラートースト — v1.0
- ✓ カードクリックでBacklog課題をブラウザで開く — v1.0

### Active

- [ ] ステータス・担当者・カテゴリによるフィルタリング（複数選択OR条件）
- [ ] 担当者順・期限日順のソート
- [ ] レーン内DnDによるカード並べ替え（ローカル保持）
- [ ] 複数カード選択 + まとめてレーン間移動

### Out of Scope

- WIPカウント・WIP制限警告 — 偏りの把握はメンバー別課題数で十分
- 自動リフレッシュ — v2以降で検討
- モバイル対応 — デスクトップアプリとして構築

## Context

- **利用シーン:** 月初のスプリントプランニング（未割当課題の振り分け、全体配置の決定）、デイリースクラム（来月への見送り、来月予定の巻き取り調整）、ロングスパンの計画俯瞰
- **対象ユーザー:** スクラムチームメンバー（自分自身を含む）
- **Backlog API:** REST API v2を使用。PATCH時にmilestoneId[]は全配列を置換するため、プレフィックス以外のマイルストーンは保持が必要
- **複数マイルストーン運用:** 通常は1課題1マイルストーンだが、異常状態として複数マイルストーンが付く場合がある。最古の開始日のレーンに表示し、警告で気づかせる
- **オープン開発:** Backlog URL・プロジェクトID等の固有情報はリポジトリに含めない。接続先は環境変数または設定ファイル（.gitignore対象）で管理
- **既存経験:** Tauri + React + Viteの構成は既存プロトタイプ（image-recognition）で実績あり

## Constraints

- **Tech stack**: Tauri 2.0 + React 18 + TypeScript + Vite — CORS根本解消 + 既存Tauri経験の活用
- **DnDライブラリ**: @dnd-kit/core + sortable — モダン、アクセシブル、軽量（~12KB gzip）
- **状態管理**: Zustand — DnD中の頻繁な更新に適する軽量ライブラリ
- **スタイリング**: CSS Modules — 既存プロトタイプと同様、追加設定不要
- **テスト**: Vitest + React Testing Library — Viteネイティブ統合
- **レーン表示範囲**: 先月〜6ヶ月先（約7レーン）
- **APIレート制限**: Backlog APIのレート制限を考慮した逐次取得が必要

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Tauriデスクトップアプリとして構築 | CORS問題の根本解消 + 既存経験の活用 | ✓ Good |
| 独立リポジトリとしてオープン開発 | プロジェクト固有情報を含めない汎用ツール | ✓ Good |
| 複数マイルストーン持ちはレーン間DnD禁止 | 異常状態の課題を意図せず操作するリスクを防止 | ✓ Good |
| WIPカウントをMVPから除外 | メンバー別課題数で偏りの把握は十分 | ✓ Good |
| レーン範囲を先月〜6ヶ月先に固定 | プランニングに十分な範囲、横スクロールも許容範囲 | ✓ Good |
| @dnd-kit/core + sortable | モダン、アクセシブル、軽量DnD | ✓ Good |
| Board側onDragOverでドロップターゲット管理 | useDroppableのisOver制限を回避 | ✓ Good |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-08 after v1.1 milestone start*
