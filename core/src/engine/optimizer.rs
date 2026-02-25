//! Optimizer trait for pluggable optimization strategies
//!
//! This module defines the core trait that all optimization algorithms must implement.

use crate::models::{Student, OptimizationResult, GeneticConfig};
use std::collections::HashMap;

/// Trait for optimization algorithms
///
/// Implement this trait to create custom optimization strategies.
pub trait Optimizer: Send + Sync {
    /// Run the optimization and return the result
    fn optimize(&mut self) -> OptimizationResult;

    /// Get the name of this optimizer
    fn name(&self) -> &str;

    /// Get configurable parameters
    fn parameters(&self) -> Vec<Parameter> {
        vec![]
    }

    /// Set a parameter value
    fn set_parameter(&mut self, _name: &str, _value: f64) -> Result<(), String> {
        Ok(())
    }
}

/// Describes a configurable parameter
#[derive(Debug, Clone)]
pub struct Parameter {
    pub name: String,
    pub description: String,
    pub min: f64,
    pub max: f64,
    pub default: f64,
    pub current: f64,
}

impl Parameter {
    pub fn new(name: impl Into<String>, description: impl Into<String>, min: f64, max: f64, default: f64) -> Self {
        Self {
            name: name.into(),
            description: description.into(),
            min,
            max,
            default,
            current: default,
        }
    }
}
