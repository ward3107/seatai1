//! Special needs compliance fitness function

use crate::models::{Seat, Student};
use std::collections::HashMap;

/// Calculate special needs compliance score (0-1)
///
/// Hard constraints (score = 0.0 if violated):
///   - Front-row requirement: student MUST be in row 0
///   - Mobility issues: student MUST be in rows 0–1
///
/// Soft constraints (graduated penalty):
///   - Quiet area preference
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

            // HARD: front-row requirement — row 0 or nothing
            if student.requires_front_row && !seat.position.is_front_row {
                score = 0.0;
                scores.push(score);
                continue;
            }

            // HARD: mobility issues — must be in rows 0 or 1
            if student.has_mobility_issues && seat.position.row > 1 {
                score = 0.0;
                scores.push(score);
                continue;
            }

            // SOFT: quiet area preference (back rows are quieter)
            if student.requires_quiet_area && seat.position.row < 2 {
                score -= 0.25;
            }

            // SOFT: special needs that require front seat
            for need in &student.special_needs {
                if need.requires_front_seat && !seat.position.is_front_row {
                    score -= 0.3;
                }
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
        assert!(score > 0.9, "Score {} should be > 0.9 for met requirement", score);
    }

    #[test]
    fn test_front_row_requirement_hard_fail() {
        let student = Student {
            id: "1".to_string(),
            name: "Alice".to_string(),
            requires_front_row: true,
            ..Default::default()
        };

        let mut map = HashMap::new();
        map.insert("1", &student);

        // NOT front row (row 2)
        let seats = vec![Seat::occupied(2, 0, "1")];

        let score = calculate_special_needs(&seats, &map);
        assert_eq!(score, 0.0, "Score should be 0.0 for hard violation");
    }

    #[test]
    fn test_mobility_hard_fail() {
        let student = Student {
            id: "1".to_string(),
            name: "Alice".to_string(),
            has_mobility_issues: true,
            ..Default::default()
        };

        let mut map = HashMap::new();
        map.insert("1", &student);

        // Row 3 — too far back
        let seats = vec![Seat::occupied(3, 0, "1")];

        let score = calculate_special_needs(&seats, &map);
        assert_eq!(score, 0.0, "Score should be 0.0 for mobility violation");
    }

    #[test]
    fn test_mobility_in_row_1_passes() {
        let student = Student {
            id: "1".to_string(),
            name: "Alice".to_string(),
            has_mobility_issues: true,
            ..Default::default()
        };

        let mut map = HashMap::new();
        map.insert("1", &student);

        // Row 1 — accessible
        let seats = vec![Seat::occupied(1, 0, "1")];

        let score = calculate_special_needs(&seats, &map);
        assert!(score > 0.9, "Score {} should be > 0.9 for row 1 mobility", score);
    }
}
