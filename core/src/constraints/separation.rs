//! Separation constraints - keep specific students apart

use crate::models::Seat;

/// Trait for separation constraints
pub trait SeparationConstraint {
    /// Check if the constraint is satisfied
    fn is_satisfied(&self, seats: &[Seat]) -> bool;

    /// Calculate violation score (0 = satisfied, 1 = fully violated)
    fn violation_score(&self, seats: &[Seat]) -> f64;
}

/// Keep two specific students separated by at least N seats
pub struct MinDistanceConstraint {
    pub student1_id: String,
    pub student2_id: String,
    pub min_distance: usize,
}

impl MinDistanceConstraint {
    pub fn new(student1: impl Into<String>, student2: impl Into<String>, min_distance: usize) -> Self {
        Self {
            student1_id: student1.into(),
            student2_id: student2.into(),
            min_distance,
        }
    }
}

impl SeparationConstraint for MinDistanceConstraint {
    fn is_satisfied(&self, seats: &[Seat]) -> bool {
        self.violation_score(seats) == 0.0
    }

    fn violation_score(&self, seats: &[Seat]) -> f64 {
        let pos1 = seats.iter().find(|s| s.student_id.as_ref() == Some(&self.student1_id));
        let pos2 = seats.iter().find(|s| s.student_id.as_ref() == Some(&self.student2_id));

        match (pos1, pos2) {
            (Some(s1), Some(s2)) => {
                let distance = ((s1.position.row as i32 - s2.position.row as i32).abs()
                    + (s1.position.col as i32 - s2.position.col as i32).abs()) as usize;

                if distance < self.min_distance {
                    1.0 - (distance as f64 / self.min_distance as f64)
                } else {
                    0.0
                }
            }
            _ => 0.0,
        }
    }
}
