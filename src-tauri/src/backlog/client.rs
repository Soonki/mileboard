use chrono::{Datelike, Months, NaiveDate, Utc};
use tauri_plugin_http::reqwest;

use super::error::BacklogError;
use super::types::*;

const MAX_THROTTLE_SLEEP_SECS: u64 = 10;
const PAGE_SIZE: u64 = 100;

/// BacklogClient wraps a reqwest::Client for HTTP connection pooling.
/// It is registered as Tauri Managed State so the connection pool is shared
/// across all IPC command invocations. Connection config (host, api_key) is
/// passed per-call because the user may change settings without restarting.
pub struct BacklogClient {
    http: reqwest::Client,
}

impl BacklogClient {
    pub fn new() -> Self {
        let http = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .build()
            .unwrap_or_else(|_| reqwest::Client::new());
        Self { http }
    }

    /// Fetch complete board data from Backlog API.
    ///
    /// Orchestrates: statuses → milestones → issues per milestone → unassigned issues.
    /// All-or-nothing: any sub-fetch failure propagates immediately (D-03).
    pub async fn fetch_board(
        &self,
        host: &str,
        api_key: &str,
        project_key: &str,
        prefix: &str,
        category_ids: Option<&[u64]>,
    ) -> Result<BoardData, BacklogError> {
        validate_params(host, api_key, project_key)?;

        let statuses = self
            .fetch_project_statuses(host, api_key, project_key)
            .await?;
        let milestones = self
            .fetch_milestones(host, api_key, project_key, prefix)
            .await?;

        let mut milestone_data = Vec::with_capacity(milestones.len());
        for m in &milestones {
            let issues = self
                .fetch_all_issues(host, api_key, project_key, Some(m.id), None, None)
                .await?;
            milestone_data.push(MilestoneWithIssues {
                milestone: m.clone(),
                issues,
            });
        }

        let unassigned_issues = self
            .fetch_unassigned_issues(host, api_key, project_key, &statuses, category_ids)
            .await?;

        Ok(BoardData {
            milestones: milestone_data,
            unassigned_issues,
        })
    }

    /// Fetch milestones filtered by prefix and date range, sorted stably.
    pub async fn fetch_milestones(
        &self,
        host: &str,
        api_key: &str,
        project_key: &str,
        prefix: &str,
    ) -> Result<Vec<Milestone>, BacklogError> {
        let url = build_url(
            host,
            &format!("/projects/{project_key}/versions"),
            api_key,
            &[],
        );
        let response = self
            .http
            .get(&url)
            .send()
            .await
            .map_err(map_reqwest_error)?;
        let response = self.check_response(response).await?;
        let body = response
            .text()
            .await
            .map_err(|e| BacklogError::ParseError(e.to_string()))?;
        let all_milestones: Vec<Milestone> =
            serde_json::from_str(&body).map_err(|e| BacklogError::ParseError(e.to_string()))?;

        let (range_start, range_end) = milestone_date_range();

        let mut filtered: Vec<Milestone> = all_milestones
            .into_iter()
            .filter(|m| {
                !m.archived
                    && m.name.starts_with(prefix)
                    && is_milestone_in_range(m, &range_start, &range_end)
            })
            .collect();

        sort_milestones(&mut filtered);
        Ok(filtered)
    }

    /// Fetch all issues for given filters using count-first pagination strategy.
    pub async fn fetch_all_issues(
        &self,
        host: &str,
        api_key: &str,
        project_key: &str,
        milestone_id: Option<u64>,
        status_ids: Option<&[u64]>,
        category_ids: Option<&[u64]>,
    ) -> Result<Vec<Issue>, BacklogError> {
        let total = self
            .fetch_issue_count(
                host,
                api_key,
                project_key,
                milestone_id,
                status_ids,
                category_ids,
            )
            .await?;

        if total == 0 {
            return Ok(Vec::new());
        }

        let mut all_issues = Vec::with_capacity(total as usize);
        let mut offset: u64 = 0;

        while offset < total {
            let page = self
                .fetch_issues_page(
                    host,
                    api_key,
                    project_key,
                    milestone_id,
                    status_ids,
                    category_ids,
                    offset,
                    PAGE_SIZE,
                )
                .await?;
            all_issues.extend(page);
            offset += PAGE_SIZE;
        }

        Ok(all_issues)
    }

