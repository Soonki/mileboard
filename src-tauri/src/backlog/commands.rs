use tauri::State;

use super::client::BacklogClient;
use super::types::BoardData;

/// Fetch complete board data from Backlog API.
///
/// This is the single IPC entry point for board data (D-02).
/// Parameters use String (not &str) because Tauri async commands
/// cannot use borrowed parameters (Pitfall 4 from RESEARCH).
///
/// Error handling: BacklogError.to_string() produces Japanese messages (D-04).
/// All-or-nothing: any sub-fetch failure returns Err (D-03).
#[tauri::command]
pub async fn fetch_board_data(
    client: State<'_, BacklogClient>,
    host: String,
    api_key: String,
    project_id: u64,
    project_key: String,
    milestone_prefix: String,
    category_ids: Option<Vec<u64>>,
) -> Result<BoardData, String> {
    client
        .fetch_board(
            &host,
            &api_key,
            project_id,
            &project_key,
            &milestone_prefix,
            category_ids.as_deref(),
        )
        .await
        .map_err(|e| e.to_string())
}

/// Update an issue's milestone via Backlog PATCH API.
///
/// Preserves non-prefix milestones while swapping the prefix-matching one.
/// Parameters use owned String types (Tauri async command Send constraint).
///
/// - `new_milestone_id`: Some(id) to move to a milestone, None to move to unassigned
/// - `milestone_prefix`: prefix to identify managed milestones (e.g., "Sprint")
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
