//! Optimization result models

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use super::{ClassroomLayout, SeatPosition};

/// Individual objective scores
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ObjectiveScores {
    /// Academic balance score (0-1)
    pub academic_balance: f64,
    /// Behavioral balance score (0-1)
    pub behavioral_balance: f64,
    /// Diversity score (0-1)
    pub diversity: f64,
    /// Special needs compliance score (0-1)
    pub special_needs: f64,
}

impl ObjectiveScores {
    /// Calculate weighted average
    pub fn weighted_average(&self, weights: &ObjectiveWeights) -> f64 {
        weights.academic_balance * self.academic_balance
            + weights.behavioral_balance * self.behavioral_balance
            + weights.diversity * self.diversity
            + weights.special_needs * self.special_needs
    }
}

/// Weights for optimization objectives
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ObjectiveWeights {
    /// Weight for academic balance (default: 0.3)
    pub academic_balance: f64,
    /// Weight for behavioral balance (default: 0.3)
    pub behavioral_balance: f64,
    /// Weight for diversity (default: 0.2)
    pub diversity: f64,
    /// Weight for special needs (default: 0.2)
    pub special_needs: f64,
}

impl Default for ObjectiveWeights {
    fn default() -> Self {
        Self {
            academic_balance: 0.3,
            behavioral_balance: 0.3,
            diversity: 0.2,
            special_needs: 0.2,
        }
    }
}

impl ObjectiveWeights {
    /// Create default weights
    pub fn new() -> Self {
        Self::default()
    }

    /// Validate weights sum to 1.0
    pub fn is_valid(&self) -> bool {
        let sum = self.academic_balance + self.behavioral_balance + self.diversity + self.special_needs;
        (sum - 1.0).abs() < 0.01
    }

    /// Normalize weights to sum to 1.0
    pub fn normalize(mut self) -> Self {
        let sum = self.academic_balance + self.behavioral_balance + self.diversity + self.special_needs;
        if sum > 0.0 {
            self.academic_balance /= sum;
            self.behavioral_balance /= sum;
            self.diversity /= sum;
            self.special_needs /= sum;
        }
        self
    }
}

/// Complete optimization result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OptimizationResult {
    /// The optimized classroom layout
    pub layout: ClassroomLayout,
    /// Map of student ID to their seat position
    pub student_positions: HashMap<String, SeatPosition>,
    /// Overall fitness score (0-1)
    pub fitness_score: f64,
    /// Individual objective scores
    pub objective_scores: ObjectiveScores,
    /// Number of generations run
    pub generations: usize,
    /// Computation time in milliseconds
    pub computation_time_ms: u64,
    /// Any warnings or notes
    #[serde(default)]
    pub warnings: Vec<String>,
}

impl OptimizationResult {
    /// Create a new result
    pub fn new(
        layout: ClassroomLayout,
        student_positions: HashMap<String, SeatPosition>,
        fitness_score: f64,
        objective_scores: ObjectiveScores,
        generations: usize,
        computation_time_ms: u64,
    ) -> Self {
        Self {
            layout,
            student_positions,
            fitness_score,
            objective_scores,
            generations,
            computation_time_ms,
            warnings: Vec::new(),
        }
    }

    /// Add a warning
    pub fn add_warning(&mut self, warning: impl Into<String>) {
        self.warnings.push(warning.into());
    }
}