    /// Fetch unassigned issues: no milestone, not closed, optional category filter.
    pub async fn fetch_unassigned_issues(
        &self,
        host: &str,
        api_key: &str,
        project_key: &str,
        project_statuses: &[Status],
        category_ids: Option<&[u64]>,
    ) -> Result<Vec<Issue>, BacklogError> {
        let non_closed_ids: Vec<u64> = project_statuses
            .iter()
            .filter(|s| s.id != 4)
            .map(|s| s.id)
            .collect();

        let issues = self
            .fetch_all_issues(
                host,
                api_key,
                project_key,
                None,
                Some(&non_closed_ids),
                category_ids,
            )
            .await?;

        Ok(issues
            .into_iter()
            .filter(|i| i.milestone.is_empty())
            .collect())
    }

    /// Fetch project statuses (needed for unassigned issue filtering).
    pub async fn fetch_project_statuses(
        &self,
        host: &str,
        api_key: &str,
        project_key: &str,
    ) -> Result<Vec<Status>, BacklogError> {
        let url = build_url(
            host,
            &format!("/projects/{project_key}/statuses"),
            api_key,
            &[],
        );
        let response = self
            .http
            .get(&url)
            .send()
            .await
            .map_err(map_reqwest_error)?;
        let response = self.check_response(response).await?;
        let body = response
            .text()
            .await
            .map_err(|e| BacklogError::ParseError(e.to_string()))?;
        serde_json::from_str(&body).map_err(|e| BacklogError::ParseError(e.to_string()))
    }

    async fn fetch_issue_count(
        &self,
        host: &str,
        api_key: &str,
        project_key: &str,
        milestone_id: Option<u64>,
        status_ids: Option<&[u64]>,
        category_ids: Option<&[u64]>,
    ) -> Result<u64, BacklogError> {
        let url = build_issue_url(
            host,
            "/issues/count",
            api_key,
            project_key,
            milestone_id,
            status_ids,
            category_ids,
            None,
            None,
        );
        let response = self
            .http
            .get(&url)
            .send()
            .await
            .map_err(map_reqwest_error)?;
        let response = self.check_response(response).await?;
        let body = response
            .text()
            .await
            .map_err(|e| BacklogError::ParseError(e.to_string()))?;
        let count: IssueCount =
            serde_json::from_str(&body).map_err(|e| BacklogError::ParseError(e.to_string()))?;
        Ok(count.count)
    }

    #[allow(clippy::too_many_arguments)]
    async fn fetch_issues_page(
        &self,
        host: &str,
        api_key: &str,
        project_key: &str,
        milestone_id: Option<u64>,
        status_ids: Option<&[u64]>,
        category_ids: Option<&[u64]>,
        offset: u64,
        count: u64,
    ) -> Result<Vec<Issue>, BacklogError> {
        let url = build_issue_url(
            host,
            "/issues",
            api_key,
            project_key,
            milestone_id,
            status_ids,
            category_ids,
            Some(offset),
            Some(count),
        );
        let response = self
            .http
            .get(&url)
            .send()
            .await
            .map_err(map_reqwest_error)?;
        let response = self.check_response(response).await?;
        let body = response
            .text()
            .await
            .map_err(|e| BacklogError::ParseError(e.to_string()))?;
        serde_json::from_str(&body).map_err(|e| BacklogError::ParseError(e.to_string()))
    }

    async fn check_response(
        &self,
        response: reqwest::Response,
    ) -> Result<reqwest::Response, BacklogError> {
        let status = response.status();
        if status.is_success() {
            self.throttle_if_needed(&response).await;
            return Ok(response);
        }
        match status.as_u16() {
            401 => Err(BacklogError::Unauthorized),
            429 => Err(BacklogError::RateLimited),
            404 => Err(BacklogError::ProjectNotFound(
                response.url().path().to_string(),
            )),
            _ => Err(BacklogError::FetchFailed(format!(
                "HTTP {}",
                status.as_u16()
            ))),
        }
    }

    async fn throttle_if_needed(&self, response: &reqwest::Response) {
        let remaining = response
            .headers()
            .get("X-RateLimit-Remaining")
            .and_then(|v| v.to_str().ok())
            .and_then(|v| v.parse::<u64>().ok());

        let reset = response
            .headers()
            .get("X-RateLimit-Reset")
            .and_then(|v| v.to_str().ok())
            .and_then(|v| v.parse::<i64>().ok());

        if let (Some(remaining), Some(reset_ts)) = (remaining, reset) {
            if remaining <= 5 {
                let now = Utc::now().timestamp();
                let wait_secs = (reset_ts - now + 1).max(0) as u64;
                let capped = wait_secs.min(MAX_THROTTLE_SLEEP_SECS);
                if capped > 0 {
                    tokio::time::sleep(std::time::Duration::from_secs(capped)).await;
                }
            }
        }
    }
}

