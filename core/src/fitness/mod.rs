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
use crate::constraints::{
    MinDistanceConstraint, MaxDistanceConstraint,
    SeparationConstraint, ProximityConstraint,
};
use std::collections::HashMap;

/// Calculate all fitness scores for an arrangement
pub fn calculate_fitness(
    seats: &[Seat],
    students: &[Student],
    _weights: &ObjectiveWeights,
    constraints: &SeatingConstraints,
) -> ObjectiveScores {
    let student_map: HashMap<&str, &Student> = students
        .iter()
        .map(|s| (s.id.as_str(), s))
        .collect();

    // Adjacent-pair behavioural score (already handles separate/keep-together adjacency)
    let adjacency_score = calculate_behavioral_balance(seats, &student_map, constraints);

    // Global distance-based constraint compliance score
    let compliance = calculate_constraints_compliance(seats, constraints);

    // Blend: 70% adjacency + 30% global compliance
    // When there are no explicit constraints, compliance = 1.0 and acts as a slight boost.
    let behavioral_balance = adjacency_score * 0.7 + compliance * 0.3;

    ObjectiveScores {
        academic_balance: calculate_academic_balance(seats, &student_map),
        behavioral_balance,
        diversity: calculate_diversity(seats, &student_map),
        special_needs: calculate_special_needs(seats, &student_map),
    }
}

/// Score overall constraint compliance using distance-based rules.
///
/// - `separate_pairs`: must be ≥ 3 Manhattan-distance steps apart
/// - `keep_together_pairs`: must be ≤ 2 Manhattan-distance steps apart
///
/// Returns 1.0 when all constraints are satisfied, 0.0 when all are violated.
fn calculate_constraints_compliance(seats: &[Seat], constraints: &SeatingConstraints) -> f64 {
    let mut scores: Vec<f64> = Vec::new();

    for pair in &constraints.separate_pairs {
        let c = MinDistanceConstraint::new(pair[0].clone(), pair[1].clone(), 3);
        scores.push(1.0 - c.violation_score(seats));
    }

    for pair in &constraints.keep_together_pairs {
        let c = MaxDistanceConstraint::new(pair[0].clone(), pair[1].clone(), 2);
        scores.push(c.satisfaction_score(seats));
    }

    if scores.is_empty() {
        return 1.0; // No explicit constraints → full compliance
    }

    scores.iter().sum::<f64>() / scores.len() as f64
}

/// Calculate overall fitness score
pub fn calculate_total_fitness(scores: &ObjectiveScores, weights: &ObjectiveWeights) -> f64 {
    scores.weighted_average(weights)
}
