mod backlog;

use backlog::client::BacklogClient;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .manage(BacklogClient::new())
        .invoke_handler(tauri::generate_handler![
            backlog::commands::fetch_board_data,
            backlog::commands::update_issue_milestone
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