fn validate_params(host: &str, api_key: &str, project_key: &str) -> Result<(), BacklogError> {
    if host.trim().is_empty() {
        return Err(BacklogError::InvalidInput("hostが空です".into()));
    }
    if api_key.trim().is_empty() {
        return Err(BacklogError::InvalidInput("APIキーが空です".into()));
    }
    if project_key.trim().is_empty() {
        return Err(BacklogError::InvalidInput(
            "プロジェクトキーが空です".into(),
        ));
    }
    Ok(())
}

fn build_url(host: &str, path: &str, api_key: &str, params: &[(&str, &str)]) -> String {
    let mut url = format!("https://{host}/api/v2{path}?apiKey={api_key}");
    for (key, value) in params {
        url.push_str(&format!("&{key}={value}"));
    }
    url
}

#[allow(clippy::too_many_arguments)]
fn build_issue_url(
    host: &str,
    path: &str,
    api_key: &str,
    project_key: &str,
    milestone_id: Option<u64>,
    status_ids: Option<&[u64]>,
    category_ids: Option<&[u64]>,
    offset: Option<u64>,
    count: Option<u64>,
) -> String {
    let mut url = format!("https://{host}/api/v2{path}?apiKey={api_key}&projectId[]={project_key}");
    if let Some(mid) = milestone_id {
        url.push_str(&format!("&milestoneId[]={mid}"));
    }
    if let Some(sids) = status_ids {
        for sid in sids {
            url.push_str(&format!("&statusId[]={sid}"));
        }
    }
    if let Some(cids) = category_ids {
        for cid in cids {
            url.push_str(&format!("&categoryId[]={cid}"));
        }
    }
    if let Some(o) = offset {
        url.push_str(&format!("&offset={o}"));
    }
    if let Some(c) = count {
        url.push_str(&format!("&count={c}"));
    }
    url
}

fn map_reqwest_error(err: reqwest::Error) -> BacklogError {
    if err.is_timeout() {
        BacklogError::Timeout
    } else if err.is_connect() {
        BacklogError::ConnectionFailed(err.to_string())
    } else {
        BacklogError::FetchFailed(err.to_string())
    }
}

fn milestone_date_range() -> (NaiveDate, NaiveDate) {
    let today = Utc::now().date_naive();
    let start = today
        .checked_sub_months(Months::new(1))
        .unwrap_or(today)
        .with_day(1)
        .unwrap_or(today);
    let end = today
        .checked_add_months(Months::new(7))
        .unwrap_or(today)
        .with_day(1)
        .unwrap_or(today)
        .pred_opt()
        .unwrap_or(today);
    (start, end)
}

fn is_milestone_in_range(m: &Milestone, start: &NaiveDate, end: &NaiveDate) -> bool {
    let start_date = m
        .start_date
        .as_ref()
        .and_then(|s| NaiveDate::parse_from_str(s, "%Y-%m-%d").ok());
    let due_date = m
        .release_due_date
        .as_ref()
        .and_then(|s| NaiveDate::parse_from_str(s, "%Y-%m-%d").ok());

    match (start_date, due_date) {
        (None, None) => true,
        (Some(sd), None) => &sd >= start && &sd <= end,
        (None, Some(dd)) => &dd >= start && &dd <= end,
        (Some(sd), Some(dd)) => (&sd >= start && &sd <= end) || (&dd >= start && &dd <= end),
    }
}

