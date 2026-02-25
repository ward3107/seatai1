//! Diversity fitness function

use crate::models::{Seat, Student, Gender};
use std::collections::{HashMap, HashSet};

/// Calculate diversity score (0-1)
///
/// Considers:
/// - Gender diversity within rows
/// - Language diversity within rows
pub fn calculate_diversity(
    seats: &[Seat],
    student_map: &HashMap<&str, &Student>,
) -> f64 {
    // Group seats by row
    let mut rows: HashMap<usize, Vec<&Seat>> = HashMap::new();
    for seat in seats.iter().filter(|s| !s.is_empty) {
        rows.entry(seat.position.row)
            .or_default()
            .push(seat);
    }

    let mut scores: Vec<f64> = Vec::new();

    for (_, row_seats) in rows {
        if row_seats.len() < 2 {
            continue;
        }

        // Calculate gender diversity
        let genders: Vec<Gender> = row_seats
            .iter()
            .filter_map(|seat| {
                seat.student_id.as_ref().and_then(|id| {
                    student_map.get(id.as_str()).map(|s| s.gender)
                })
            })
            .collect();

        let unique_genders: HashSet<_> = genders.iter().collect();
        let gender_score = (unique_genders.len() as f64 / 2.0).min(1.0);

        // Calculate language diversity
        let languages: Vec<&str> = row_seats
            .iter()
            .filter_map(|seat| {
                seat.student_id.as_ref().and_then(|id| {
                    student_map.get(id.as_str()).and_then(|s| {
                        s.primary_language.as_deref()
                    })
                })
            })
            .collect();

        let language_score = if languages.is_empty() {
            0.5
        } else {
            let unique_languages: HashSet<_> = languages.iter().collect();
            (unique_languages.len() as f64 / languages.len() as f64).min(1.0)
        };

        // Average diversity score
        scores.push((gender_score + language_score) / 2.0);
    }

    if scores.is_empty() {
        return 0.5;
    }

    scores.iter().sum::<f64>() / scores.len() as f64
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::{AcademicLevel, BehaviorLevel};

    fn create_test_student(id: &str, gender: Gender, language: &str) -> Student {
        Student {
            id: id.to_string(),
            name: format!("Student {}", id),
            gender,
            primary_language: Some(language.to_string()),
            ..Default::default()
        }
    }

    #[test]
    fn test_diversity_balanced() {
        let s1 = create_test_student("1", Gender::Male, "English");
        let s2 = create_test_student("2", Gender::Female, "Spanish");

        let mut map = HashMap::new();
        map.insert("1", &s1);
        map.insert("2", &s2);

        let seats = vec![
            Seat::occupied(0, 0, "1"),
            Seat::occupied(0, 1, "2"),
        ];

        let score = calculate_diversity(&seats, &map);
        assert!(score > 0.7);
    }
}
