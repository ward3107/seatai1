//! Student data model

use serde::{Deserialize, Serialize};

/// Student gender type
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Gender {
    Male,
    Female,
    Other,
}

impl Default for Gender {
    fn default() -> Self {
        Self::Other
    }
}

/// Academic performance level
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AcademicLevel {
    Advanced,
    Proficient,
    Basic,
    BelowBasic,
}

impl Default for AcademicLevel {
    fn default() -> Self {
        Self::Proficient
    }
}

impl AcademicLevel {
    /// Convert to numeric score for calculations
    pub fn to_score(&self) -> f64 {
        match self {
            Self::Advanced => 95.0,
            Self::Proficient => 75.0,
            Self::Basic => 55.0,
            Self::BelowBasic => 35.0,
        }
    }
}

/// Behavior level
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum BehaviorLevel {
    Excellent,
    Good,
    Average,
    Challenging,
}

impl Default for BehaviorLevel {
    fn default() -> Self {
        Self::Good
    }
}

impl BehaviorLevel {
    /// Convert to numeric score for calculations
    pub fn to_score(&self) -> f64 {
        match self {
            Self::Excellent => 95.0,
            Self::Good => 80.0,
            Self::Average => 60.0,
            Self::Challenging => 40.0,
        }
    }
}

/// Special need or accommodation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpecialNeed {
    #[serde(rename = "type")]
    pub need_type: String,
    pub description: Option<String>,
    pub requires_front_seat: bool,
    pub requires_support_buddy: bool,
}

impl Default for SpecialNeed {
    fn default() -> Self {
        Self {
            need_type: String::new(),
            description: None,
            requires_front_seat: false,
            requires_support_buddy: false,
        }
    }
}

/// Student model with all attributes for optimization
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Student {
    /// Unique identifier
    pub id: String,
    /// Student name
    pub name: String,
    /// Gender
    pub gender: Gender,
    /// Age (optional)
    #[serde(default)]
    pub age: Option<u8>,
    /// Academic level
    #[serde(default)]
    pub academic_level: AcademicLevel,
    /// Academic score (0-100)
    #[serde(default)]
    pub academic_score: f64,
    /// Behavior level
    #[serde(default)]
    pub behavior_level: BehaviorLevel,
    /// Behavior score (0-100)
    #[serde(default)]
    pub behavior_score: f64,
    /// IDs of friends
    #[serde(default)]
    pub friends_ids: Vec<String>,
    /// IDs of incompatible students
    #[serde(default)]
    pub incompatible_ids: Vec<String>,
    /// Special needs
    #[serde(default)]
    pub special_needs: Vec<SpecialNeed>,
    /// Must sit in front row
    #[serde(default)]
    pub requires_front_row: bool,
    /// Needs quiet area
    #[serde(default)]
    pub requires_quiet_area: bool,
    /// Has mobility constraints
    #[serde(default)]
    pub has_mobility_issues: bool,
    /// Primary language
    #[serde(default)]
    pub primary_language: Option<String>,
    /// Is bilingual
    #[serde(default)]
    pub is_bilingual: bool,
}

impl Default for Student {
    fn default() -> Self {
        Self {
            id: String::new(),
            name: String::new(),
            gender: Gender::default(),
            age: None,
            academic_level: AcademicLevel::default(),
            academic_score: 70.0,
            behavior_level: BehaviorLevel::default(),
            behavior_score: 70.0,
            friends_ids: Vec::new(),
            incompatible_ids: Vec::new(),
            special_needs: Vec::new(),
            requires_front_row: false,
            requires_quiet_area: false,
            has_mobility_issues: false,
            primary_language: None,
            is_bilingual: false,
        }
    }
}

impl Student {
    /// Create a new student with minimal info
    pub fn new(id: impl Into<String>, name: impl Into<String>) -> Self {
        Self {
            id: id.into(),
            name: name.into(),
            ..Default::default()
        }
    }

    /// Set gender
    pub fn with_gender(mut self, gender: Gender) -> Self {
        self.gender = gender;
        self
    }

    /// Set academic info
    pub fn with_academic(mut self, level: AcademicLevel, score: f64) -> Self {
        self.academic_level = level;
        self.academic_score = score;
        self
    }

    /// Set behavior info
    pub fn with_behavior(mut self, level: BehaviorLevel, score: f64) -> Self {
        self.behavior_level = level;
        self.behavior_score = score;
        self
    }

    /// Set front row requirement
    pub fn with_front_row(mut self, requires: bool) -> Self {
        self.requires_front_row = requires;
        self
    }

    /// Add friend
    pub fn add_friend(mut self, friend_id: impl Into<String>) -> Self {
        self.friends_ids.push(friend_id.into());
        self
    }

    /// Add incompatible student
    pub fn add_incompatible(mut self, student_id: impl Into<String>) -> Self {
        self.incompatible_ids.push(student_id.into());
        self
    }
}
