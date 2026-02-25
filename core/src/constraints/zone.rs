//! Zone constraints - assign students to specific zones

use crate::models::Seat;

/// Zone types in the classroom
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Zone {
    Front,
    Back,
    Left,
    Right,
    Center,
    Corners,
}

/// Trait for zone constraints
pub trait ZoneConstraint {
    /// Check if the constraint is satisfied
    fn is_satisfied(&self, seats: &[Seat]) -> bool;

    /// Calculate satisfaction score
    fn satisfaction_score(&self, seats: &[Seat]) -> f64;
}

/// Keep a student in a specific zone
pub struct StudentZoneConstraint {
    pub student_id: String,
    pub required_zone: Zone,
    pub total_rows: usize,
    pub total_cols: usize,
}

impl StudentZoneConstraint {
    pub fn new(student_id: impl Into<String>, zone: Zone, rows: usize, cols: usize) -> Self {
        Self {
            student_id: student_id.into(),
            required_zone: zone,
            total_rows: rows,
            total_cols: cols,
        }
    }

    fn is_in_zone(&self, seat: &Seat) -> bool {
        let row = seat.position.row;
        let col = seat.position.col;

        match self.required_zone {
            Zone::Front => row < self.total_rows / 3,
            Zone::Back => row >= self.total_rows * 2 / 3,
            Zone::Left => col < self.total_cols / 3,
            Zone::Right => col >= self.total_cols * 2 / 3,
            Zone::Center => {
                row >= self.total_rows / 3
                    && row < self.total_rows * 2 / 3
                    && col >= self.total_cols / 3
                    && col < self.total_cols * 2 / 3
            }
            Zone::Corners => {
                (row == 0 || row == self.total_rows - 1)
                    && (col == 0 || col == self.total_cols - 1)
            }
        }
    }
}

impl ZoneConstraint for StudentZoneConstraint {
    fn is_satisfied(&self, seats: &[Seat]) -> bool {
        seats
            .iter()
            .find(|s| s.student_id.as_ref() == Some(&self.student_id))
            .map(|s| self.is_in_zone(s))
            .unwrap_or(true)
    }

    fn satisfaction_score(&self, seats: &[Seat]) -> f64 {
        if self.is_satisfied(seats) {
            1.0
        } else {
            0.0
        }
    }
}
