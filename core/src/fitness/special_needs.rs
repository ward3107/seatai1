//! Special needs compliance fitness function

use crate::models::{Seat, Student};
use std::collections::HashMap;

/// Calculate special needs compliance score (0-1)
///
/// Checks if special needs are accommodated:
/// - Front row requirements
/// - Quiet area requirements
/// - Mobility accessibility
pub fn calculate_special_needs(
    seats: &[Seat],
    student_map: &HashMap<&str, &Student>,
) -> f64 {
    // Find students with special needs
    let special_needs_students: Vec<&&Student> = student_map
        .values()
        .filter(|s| {
            s.requires_front_row
                || s.requires_quiet_area
                || s.has_mobility_issues
                || !s.special_needs.is_empty()
        })
        .collect();

    if special_needs_students.is_empty() {
        return 1.0; // No special needs to accommodate
    }

    let mut scores: Vec<f64> = Vec::new();

    for student in special_needs_students {
        // Find this student's seat
        let student_seat = seats
            .iter()
            .find(|s| s.student_id.as_ref() == Some(&student.id));

        if let Some(seat) = student_seat {
            let mut score: f64 = 1.0;

            // Check front row requirement
            if student.requires_front_row && !seat.position.is_front_row {
                score -= 0.5;
            }

            // Check quiet area requirement (back rows are quieter)
            if student.requires_quiet_area && seat.position.row < 2 {
                // Too close to front (noisy area)
                score -= 0.3;
            }

            // Check mobility (should be near front or accessible)
            if student.has_mobility_issues && seat.position.row > 2 {
                // Not easily accessible
                score -= 0.3;
            }

            scores.push(score.max(0.0));
        } else {
            // Student not found in seats
            scores.push(0.0);
        }
    }

    if scores.is_empty() {
        return 1.0;
    }

    scores.iter().sum::<f64>() / scores.len() as f64
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_front_row_requirement_met() {
        let student = Student {
            id: "1".to_string(),
            name: "Alice".to_string(),
            requires_front_row: true,
            ..Default::default()
        };

        let mut map = HashMap::new();
        map.insert("1", &student);

        // Front row seat
        let seats = vec![Seat::occupied(0, 0, "1")];

        let score = calculate_special_needs(&seats, &map);
        assert!(score > 0.9);
    }

    #[test]
    fn test_front_row_requirement_not_met() {
        let student = Student {
            id: "1".to_string(),
            name: "Alice".to_string(),
            requires_front_row: true,
            ..Default::default()
        };

        let mut map = HashMap::new();
        map.insert("1", &student);

        // Back row seat (row 2)
        let seats = vec![Seat::occupied(2, 0, "1")];

        let score = calculate_special_needs(&seats, &map);
        assert!(score < 0.6);
    }
}
