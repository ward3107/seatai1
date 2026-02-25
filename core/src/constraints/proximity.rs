//! Proximity constraints - keep specific students together

use crate::models::Seat;

/// Trait for proximity constraints
pub trait ProximityConstraint {
    /// Check if the constraint is satisfied
    fn is_satisfied(&self, seats: &[Seat]) -> bool;

    /// Calculate satisfaction score (1 = satisfied, 0 = not satisfied)
    fn satisfaction_score(&self, seats: &[Seat]) -> f64;
}

/// Keep two specific students within N seats of each other
pub struct MaxDistanceConstraint {
    pub student1_id: String,
    pub student2_id: String,
    pub max_distance: usize,
}

impl MaxDistanceConstraint {
    pub fn new(student1: impl Into<String>, student2: impl Into<String>, max_distance: usize) -> Self {
        Self {
            student1_id: student1.into(),
            student2_id: student2.into(),
            max_distance,
        }
    }
}

impl ProximityConstraint for MaxDistanceConstraint {
    fn is_satisfied(&self, seats: &[Seat]) -> bool {
        self.satisfaction_score(seats) == 1.0
    }

    fn satisfaction_score(&self, seats: &[Seat]) -> f64 {
        let pos1 = seats.iter().find(|s| s.student_id.as_ref() == Some(&self.student1_id));
        let pos2 = seats.iter().find(|s| s.student_id.as_ref() == Some(&self.student2_id));

        match (pos1, pos2) {
            (Some(s1), Some(s2)) => {
                let distance = ((s1.position.row as i32 - s2.position.row as i32).abs()
                    + (s1.position.col as i32 - s2.position.col as i32).abs()) as usize;

                if distance <= self.max_distance {
                    1.0
                } else {
                    (self.max_distance as f64 / distance as f64).max(0.0)
                }
            }
            _ => 0.5, // Neutral if students not found
        }
    }
}
