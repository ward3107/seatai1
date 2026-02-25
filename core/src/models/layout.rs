//! Layout models

use serde::{Deserialize, Serialize};
use super::{Seat, LayoutType};

/// Classroom configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClassroomLayout {
    /// Type of layout
    pub layout_type: LayoutType,
    /// Number of rows
    pub rows: usize,
    /// Number of columns
    pub cols: usize,
    /// Total seats available
    pub total_seats: usize,
    /// All seats in the classroom
    pub seats: Vec<Seat>,
}

impl ClassroomLayout {
    /// Create a new empty classroom layout
    pub fn new(layout_type: LayoutType, rows: usize, cols: usize) -> Self {
        let total_seats = rows * cols;
        let seats = (0..rows)
            .flat_map(|row| {
                (0..cols).map(move |col| Seat::empty(row, col))
            })
            .collect();

        Self {
            layout_type,
            rows,
            cols,
            total_seats,
            seats,
        }
    }

    /// Create a rows layout (traditional classroom)
    pub fn rows(rows: usize, cols: usize) -> Self {
        Self::new(LayoutType::Rows, rows, cols)
    }

    /// Get seat at position
    pub fn get_seat(&self, row: usize, col: usize) -> Option<&Seat> {
        if row < self.rows && col < self.cols {
            Some(&self.seats[row * self.cols + col])
        } else {
            None
        }
    }

    /// Get mutable seat at position
    pub fn get_seat_mut(&mut self, row: usize, col: usize) -> Option<&mut Seat> {
        if row < self.rows && col < self.cols {
            Some(&mut self.seats[row * self.cols + col])
        } else {
            None
        }
    }

    /// Get all seats in a specific row
    pub fn get_row(&self, row: usize) -> Vec<&Seat> {
        self.seats
            .iter()
            .filter(|seat| seat.position.row == row)
            .collect()
    }

    /// Get all occupied seats
    pub fn occupied_seats(&self) -> Vec<&Seat> {
        self.seats.iter().filter(|s| !s.is_empty).collect()
    }

    /// Get all empty seats
    pub fn empty_seats(&self) -> Vec<&Seat> {
        self.seats.iter().filter(|s| s.is_empty).collect()
    }

    /// Count occupied seats
    pub fn occupied_count(&self) -> usize {
        self.seats.iter().filter(|s| !s.is_empty).count()
    }
}
