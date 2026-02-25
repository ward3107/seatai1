//! Behavioral balance fitness function

use crate::models::{Seat, Student, SeatingConstraints};
use std::collections::HashMap;

/// Calculate behavioral balance score (0-1)
///
/// Considers:
/// - Incompatible pairs should not be adjacent
/// - Friends can be adjacent (but not too close to avoid distraction)
/// - Overall behavior balance in rows
pub fn calculate_behavioral_balance(
    seats: &[Seat],
    student_map: &HashMap<&str, &Student>,
    constraints: &SeatingConstraints,
) -> f64 {
    let mut scores: Vec<f64> = Vec::new();

    // Group seats by row for adjacency checking
    let mut rows: HashMap<usize, Vec<&Seat>> = HashMap::new();
    for seat in seats.iter().filter(|s| !s.is_empty) {
        rows.entry(seat.position.row)
            .or_default()
            .push(seat);
    }

    // Check adjacent pairs in each row
    for (_, row_seats) in rows {
        // Sort by column
        let mut sorted_seats = row_seats;
        sorted_seats.sort_by_key(|s| s.position.col);

        for i in 0..sorted_seats.len().saturating_sub(1) {
            let seat1 = sorted_seats[i];
            let seat2 = sorted_seats[i + 1];

            if let (Some(id1), Some(id2)) = (&seat1.student_id, &seat2.student_id) {
                if let (Some(s1), Some(s2)) = (
                    student_map.get(id1.as_str()),
                    student_map.get(id2.as_str()),
                ) {
                    let pair_score = evaluate_pair(s1, s2, constraints);
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
    // Check if they're in the "must separate" list
    for pair in &constraints.separate_pairs {
        if (student1.id == pair[0] && student2.id == pair[1])
            || (student1.id == pair[1] && student2.id == pair[0])
        {
            return 0.0; // Heavy penalty
        }
    }

    // Check if they're incompatible
    if student1.incompatible_ids.contains(&student2.id) {
        return 0.0;
    }

    // Check if they're friends (good but might distract)
    if student1.friends_ids.contains(&student2.id) {
        return 0.7; // Good but not perfect
    }

    // Check if they should be together
    for pair in &constraints.keep_together_pairs {
        if (student1.id == pair[0] && student2.id == pair[1])
            || (student1.id == pair[1] && student2.id == pair[0])
        {
            return 0.9;
        }
    }

    // Default: average behavior score
    (student1.behavior_score + student2.behavior_score) / 200.0
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::Gender;

    #[test]
    fn test_incompatible_pair() {
        let s1 = Student::new("1", "Alice")
            .add_incompatible("2");
        let s2 = Student::new("2", "Bob");

        let constraints = SeatingConstraints::new();
        let mut map = HashMap::new();
        map.insert("1", &s1);
        map.insert("2", &s2);

        let score = evaluate_pair(&s1, &s2, &constraints);
        assert_eq!(score, 0.0);
    }
}
