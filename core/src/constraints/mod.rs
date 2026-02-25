//! Constraint module placeholder for future expansion
//! This will contain constraint definitions for seating rules

pub mod separation;
pub mod proximity;
pub mod zone;

// Re-export constraint trait
pub use separation::*;
pub use proximity::*;
pub use zone::*;