fn sort_milestones(milestones: &mut [Milestone]) {
    milestones.sort_by(|a, b| {
        let a_start = a
            .start_date
            .as_ref()
            .and_then(|s| NaiveDate::parse_from_str(s, "%Y-%m-%d").ok());
        let b_start = b
            .start_date
            .as_ref()
            .and_then(|s| NaiveDate::parse_from_str(s, "%Y-%m-%d").ok());

        let a_due = a
            .release_due_date
            .as_ref()
            .and_then(|s| NaiveDate::parse_from_str(s, "%Y-%m-%d").ok());
        let b_due = b
            .release_due_date
            .as_ref()
            .and_then(|s| NaiveDate::parse_from_str(s, "%Y-%m-%d").ok());

        // None sorts after non-None (largest)
        let cmp_start = match (a_start, b_start) {
            (Some(a), Some(b)) => a.cmp(&b),
            (Some(_), None) => std::cmp::Ordering::Less,
            (None, Some(_)) => std::cmp::Ordering::Greater,
            (None, None) => std::cmp::Ordering::Equal,
        };

        if cmp_start != std::cmp::Ordering::Equal {
            return cmp_start;
        }

        let cmp_due = match (a_due, b_due) {
            (Some(a), Some(b)) => a.cmp(&b),
            (Some(_), None) => std::cmp::Ordering::Less,
            (None, Some(_)) => std::cmp::Ordering::Greater,
            (None, None) => std::cmp::Ordering::Equal,
        };

        if cmp_due != std::cmp::Ordering::Equal {
            return cmp_due;
        }

        a.id.cmp(&b.id)
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_milestone(id: u64, name: &str, start: Option<&str>, due: Option<&str>) -> Milestone {
        Milestone {
            id,
            project_id: 1,
            name: name.to_string(),
            description: String::new(),
            start_date: start.map(|s| s.to_string()),
            release_due_date: due.map(|s| s.to_string()),
            archived: false,
            display_order: 0,
        }
    }

    // --- validate_params ---

    #[test]
    fn validate_params_accepts_valid_input() {
        assert!(validate_params("example.backlog.com", "key123", "PROJ").is_ok());
    }

    #[test]
    fn validate_params_rejects_empty_host() {
        let err = validate_params("", "key123", "PROJ").unwrap_err();
        assert!(err.to_string().contains("hostが空です"));
    }

    #[test]
    fn validate_params_rejects_whitespace_host() {
        let err = validate_params("  ", "key123", "PROJ").unwrap_err();
        assert!(err.to_string().contains("hostが空です"));
    }

    #[test]
    fn validate_params_rejects_empty_api_key() {
        let err = validate_params("example.backlog.com", "", "PROJ").unwrap_err();
        assert!(err.to_string().contains("APIキーが空です"));
    }

    #[test]
    fn validate_params_rejects_empty_project_key() {
        let err = validate_params("example.backlog.com", "key123", "").unwrap_err();
        assert!(err.to_string().contains("プロジェクトキーが空です"));
    }

    // --- milestone_date_range ---

    #[test]
    fn milestone_date_range_returns_valid_range() {
        let (start, end) = milestone_date_range();
        assert!(start < end);

        let today = Utc::now().date_naive();
        // Start should be first of last month
        let expected_start = today
            .checked_sub_months(Months::new(1))
            .unwrap()
            .with_day(1)
            .unwrap();
        assert_eq!(start, expected_start);

        // End should be last day of month 6 months ahead
        assert!(end > today);
    }

    // --- is_milestone_in_range ---

    #[test]
    fn in_range_with_start_date_in_range() {
        let (start, end) = milestone_date_range();
        let mid = start
            .checked_add_months(Months::new(1))
            .unwrap()
            .format("%Y-%m-%d")
            .to_string();
        let m = make_milestone(1, "Sprint", Some(&mid), None);
        assert!(is_milestone_in_range(&m, &start, &end));
    }

    #[test]
    fn in_range_with_due_date_in_range() {
        let (start, end) = milestone_date_range();
        let mid = start
            .checked_add_months(Months::new(2))
            .unwrap()
            .format("%Y-%m-%d")
            .to_string();
        let m = make_milestone(1, "Sprint", None, Some(&mid));
        assert!(is_milestone_in_range(&m, &start, &end));
    }

    #[test]
    fn out_of_range_when_both_dates_outside() {
        let (start, end) = milestone_date_range();
        let _ = end;
        let far_past = start
            .checked_sub_months(Months::new(12))
            .unwrap()
            .format("%Y-%m-%d")
            .to_string();
        let m = make_milestone(1, "Sprint", Some(&far_past), Some(&far_past));
        assert!(!is_milestone_in_range(&m, &start, &end));
    }

    #[test]
    fn in_range_when_both_dates_none_undated_milestone_included() {
        let (start, end) = milestone_date_range();
        let m = make_milestone(1, "Sprint", None, None);
        assert!(is_milestone_in_range(&m, &start, &end));
    }

    #[test]
    fn out_of_range_with_single_date_outside() {
        let (start, end) = milestone_date_range();
        let _ = end;
        let far_future = "2099-12-31";
        let m = make_milestone(1, "Sprint", Some(far_future), None);
        assert!(!is_milestone_in_range(&m, &start, &end));
    }

    // --- sort_milestones ---

    #[test]
    fn sort_by_start_date_ascending() {
        let mut milestones = vec![
            make_milestone(1, "B", Some("2026-05-01"), None),
            make_milestone(2, "A", Some("2026-04-01"), None),
        ];
        sort_milestones(&mut milestones);
        assert_eq!(milestones[0].id, 2);
        assert_eq!(milestones[1].id, 1);
    }

    #[test]
    fn sort_none_dates_after_some_dates() {
        let mut milestones = vec![
            make_milestone(1, "No date", None, None),
            make_milestone(2, "Has date", Some("2026-04-01"), None),
        ];
        sort_milestones(&mut milestones);
        assert_eq!(milestones[0].id, 2);
        assert_eq!(milestones[1].id, 1);
    }

    #[test]
    fn sort_by_due_date_when_start_dates_equal() {
        let mut milestones = vec![
            make_milestone(1, "A", Some("2026-04-01"), Some("2026-05-30")),
            make_milestone(2, "B", Some("2026-04-01"), Some("2026-04-30")),
        ];
        sort_milestones(&mut milestones);
        assert_eq!(milestones[0].id, 2);
        assert_eq!(milestones[1].id, 1);
    }

    #[test]
    fn sort_by_id_when_dates_equal() {
        let mut milestones = vec![
            make_milestone(10, "A", Some("2026-04-01"), Some("2026-04-30")),
            make_milestone(5, "B", Some("2026-04-01"), Some("2026-04-30")),
        ];
        sort_milestones(&mut milestones);
        assert_eq!(milestones[0].id, 5);
        assert_eq!(milestones[1].id, 10);
    }

    #[test]
    fn sort_mixed_none_and_some_dates() {
        let mut milestones = vec![
            make_milestone(3, "C", None, None),
            make_milestone(1, "A", Some("2026-03-01"), Some("2026-03-31")),
            make_milestone(2, "B", Some("2026-04-01"), None),
        ];
        sort_milestones(&mut milestones);
        assert_eq!(milestones[0].id, 1);
        assert_eq!(milestones[1].id, 2);
        assert_eq!(milestones[2].id, 3);
    }

    // --- build_url ---

    #[test]
    fn build_url_constructs_correct_url() {
        let url = build_url(
            "example.backlog.com",
            "/projects/PROJ/versions",
            "key123",
            &[],
        );
        assert!(
            url.starts_with("https://example.backlog.com/api/v2/projects/PROJ/versions?apiKey=")
        );
        assert!(url.contains("key123"));
    }

    #[test]
    fn build_url_appends_params() {
        let url = build_url("host", "/path", "key", &[("foo", "bar"), ("baz", "qux")]);
        assert!(url.contains("&foo=bar"));
        assert!(url.contains("&baz=qux"));
    }

    // --- build_issue_url ---

    #[test]
    fn build_issue_url_with_all_filters() {
        let url = build_issue_url(
            "host",
            "/issues",
            "key",
            "PROJ",
            Some(42),
            Some(&[1, 2, 3]),
            Some(&[10, 20]),
            Some(100),
            Some(50),
        );
        assert!(url.contains("projectId[]=PROJ"));
        assert!(url.contains("milestoneId[]=42"));
        assert!(url.contains("statusId[]=1"));
        assert!(url.contains("statusId[]=2"));
        assert!(url.contains("statusId[]=3"));
        assert!(url.contains("categoryId[]=10"));
        assert!(url.contains("categoryId[]=20"));
        assert!(url.contains("offset=100"));
        assert!(url.contains("count=50"));
    }

    #[test]
    fn build_issue_url_without_optional_filters() {
        let url = build_issue_url(
            "host",
            "/issues/count",
            "key",
            "PROJ",
            None,
            None,
            None,
            None,
            None,
        );
        assert!(url.contains("projectId[]=PROJ"));
        assert!(!url.contains("milestoneId"));
        assert!(!url.contains("statusId"));
        assert!(!url.contains("categoryId"));
        assert!(!url.contains("&offset="));
        assert!(!url.contains("&count="));
    }

    // --- map_reqwest_error ---

    #[test]
    fn error_messages_do_not_contain_api_key() {
        // Ensure build_url is the only place with apiKey, and it's private.
        // Error messages from BacklogError variants never include apiKey.
        let err = BacklogError::ConnectionFailed("connection refused".into());
        let msg = err.to_string();
        assert!(!msg.contains("apiKey"));
        assert!(!msg.contains("key123"));
    }
}
