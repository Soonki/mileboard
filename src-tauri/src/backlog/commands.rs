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
    project_key: String,
    milestone_prefix: String,
    category_ids: Option<Vec<u64>>,
) -> Result<BoardData, String> {
    client
        .fetch_board(
            &host,
            &api_key,
            &project_key,
            &milestone_prefix,
            category_ids.as_deref(),
        )
        .await
        .map_err(|e| e.to_string())
}
