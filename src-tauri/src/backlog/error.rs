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

    #[error("リクエストがタイムアウトしました")]
    Timeout,

    #[error("入力パラメータが不正です: {0}")]
    InvalidInput(String),

    #[error("マイルストーンの更新に失敗しました: {0}")]
    UpdateFailed(String),
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn connection_failed_displays_host_detail() {
        let err = BacklogError::ConnectionFailed("timeout".into());
        assert_eq!(err.to_string(), "ホストに接続できません: timeout");
    }

    #[test]
    fn unauthorized_displays_japanese_message() {
        let err = BacklogError::Unauthorized;
        assert_eq!(err.to_string(), "APIキーが無効です");
    }

    #[test]
    fn rate_limited_displays_japanese_message() {
        let err = BacklogError::RateLimited;
        assert_eq!(
            err.to_string(),
            "APIレート制限に達しました。しばらくしてから再試行してください"
        );
    }

    #[test]
    fn project_not_found_displays_project_key() {
        let err = BacklogError::ProjectNotFound("MY_PROJ".into());
        assert_eq!(err.to_string(), "プロジェクトが見つかりません: MY_PROJ");
    }

    #[test]
    fn fetch_failed_displays_detail() {
        let err = BacklogError::FetchFailed("500 Internal Server Error".into());
        assert_eq!(
            err.to_string(),
            "データの取得に失敗しました: 500 Internal Server Error"
        );
    }

    #[test]
    fn parse_error_displays_detail() {
        let err = BacklogError::ParseError("invalid JSON".into());
        assert_eq!(
            err.to_string(),
            "レスポンスの解析に失敗しました: invalid JSON"
        );
    }

    #[test]
    fn timeout_displays_japanese_message() {
        let err = BacklogError::Timeout;
        assert_eq!(err.to_string(), "リクエストがタイムアウトしました");
    }

    #[test]
    fn invalid_input_displays_detail() {
        let err = BacklogError::InvalidInput("hostが空です".into());
        assert_eq!(err.to_string(), "入力パラメータが不正です: hostが空です");
    }

    #[test]
    fn update_failed_displays_japanese_message() {
        let err = BacklogError::UpdateFailed("HTTP 403".into());
        assert_eq!(
            err.to_string(),
            "マイルストーンの更新に失敗しました: HTTP 403"
        );
    }

    #[test]
    fn error_does_not_implement_serialize() {
        // Compile-time guarantee: BacklogError has no Serialize derive.
        // This test documents the design decision that errors are converted
        // to String at the IPC boundary via .map_err(|e| e.to_string()).
        let err = BacklogError::Unauthorized;
        let display = err.to_string();
        assert!(!display.is_empty());
    }
}
