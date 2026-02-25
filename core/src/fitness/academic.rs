//! Academic balance fitness function

use crate::models::{Seat, Student};
use std::collections::HashMap;

/// Calculate academic balance score (0-1)
///
/// Measures how well academic abilities are distributed across rows.
/// Lower variance within rows = better balance = higher score.
pub fn calculate_academic_balance(
    seats: &[Seat],
    student_map: &HashMap<&str, &Student>,
) -> f64 {
    // Group seats by row
    let mut rows: HashMap<usize, Vec<f64>> = HashMap::new();

    for seat in seats.iter().filter(|s| !s.is_empty) {
        if let Some(student_id) = &seat.student_id {
            if let Some(student) = student_map.get(student_id.as_str()) {
                rows.entry(seat.position.row)
                    .or_default()
                    .push(student.academic_score);
            }
        }
    }

    if rows.is_empty() {
        return 0.5;
    }

    // Calculate variance for each row and convert to score
    let row_scores: Vec<f64> = rows
        .values()
        .filter(|scores| scores.len() > 1)
        .map(|scores| {
            let variance = calculate_variance(scores);
            // Lower variance = higher score
            1.0 / (1.0 + variance / 100.0)
        })
        .collect();

    if row_scores.is_empty() {
        return 0.5;
    }

    average(&row_scores)
}

/// Calculate variance of a set of values
fn calculate_variance(values: &[f64]) -> f64 {
    if values.is_empty() {
        return 0.0;
    }

    let mean = values.iter().sum::<f64>() / values.len() as f64;
    let variance = values
        .iter()
        .map(|x| (x - mean).powi(2))
        .sum::<f64>()
        / values.len() as f64;

    variance
}

/// Calculate average of values
fn average(values: &[f64]) -> f64 {
    if values.is_empty() {
        return 0.0;
    }
    values.iter().sum::<f64>() / values.len() as f64
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_variance() {
        let values = vec![10.0, 20.0, 30.0];
        let var = calculate_variance(&values);
        assert!((var - 66.67).abs() < 0.1);
    }

    #[test]
    fn test_academic_balance_perfect() {
        // All same scores = perfect balance
        let scores = vec![75.0, 75.0, 75.0];
        assert!((calculate_variance(&scores) - 0.0).abs() < 0.01);
    }
}
