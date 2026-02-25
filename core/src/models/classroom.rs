//! Classroom and seating models

use serde::{Deserialize, Serialize};
use super::Student;

/// Type alias for student ID
pub type StudentId = String;

/// Position of a seat in the classroom
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct SeatPosition {
    /// Row number (0-indexed, 0 is front)
    pub row: usize,
    /// Column number (0-indexed)
    pub col: usize,
    /// Is this in the front row
    #[serde(default)]
    pub is_front_row: bool,
    /// Is this near the teacher's desk
    #[serde(default)]
    pub is_near_teacher: bool,
}

impl SeatPosition {
    /// Create a new seat position
    pub fn new(row: usize, col: usize) -> Self {
        Self {
            row,
            col,
            is_front_row: row == 0,
            is_near_teacher: row < 2,
        }
    }
}

/// Individual seat in the classroom
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Seat {
    /// Position in the classroom
    pub position: SeatPosition,
    /// ID of student assigned to this seat (None if empty)
    pub student_id: Option<StudentId>,
    /// Is this seat empty
    #[serde(default)]
    pub is_empty: bool,
}

impl Seat {
    /// Create an empty seat at the given position
    pub fn empty(row: usize, col: usize) -> Self {
        Self {
            position: SeatPosition::new(row, col),
            student_id: None,
            is_empty: true,
        }
    }

    /// Create an occupied seat
    pub fn occupied(row: usize, col: usize, student_id: impl Into<String>) -> Self {
        Self {
            position: SeatPosition::new(row, col),
            student_id: Some(student_id.into()),
            is_empty: false,
        }
    }

    /// Assign a student to this seat
    pub fn assign(&mut self, student_id: impl Into<String>) {
        self.student_id = Some(student_id.into());
        self.is_empty = false;
    }

    /// Clear this seat
    pub fn clear(&mut self) {
        self.student_id = None;
        self.is_empty = true;
    }
}

/// Classroom layout configuration
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum LayoutType {
    Rows,
    Pairs,
    Clusters,
    UShape,
    Circle,
    Flexible,
}

impl Default for LayoutType {
    fn default() -> Self {
        Self::Rows
    }
}

/// Seating constraints for optimization
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct SeatingConstraints {
    /// Pairs of students that must be separated
    #[serde(default)]
    pub separate_pairs: Vec<[String; 2]>,
    /// Pairs of students that should be near each other
    #[serde(default)]
    pub keep_together_pairs: Vec<[String; 2]>,
    /// Students that must be in front row
    #[serde(default)]
    pub front_row_ids: Vec<String>,
    /// Students that should be in back rows
    #[serde(default)]
    pub back_row_ids: Vec<String>,
}

impl SeatingConstraints {
    /// Create empty constraints
    pub fn new() -> Self {
        Self::default()
    }

    /// Add a separation constraint
    pub fn separate(mut self, student1: impl Into<String>, student2: impl Into<String>) -> Self {
        self.separate_pairs.push([student1.into(), student2.into()]);
        self
    }

    /// Add a proximity constraint
    pub fn keep_together(mut self, student1: impl Into<String>, student2: impl Into<String>) -> Self {
        self.keep_together_pairs.push([student1.into(), student2.into()]);
        self
    }
}
