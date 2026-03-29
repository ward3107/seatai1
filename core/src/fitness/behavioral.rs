//! Behavioral balance fitness function

use crate::models::{Seat, Student, SeatingConstraints};
use std::collections::HashMap;

/// Calculate behavioral balance score (0-1)
///
/// Considers horizontal AND vertical adjacency:
/// - Incompatible pairs must not be adjacent → score 0.0
/// - Must-separate pairs must not be adjacent → score 0.0
/// - Friends adjacent → 0.7
/// - Keep-together pairs adjacent → 0.9
/// - Default: average behavior scores
pub fn calculate_behavioral_balance(
    seats: &[Seat],
    student_map: &HashMap<&str, &Student>,
    constraints: &SeatingConstraints,
) -> f64 {
    let mut scores: Vec<f64> = Vec::new();

    // Build a quick lookup: (row, col) → seat
    let seat_grid: HashMap<(usize, usize), &Seat> = seats
        .iter()
        .filter(|s| !s.is_empty)
        .map(|s| ((s.position.row, s.position.col), s))
        .collect();

    // Check all occupied seats against their neighbours
    for seat in seats.iter().filter(|s| !s.is_empty) {
        let id = match &seat.student_id {
            Some(id) => id,
            None => continue,
        };
        let student = match student_map.get(id.as_str()) {
            Some(s) => s,
            None => continue,
        };

        let row = seat.position.row;
        let col = seat.position.col;

        // Check horizontal neighbour (right only — avoids counting each pair twice)
        if let Some(right_seat) = seat_grid.get(&(row, col + 1)) {
            if let Some(ref right_id) = right_seat.student_id {
                if let Some(right_student) = student_map.get(right_id.as_str()) {
                    let pair_score = evaluate_pair(student, right_student, constraints);
                    scores.push(pair_score);
                }
            }
        }

        // Check vertical neighbour (below only — avoids counting each pair twice)
        if let Some(below_seat) = seat_grid.get(&(row + 1, col)) {
            if let Some(ref below_id) = below_seat.student_id {
                if let Some(below_student) = student_map.get(below_id.as_str()) {
                    let pair_score = evaluate_pair(student, below_student, constraints);
                    scores.push(pair_score);
                }
            }
        }
    }

    if scores.is_empty() {
        return 0.5;
    }

    scores.iter().sum::<f64>() / scores.len() as f64
}

/// Evaluate a pair of adjacent students
fn evaluate_pair(student1: &Student, student2: &Student, constraints: &SeatingConstraints) -> f64 {
    // HARD: must-separate pairs → 0.0
    for pair in &constraints.separate_pairs {
        if (student1.id == pair[0] && student2.id == pair[1])
            || (student1.id == pair[1] && student2.id == pair[0])
        {
            return 0.0;
        }
    }

    // HARD: incompatible students → 0.0
    if student1.incompatible_ids.contains(&student2.id)
        || student2.incompatible_ids.contains(&student1.id)
    {
        return 0.0;
    }

    // SOFT: keep-together pairs → 0.9
    for pair in &constraints.keep_together_pairs {
        if (student1.id == pair[0] && student2.id == pair[1])
            || (student1.id == pair[1] && student2.id == pair[0])
        {
            return 0.9;
        }
    }

    // SOFT: friends → 0.7
    if student1.friends_ids.contains(&student2.id)
        || student2.friends_ids.contains(&student1.id)
    {
        return 0.7;
    }

    // Default: average behavior score normalised to 0–1
    (student1.behavior_score + student2.behavior_score) / 200.0
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_incompatible_pair() {
        let s1 = Student::new("1", "Alice")
            .add_incompatible("2");
        let s2 = Student::new("2", "Bob");

        let constraints = SeatingConstraints::new();
        let score = evaluate_pair(&s1, &s2, &constraints);
        assert_eq!(score, 0.0);
    }

    #[test]
    fn test_incompatible_pair_symmetric() {
        // Only s2 lists s1 as incompatible (not s1→s2)
        let s1 = Student::new("1", "Alice");
        let s2 = Student::new("2", "Bob").add_incompatible("1");

        let constraints = SeatingConstraints::new();
        let score = evaluate_pair(&s1, &s2, &constraints);
        assert_eq!(score, 0.0, "Should detect incompatibility even if only one direction");
    }

    #[test]
    fn test_vertical_adjacency_scored() {
        let s1 = Student::new("1", "Alice").add_incompatible("2");
        let s2 = Student::new("2", "Bob");
        let s3 = Student::new("3", "Charlie");

        let constraints = SeatingConstraints::new();
        let mut map = HashMap::new();
        map.insert("1", &s1);
        map.insert("2", &s2);
        map.insert("3", &s3);

        // s1 at (0,0), s2 at (1,0) — vertical neighbours, incompatible
        // s3 at (0,1) — harmless
        let seats = vec![
            Seat::occupied(0, 0, "1"),
            Seat::occupied(0, 1, "3"),
            Seat::occupied(1, 0, "2"),
        ];

        let score = calculate_behavioral_balance(&seats, &map, &constraints);
        // One pair scores 0.0 (s1–s2 vertical), others score > 0
        assert!(score < 0.5, "Score {} should be low due to vertical incompatible pair", score);
    }
}
