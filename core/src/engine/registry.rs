//! Algorithm registry for managing optimization strategies
//!
//! This module provides a registry for discovering and using different optimizers.

use std::collections::HashMap;
use super::optimizer::Optimizer;

/// Registry for optimization algorithms
pub struct AlgorithmRegistry {
    algorithms: HashMap<String, Box<dyn Optimizer>>,
}

impl AlgorithmRegistry {
    /// Create a new empty registry
    pub fn new() -> Self {
        Self {
            algorithms: HashMap::new(),
        }
    }

    /// Register an algorithm
    pub fn register(&mut self, name: impl Into<String>, optimizer: Box<dyn Optimizer>) {
        self.algorithms.insert(name.into(), optimizer);
    }

    /// Get an algorithm by name
    pub fn get(&self, name: &str) -> Option<&Box<dyn Optimizer>> {
        self.algorithms.get(name)
    }

    /// Get an algorithm by name (mutable)
    pub fn get_mut(&mut self, name: &str) -> Option<&mut Box<dyn Optimizer>> {
        self.algorithms.get_mut(name)
    }

    /// List all registered algorithms
    pub fn list(&self) -> Vec<&str> {
        self.algorithms.keys().map(|s| s.as_str()).collect()
    }
}

impl Default for AlgorithmRegistry {
    fn default() -> Self {
        Self::new()
    }
}
