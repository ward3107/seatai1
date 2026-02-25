//! Fitness evaluation functions

mod academic;
mod behavioral;
mod diversity;
mod special_needs;

pub use academic::*;
pub use behavioral::*;
pub use diversity::*;
pub use special_needs::*;

use crate::models::{Student, Seat, SeatingConstraints, ObjectiveWeights, ObjectiveScores};
use std::collections::HashMap;

/// Calculate all fitness scores for an arrangement
pub fn calculate_fitness(
    seats: &[Seat],
    students: &[Student],
    weights: &ObjectiveWeights,
    constraints: &SeatingConstraints,
) -> ObjectiveScores {
    let student_map: HashMap<&str, &Student> = students
        .iter()
        .map(|s| (s.id.as_str(), s))
        .collect();

    ObjectiveScores {
        academic_balance: calculate_academic_balance(seats, &student_map),
        behavioral_balance: calculate_behavioral_balance(seats, &student_map, constraints),
        diversity: calculate_diversity(seats, &student_map),
        special_needs: calculate_special_needs(seats, &student_map),
    }
}

/// Calculate overall fitness score
pub fn calculate_total_fitness(scores: &ObjectiveScores, weights: &ObjectiveWeights) -> f64 {
    scores.weighted_average(weights)
}
