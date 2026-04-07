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

#[derive(Debug, Clone, Deserialize)]
pub struct IssueCount {
    pub count: u64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MilestoneWithIssues {
    pub milestone: Milestone,
    pub issues: Vec<Issue>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BoardData {
    pub milestones: Vec<MilestoneWithIssues>,
    pub unassigned_issues: Vec<Issue>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn milestone_deserializes_from_camel_case_json() {
        let json = r#"{
            "id": 123,
            "projectId": 456,
            "name": "Sprint 2026-04",
            "description": "April sprint",
            "startDate": "2026-04-01",
            "releaseDueDate": "2026-04-30",
            "archived": false,
            "displayOrder": 1
        }"#;
        let m: Milestone = serde_json::from_str(json).unwrap();
        assert_eq!(m.id, 123);
        assert_eq!(m.project_id, 456);
        assert_eq!(m.name, "Sprint 2026-04");
        assert_eq!(m.start_date, Some("2026-04-01".to_string()));
        assert_eq!(m.release_due_date, Some("2026-04-30".to_string()));
        assert!(!m.archived);
        assert_eq!(m.display_order, 1);
    }

    #[test]
    fn milestone_deserializes_with_null_dates() {
        let json = r#"{
            "id": 1,
            "projectId": 2,
            "name": "Undated",
            "description": "",
            "startDate": null,
            "releaseDueDate": null,
            "archived": false,
            "displayOrder": 0
        }"#;
        let m: Milestone = serde_json::from_str(json).unwrap();
        assert!(m.start_date.is_none());
        assert!(m.release_due_date.is_none());
    }

    #[test]
    fn issue_deserializes_with_nested_types() {
        let json = r##"{
            "id": 100,
            "projectId": 1,
            "issueKey": "PROJ-100",
            "keyId": 100,
            "summary": "Fix bug",
            "description": "Details here",
            "status": {
                "id": 1,
                "projectId": 1,
                "name": "Open",
                "color": "#ed8077",
                "displayOrder": 1000
            },
            "priority": {
                "id": 3,
                "name": "Normal"
            },
            "assignee": {
                "id": 10,
                "userId": "user1",
                "name": "Taro",
                "roleType": 2,
                "mailAddress": "taro@example.com"
            },
            "milestone": [
                {
                    "id": 50,
                    "projectId": 1,
                    "name": "Sprint 2026-04",
                    "description": "",
                    "startDate": "2026-04-01",
                    "releaseDueDate": "2026-04-30",
                    "archived": false,
                    "displayOrder": 1
                }
            ],
            "category": [
                {
                    "id": 5,
                    "name": "Backend",
                    "displayOrder": 0
                }
            ],
            "startDate": null,
            "dueDate": null,
            "created": "2026-03-15T10:00:00Z",
            "updated": "2026-04-01T12:00:00Z"
        }"##;
        let issue: Issue = serde_json::from_str(json).unwrap();
        assert_eq!(issue.id, 100);
        assert_eq!(issue.issue_key, "PROJ-100");
        assert_eq!(issue.summary, "Fix bug");
        assert_eq!(issue.status.name, "Open");
        assert_eq!(issue.priority.as_ref().unwrap().name, "Normal");
        assert_eq!(issue.assignee.as_ref().unwrap().name, "Taro");
        assert_eq!(issue.milestone.len(), 1);
        assert_eq!(issue.milestone[0].name, "Sprint 2026-04");
        assert_eq!(issue.category.len(), 1);
        assert_eq!(issue.category[0].name, "Backend");
    }

    #[test]
    fn issue_deserializes_with_minimal_fields() {
        let json = r##"{
            "id": 200,
            "projectId": 1,
            "issueKey": "PROJ-200",
            "keyId": 200,
            "summary": "Minimal issue",
            "description": null,
            "status": {
                "id": 1,
                "projectId": null,
                "name": "Open",
                "color": "#ed8077",
                "displayOrder": 1000
            },
            "priority": null,
            "assignee": null,
            "milestone": [],
            "category": [],
            "startDate": null,
            "dueDate": null,
            "created": "2026-03-15T10:00:00Z",
            "updated": "2026-04-01T12:00:00Z"
        }"##;
        let issue: Issue = serde_json::from_str(json).unwrap();
        assert_eq!(issue.id, 200);
        assert!(issue.description.is_none());
        assert!(issue.priority.is_none());
        assert!(issue.assignee.is_none());
        assert!(issue.milestone.is_empty());
        assert!(issue.category.is_empty());
    }

    #[test]
    fn issue_count_deserializes() {
        let json = r#"{"count": 42}"#;
        let ic: IssueCount = serde_json::from_str(json).unwrap();
        assert_eq!(ic.count, 42);
    }

    #[test]
    fn board_data_serializes_to_camel_case() {
        let board = BoardData {
            milestones: vec![],
            unassigned_issues: vec![],
        };
        let json = serde_json::to_string(&board).unwrap();
        assert!(json.contains("\"milestones\""));
        assert!(json.contains("\"unassignedIssues\""));
        assert!(!json.contains("\"unassigned_issues\""));
    }

    #[test]
    fn board_data_serializes_with_milestone_data() {
        let milestone = Milestone {
            id: 1,
            project_id: 1,
            name: "Sprint 2026-04".to_string(),
            description: String::new(),
            start_date: Some("2026-04-01".to_string()),
            release_due_date: Some("2026-04-30".to_string()),
            archived: false,
            display_order: 1,
        };
        let board = BoardData {
            milestones: vec![MilestoneWithIssues {
                milestone,
                issues: vec![],
            }],
            unassigned_issues: vec![],
        };
        let json = serde_json::to_string(&board).unwrap();
        assert!(json.contains("\"milestones\""));
        assert!(json.contains("Sprint 2026-04"));
        assert!(json.contains("\"unassignedIssues\""));
    }

    #[test]
    fn milestone_with_issues_serializes_to_camel_case() {
        let mwi = MilestoneWithIssues {
            milestone: Milestone {
                id: 1,
                project_id: 1,
                name: "Test".to_string(),
                description: String::new(),
                start_date: None,
                release_due_date: None,
                archived: false,
                display_order: 0,
            },
            issues: vec![],
        };
        let json = serde_json::to_string(&mwi).unwrap();
        // Verify camelCase serialization works for nested structure
        assert!(json.contains("\"milestone\""));
        assert!(json.contains("\"issues\""));
    }
}
