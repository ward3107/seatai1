//! SeatAI Core - High-performance classroom seating optimization
//!
//! This library provides a genetic algorithm-based optimization engine
//! for finding optimal classroom seating arrangements.

use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

mod models;
mod algorithms;
mod fitness;
mod constraints;

use models::*;
use algorithms::*;

/// Initialize the WASM module
#[wasm_bindgen(start)]
pub fn init() {
    // Set up panic hook for better error messages
    console_error_panic_hook::set_once();
}

/// Log to console (for debugging)
#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

/// Main optimizer class exposed to JavaScript
#[wasm_bindgen]
pub struct ClassroomOptimizer {
    students: Vec<Student>,
    rows: usize,
    cols: usize,
    weights: ObjectiveWeights,
    constraints: SeatingConstraints,
    config: GeneticConfig,
}

#[wasm_bindgen]
impl ClassroomOptimizer {
    /// Create a new optimizer instance
    #[wasm_bindgen(constructor)]
    pub fn new(students: JsValue, rows: usize, cols: usize) -> Result<ClassroomOptimizer, JsValue> {
        let students: Vec<Student> = serde_wasm_bindgen::from_value(students)
            .map_err(|e| JsValue::from_str(&format!("Failed to parse students: {}", e)))?;

        if students.len() < 2 {
            return Err(JsValue::from_str("Need at least 2 students for optimization"));
        }

        if students.len() > rows * cols {
            return Err(JsValue::from_str(&format!(
                "Too many students ({}) for available seats ({})",
                students.len(),
                rows * cols
            )));
        }

        Ok(Self {
            students,
            rows,
            cols,
            weights: ObjectiveWeights::default(),
            constraints: SeatingConstraints::default(),
            config: GeneticConfig::default(),
        })
    }

    /// Set optimization weights
    #[wasm_bindgen(js_name = setWeights)]
    pub fn set_weights(&mut self, weights: JsValue) -> Result<(), JsValue> {
        self.weights = serde_wasm_bindgen::from_value(weights)
            .map_err(|e| JsValue::from_str(&format!("Failed to parse weights: {}", e)))?;
        Ok(())
    }

    /// Set seating constraints
    #[wasm_bindgen(js_name = setConstraints)]
    pub fn set_constraints(&mut self, constraints: JsValue) -> Result<(), JsValue> {
        self.constraints = serde_wasm_bindgen::from_value(constraints)
            .map_err(|e| JsValue::from_str(&format!("Failed to parse constraints: {}", e)))?;
        Ok(())
    }

    /// Set algorithm configuration
    #[wasm_bindgen(js_name = setConfig)]
    pub fn set_config(&mut self, config: JsValue) -> Result<(), JsValue> {
        let config: GeneticConfig = serde_wasm_bindgen::from_value(config)
            .map_err(|e| JsValue::from_str(&format!("Failed to parse config: {}", e)))?;
        self.config = config;
        Ok(())
    }

    /// Set population size
    #[wasm_bindgen(js_name = setPopulationSize)]
    pub fn set_population_size(&mut self, size: usize) {
        self.config.population_size = size;
    }

    /// Set max generations
    #[wasm_bindgen(js_name = setMaxGenerations)]
    pub fn set_max_generations(&mut self, generations: usize) {
        self.config.max_generations = generations;
    }

    /// Run the optimization
    #[wasm_bindgen]
    pub fn optimize(&self) -> Result<JsValue, JsValue> {
        let optimizer = GeneticOptimizer::new(
            self.students.clone(),
            self.rows,
            self.cols,
            Some(self.weights.clone()),
            Some(self.constraints.clone()),
        ).with_config(self.config.clone());

        let result = optimizer.optimize();

        serde_wasm_bindgen::to_value(&result)
            .map_err(|e| JsValue::from_str(&format!("Failed to serialize result: {}", e)))
    }
}

/// Quick optimization function (one-shot)
#[wasm_bindgen(js_name = optimizeClassroom)]
pub fn optimize_classroom(
    students: JsValue,
    rows: usize,
    cols: usize,
) -> Result<JsValue, JsValue> {
    let mut optimizer = ClassroomOptimizer::new(students, rows, cols)?;
    optimizer.optimize()
}

/// Get the version of the WASM module
#[wasm_bindgen(js_name = getVersion)]
pub fn get_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

/// Get available layout types
#[wasm_bindgen(js_name = getLayoutTypes)]
pub fn get_layout_types() -> JsValue {
    let types = vec![
        "rows",
        "pairs",
        "clusters",
        "u-shape",
        "circle",
        "flexible",
    ];
    serde_wasm_bindgen::to_value(&types).unwrap_or(JsValue::NULL)
}

/// Get default objective weights
#[wasm_bindgen(js_name = getDefaultWeights)]
pub fn get_default_weights() -> JsValue {
    let weights = ObjectiveWeights::default();
    serde_wasm_bindgen::to_value(&weights).unwrap_or(JsValue::NULL)
}

// ============= Serde implementations for WASM =============

impl Serialize for GeneticConfig {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        use serde::ser::SerializeStruct;
        let mut s = serializer.serialize_struct("GeneticConfig", 7)?;
        s.serialize_field("populationSize", &self.population_size)?;
        s.serialize_field("maxGenerations", &self.max_generations)?;
        s.serialize_field("crossoverRate", &self.crossover_rate)?;
        s.serialize_field("mutationRate", &self.mutation_rate)?;
        s.serialize_field("tournamentSize", &self.tournament_size)?;
        s.serialize_field("earlyStopPatience", &self.early_stop_patience)?;
        s.end()
    }
}

impl<'de> Deserialize<'de> for GeneticConfig {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        #[derive(Deserialize)]
        struct ConfigHelper {
            #[serde(default = "default_population_size")]
            population_size: usize,
            #[serde(default = "default_max_generations")]
            max_generations: usize,
            #[serde(default = "default_crossover_rate")]
            crossover_rate: f64,
            #[serde(default = "default_mutation_rate")]
            mutation_rate: f64,
            #[serde(default = "default_tournament_size")]
            tournament_size: usize,
            #[serde(default = "default_early_stop")]
            early_stop_patience: usize,
        }

        fn default_population_size() -> usize { 100 }
        fn default_max_generations() -> usize { 100 }
        fn default_crossover_rate() -> f64 { 0.8 }
        fn default_mutation_rate() -> f64 { 0.2 }
        fn default_tournament_size() -> usize { 3 }
        fn default_early_stop() -> usize { 20 }

        let helper = ConfigHelper::deserialize(deserializer)?;
        Ok(GeneticConfig {
            population_size: helper.population_size,
            max_generations: helper.max_generations,
            crossover_rate: helper.crossover_rate,
            mutation_rate: helper.mutation_rate,
            tournament_size: helper.tournament_size,
            early_stop_patience: helper.early_stop_patience,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_version() {
        assert!(!get_version().is_empty());
    }
}
