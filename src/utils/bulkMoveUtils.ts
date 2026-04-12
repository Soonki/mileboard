import type { BacklogIssue } from '../types/backlog';
import { updateIssueMilestone } from '../services/tauriBridge';
import { parseMilestoneIdFromLaneId } from '../stores/boardStore';

/**
 * 最大 concurrency 個の Promise を並列実行する。
 *
 * 各 Promise は独立に settle し、結果配列は入力順を保つ。
 * Promise.allSettled 互換の結果（{status:'fulfilled', value} | {status:'rejected', reason}）を返す。
 *
 * 独自実装の理由（RESEARCH §5.2）:
 * - p-limit などの新規依存追加を避ける（CLAUDE.md「依存追加ゼロ」原則）
 * - 20 行程度で要件を満たす
 *
 * 実装:
 * - 共有カウンタ `nextIndex` を使った worker pool パターン
 * - workerCount = Math.min(concurrency, tasks.length) で無駄なアイドル worker を生成しない
 * - 各 worker は次の未処理タスクを取得して順次実行、tasks 終了で return
 *
 * @param tasks 実行対象タスクの配列（() => Promise<T>）
 * @param concurrency 同時実行数の上限（>= 1）
 * @returns 入力順の PromiseSettledResult 配列
 */
export async function runWithConcurrency<T>(
  tasks: ReadonlyArray<() => Promise<T>>,
  concurrency: number,
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = new Array(tasks.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (true) {
      const current = nextIndex++;
      if (current >= tasks.length) return;
      try {
        const value = await tasks[current]();
        results[current] = { status: 'fulfilled', value };
      } catch (reason: unknown) {
        results[current] = { status: 'rejected', reason };
      }
    }
  }

  const workerCount = Math.min(concurrency, tasks.length);
  const workers = Array.from({ length: workerCount }, () => worker());
  await Promise.all(workers);
  return results;
}

/**
 * bulkMoveIssues 入力パラメータ
 */
export interface BulkMoveParams {
  /** 移動対象 issue 配列 */
  members: ReadonlyArray<BacklogIssue>;
  /** 移動先レーン ID（"unassigned" または "milestone-N"） */
  toLaneId: string;
  /** Backlog ホスト URL */
  hostUrl: string;
  /** Backlog API キー */
  apiKey: string;
  /** Phase 5 milestoneId[] preservation 用プレフィックス */
  milestonePrefix: string;
  /** 各タスク完了ごとに呼ばれる進捗コールバック（M/N 表示用） */
  onProgress?: (completed: number, total: number) => void;
}

/**
 * bulkMoveIssues の結果
 *
 * 順序は保証されない — 呼び出し側は issueId/issueKey で再マッチする想定。
 */
export interface BulkMoveResult {
  /** 成功した issue 配列 */
  succeeded: BacklogIssue[];
  /** 失敗した issue とエラー情報 */
  failed: Array<{ issue: BacklogIssue; error: unknown }>;
}

/**
 * 複数 issue のマイルストーンを最大 3 並列で更新する（D-17）。
 *
 * 各 updateIssueMilestone 呼び出しは Rust 側で `X-RateLimit-Remaining` 監視 +
 * throttle が走るため、TS 側は並列度制御のみに集中する（RESEARCH §5.1 #3）。
 * 部分失敗は結果として分類するのみ — rollback は呼び出し側
 * （boardStore.bulkMoveGroup）の責務。
 *
 * @param params bulk move 入力パラメータ
 * @returns succeeded / failed に分類された結果
 */
export async function bulkMoveIssues(
  params: BulkMoveParams,
): Promise<BulkMoveResult> {
  const { members, toLaneId, hostUrl, apiKey, milestonePrefix, onProgress } =
    params;
  const newMilestoneId = parseMilestoneIdFromLaneId(toLaneId);
  const total = members.length;
  let completed = 0;

  const tasks = members.map(
    (issue) => async (): Promise<BacklogIssue> => {
      await updateIssueMilestone(
        hostUrl,
        apiKey,
        issue.issueKey,
        newMilestoneId,
        milestonePrefix,
      );
      completed += 1;
      if (onProgress) onProgress(completed, total);
      return issue;
    },
  );

  const settled = await runWithConcurrency(tasks, 3);

  const succeeded: BacklogIssue[] = [];
  const failed: Array<{ issue: BacklogIssue; error: unknown }> = [];
  settled.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      succeeded.push(members[i]);
    } else {
      failed.push({ issue: members[i], error: result.reason });
    }
  });

  return { succeeded, failed };
}
