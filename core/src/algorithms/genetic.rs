//! Genetic Algorithm implementation for seating optimization

use crate::models::*;
use crate::fitness::*;
use std::collections::{HashMap, HashSet};
use std::cmp::Ordering;

// ── Platform-agnostic random helpers ────────────────────────────────────────
// On WASM targets we delegate to `js_sys`; on native targets (unit tests) we
// use a simple xorshift64 LCG so tests don't require a WASM runtime.

#[cfg(target_arch = "wasm32")]
#[inline]
fn random() -> f64 {
    js_sys::Math::random()
}

#[cfg(not(target_arch = "wasm32"))]
fn random() -> f64 {
    use std::sync::atomic::{AtomicU64, Ordering as AOrdering};
    static SEED: AtomicU64 = AtomicU64::new(6_364_136_223_846_793_005);
    let mut s = SEED.load(AOrdering::Relaxed);
    s ^= s << 13;
    s ^= s >> 7;
    s ^= s << 17;
    SEED.store(s, AOrdering::Relaxed);
    // Map to [0, 1)
    (s >> 11) as f64 / (1u64 << 53) as f64
}

#[cfg(target_arch = "wasm32")]
#[inline]
fn current_time_ms() -> u64 {
    js_sys::Date::now() as u64
}

#[cfg(not(target_arch = "wasm32"))]
fn current_time_ms() -> u64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

/// Configuration for the genetic algorithm
#[derive(Debug, Clone)]
pub struct GeneticConfig {
    /// Population size
    pub population_size: usize,
    /// Maximum generations
    pub max_generations: usize,
    /// Crossover probability
    pub crossover_rate: f64,
    /// Mutation probability
    pub mutation_rate: f64,
    /// Tournament size for selection
    pub tournament_size: usize,
    /// Early stopping patience (generations without improvement)
    pub early_stop_patience: usize,
}

impl Default for GeneticConfig {
    fn default() -> Self {
        Self {
            population_size: 100,
            max_generations: 100,
            crossover_rate: 0.8,
            mutation_rate: 0.2,
            tournament_size: 3,
            early_stop_patience: 20,
        }
    }
}

impl GeneticConfig {
    /// Create new configuration
    pub fn new() -> Self {
        Self::default()
    }

    /// Set population size
    pub fn with_population_size(mut self, size: usize) -> Self {
        self.population_size = size;
        self
    }

    /// Set max generations
    pub fn with_max_generations(mut self, generations: usize) -> Self {
        self.max_generations = generations;
        self
    }
}

/// Individual in the population (represents a seating arrangement)
type Individual = Vec<usize>;

/// Genetic algorithm optimizer
pub struct GeneticOptimizer {
    students: Vec<Student>,
    rows: usize,
    cols: usize,
    weights: ObjectiveWeights,
    constraints: SeatingConstraints,
    config: GeneticConfig,
    /// Student indices that MUST be in front row (row 0)
    front_row_indices: HashSet<usize>,
    /// Student indices that MUST be in rows 0-1 (accessibility)
    accessible_indices: HashSet<usize>,
    /// Student indices that SHOULD be in the last 2 rows (soft preference)
    back_row_indices: HashSet<usize>,
}

impl GeneticOptimizer {
    /// Create a new optimizer
    pub fn new(
        students: Vec<Student>,
        rows: usize,
        cols: usize,
        weights: Option<ObjectiveWeights>,
        constraints: Option<SeatingConstraints>,
    ) -> Self {
        let constraints = constraints.unwrap_or_default();

        // Pre-compute which students have hard placement constraints
        let front_row_indices: HashSet<usize> = students
            .iter()
            .enumerate()
            .filter(|(_, s)| {
                s.requires_front_row || constraints.front_row_ids.contains(&s.id)
            })
            .map(|(i, _)| i)
            .collect();

        let accessible_indices: HashSet<usize> = students
            .iter()
            .enumerate()
            .filter(|(_, s)| s.has_mobility_issues)
            .map(|(i, _)| i)
            .chain(front_row_indices.iter().copied())
            .collect();

        let back_row_indices: HashSet<usize> = students
            .iter()
            .enumerate()
            .filter(|(_, s)| constraints.back_row_ids.contains(&s.id))
            .map(|(i, _)| i)
            .collect();

        Self {
            students,
            rows,
            cols,
            weights: weights.unwrap_or_default(),
            constraints,
            config: GeneticConfig::default(),
            front_row_indices,
            accessible_indices,
            back_row_indices,
        }
    }

    /// Set configuration
    pub fn with_config(mut self, config: GeneticConfig) -> Self {
        self.config = config;
        self
    }

    /// Run optimization
    pub fn optimize(&self) -> OptimizationResult {
        let start_ms = current_time_ms();

        // Create student ID map for quick lookup
        let student_map: HashMap<&str, &Student> = self.students
            .iter()
            .map(|s| (s.id.as_str(), s))
            .collect();

        // Initialize population with constrained placements
        let mut population = self.initialize_population();

        // Track best fitness for early stopping
        let mut best_fitness = 0.0;
        let mut generations_without_improvement = 0;

        // Evolution loop
        for _generation in 0..self.config.max_generations {
            // Evaluate fitness
            let fitnesses: Vec<f64> = population
                .iter()
                .map(|individual| self.evaluate_fitness(individual, &student_map))
                .collect();

            // Find best (safe comparison — treats NaN as less-than)
            let (best_idx, &current_best) = fitnesses
                .iter()
                .enumerate()
                .max_by(|a, b| a.1.partial_cmp(b.1).unwrap_or(Ordering::Equal))
                .unwrap_or((0, &0.0));

            // Check for improvement
            if current_best > best_fitness {
                best_fitness = current_best;
                generations_without_improvement = 0;
            } else {
                generations_without_improvement += 1;
            }

            // Early stopping
            if generations_without_improvement >= self.config.early_stop_patience {
                break;
            }

            // Selection
            let selected = self.selection(&population, &fitnesses);

            // Crossover, mutation, and repair
            population = self.breed(&selected);

            // Elitism: preserve best individual from previous gen
            if !population.is_empty() {
                population[0] = population[best_idx % population.len()].clone();
            }
        }

        // Find best solution
        let fitnesses: Vec<f64> = population
            .iter()
            .map(|individual| self.evaluate_fitness(individual, &student_map))
            .collect();

        let (best_idx, _) = fitnesses
            .iter()
            .enumerate()
            .max_by(|a, b| a.1.partial_cmp(b.1).unwrap_or(Ordering::Equal))
            .unwrap_or((0, &0.0));

        let best_individual = &population[best_idx];

        // Create result with warnings for any remaining violations
        let elapsed_ms = current_time_ms() - start_ms;
        let mut result = self.create_result(best_individual, &student_map, elapsed_ms);
        self.add_violation_warnings(&mut result);
        result
    }

    /// Initialize population with hard constraints pre-satisfied.
    ///
    /// Front-row and mobility students are placed into valid seat
    /// positions first; remaining students are shuffled into the rest.
    fn initialize_population(&self) -> Vec<Individual> {
        let num_students = self.students.len();
        let mut population = Vec::with_capacity(self.config.population_size);

        for _ in 0..self.config.population_size {
            let mut individual: Vec<usize> = (0..num_students).collect();

            // Phase 1: place front-row students into positions 0..cols
            let front_row_slots = self.cols.min(num_students);
            let mut front_assigned = 0;
            for &student_idx in &self.front_row_indices {
                if front_assigned >= front_row_slots {
                    break;
                }
                // Find current position of this student in the individual
                let cur_pos = individual.iter().position(|&s| s == student_idx).unwrap();
                if cur_pos >= front_row_slots {
                    // Swap with the student currently at a front-row slot
                    individual.swap(cur_pos, front_assigned);
                }
                front_assigned += 1;
            }

            // Phase 2: place mobility-only students into positions 0..(2*cols)
            let accessible_slots = (2 * self.cols).min(num_students);
            for &student_idx in &self.accessible_indices {
                if self.front_row_indices.contains(&student_idx) {
                    continue; // Already placed
                }
                let cur_pos = individual.iter().position(|&s| s == student_idx).unwrap();
                if cur_pos >= accessible_slots {
                    // Find a non-constrained student in the accessible range to swap with
                    for swap_pos in front_assigned..accessible_slots {
                        let occupant = individual[swap_pos];
                        if !self.accessible_indices.contains(&occupant) {
                            individual.swap(cur_pos, swap_pos);
                            break;
                        }
                    }
                }
            }

            // Phase 2b: place back-row students into last 2 rows
            let back_start = num_students.saturating_sub(2 * self.cols);
            for &student_idx in &self.back_row_indices {
                if self.accessible_indices.contains(&student_idx) {
                    continue; // front/mobility constraint takes priority
                }
                let cur_pos = individual.iter().position(|&s| s == student_idx).unwrap();
                if cur_pos < back_start {
                    // Find a non-constrained student in the back zone to swap with
                    for swap_pos in back_start..num_students {
                        let occupant = individual[swap_pos];
                        if !self.accessible_indices.contains(&occupant)
                            && !self.back_row_indices.contains(&occupant)
                        {
                            individual.swap(cur_pos, swap_pos);
                            break;
                        }
                    }
                }
            }

            // Phase 3: shuffle non-constrained students (positions after constrained ones)
            // Only shuffle positions that don't contain constrained students
            let free_positions: Vec<usize> = (0..num_students)
                .filter(|pos| {
                    let student_at_pos = individual[*pos];
                    !self.accessible_indices.contains(&student_at_pos)
                        && !self.back_row_indices.contains(&student_at_pos)
                })
                .collect();

            // Fisher-Yates on free positions only
            let free_len = free_positions.len();
            for i in (1..free_len).rev() {
                let j = (random() * (i + 1) as f64) as usize;
                // Swap the students at free_positions[i] and free_positions[j]
                let pos_a = free_positions[i];
                let pos_b = free_positions[j];
                individual.swap(pos_a, pos_b);
            }

            population.push(individual);
        }

        population
    }

    /// Repair an individual after crossover/mutation to restore hard constraints.
    ///
    /// If a front-row student ended up outside row 0, swap them with a
    /// non-constrained student who is currently in that zone.
    fn repair(&self, individual: &mut Individual) {
        let cols = self.cols;
        let num_students = individual.len();
        let front_row_slots = cols.min(num_students);
        let accessible_slots = (2 * cols).min(num_students);

        // Repair front-row students
        for &student_idx in &self.front_row_indices {
            let pos = match individual.iter().position(|&s| s == student_idx) {
                Some(p) => p,
                None => continue,
            };
            if pos >= front_row_slots {
                // Find a non-front-row student currently in the front row to swap with
                for swap_pos in 0..front_row_slots {
                    let occupant = individual[swap_pos];
                    if !self.front_row_indices.contains(&occupant) {
                        individual.swap(pos, swap_pos);
                        break;
                    }
                }
            }
        }

        // Repair mobility students (need rows 0–1)
        for &student_idx in &self.accessible_indices {
            if self.front_row_indices.contains(&student_idx) {
                continue; // Already in front row
            }
            let pos = match individual.iter().position(|&s| s == student_idx) {
                Some(p) => p,
                None => continue,
            };
            if pos >= accessible_slots {
                for swap_pos in front_row_slots..accessible_slots {
                    let occupant = individual[swap_pos];
                    if !self.accessible_indices.contains(&occupant) {
                        individual.swap(pos, swap_pos);
                        break;
                    }
                }
            }
        }

        // Repair back-row students (should be in last 2 rows)
        let back_start = num_students.saturating_sub(2 * cols);
        for &student_idx in &self.back_row_indices {
            if self.accessible_indices.contains(&student_idx) {
                continue; // front constraint wins
            }
            let pos = match individual.iter().position(|&s| s == student_idx) {
                Some(p) => p,
                None => continue,
            };
            if pos < back_start {
                for swap_pos in back_start..num_students {
                    let occupant = individual[swap_pos];
                    if !self.accessible_indices.contains(&occupant)
                        && !self.back_row_indices.contains(&occupant)
                    {
                        individual.swap(pos, swap_pos);
                        break;
                    }
                }
            }
        }
    }

    /// Evaluate fitness of an individual
    fn evaluate_fitness(
        &self,
        individual: &Individual,
        student_map: &HashMap<&str, &Student>,
    ) -> f64 {
        // Create seats from individual
        let seats = self.create_seats(individual);

        // Calculate objective scores
        let scores = calculate_fitness(&seats, &self.students, &self.weights, &self.constraints);

        // Return weighted total
        calculate_total_fitness(&scores, &self.weights)
    }

    /// Create seats from an individual (arrangement)
    fn create_seats(&self, individual: &Individual) -> Vec<Seat> {
        let mut seats = Vec::with_capacity(self.rows * self.cols);
        let mut student_idx = 0;

        for row in 0..self.rows {
            for col in 0..self.cols {
                let mut seat = Seat::empty(row, col);

                if student_idx < individual.len() {
                    let student_arr_idx = individual[student_idx];
                    seat.assign(&self.students[student_arr_idx].id);
                    student_idx += 1;
                }

                seats.push(seat);
            }
        }

        seats
    }

    /// Tournament selection
    fn selection(&self, population: &[Individual], fitnesses: &[f64]) -> Vec<Individual> {
        let mut selected = Vec::with_capacity(self.config.population_size);

        for _ in 0..self.config.population_size {
            // Tournament
            let mut best_idx = 0;
            let mut best_fitness = -1.0;

            for _ in 0..self.config.tournament_size {
                let idx = (random() * population.len() as f64) as usize;
                if fitnesses[idx] > best_fitness {
                    best_fitness = fitnesses[idx];
                    best_idx = idx;
                }
            }

            selected.push(population[best_idx].clone());
        }

        selected
    }

    /// Crossover, mutation, AND repair
    fn breed(&self, population: &[Individual]) -> Vec<Individual> {
        let mut new_population = Vec::with_capacity(self.config.population_size);
        let mut i = 0;

        while new_population.len() < self.config.population_size {
            let parent1 = &population[i % population.len()];
            let parent2 = &population[(i + 1) % population.len()];

            // Crossover
            let (child1, child2) = if random() < self.config.crossover_rate {
                self.crossover(parent1, parent2)
            } else {
                (parent1.clone(), parent2.clone())
            };

            // Mutation
            let mut child1 = child1;
            let mut child2 = child2;

            if random() < self.config.mutation_rate {
                mutate(&mut child1);
            }
            if random() < self.config.mutation_rate {
                mutate(&mut child2);
            }

            // Repair hard constraints after crossover/mutation
            self.repair(&mut child1);
            self.repair(&mut child2);

            new_population.push(child1);
            if new_population.len() < self.config.population_size {
                new_population.push(child2);
            }

            i += 2;
        }

        new_population
    }

    /// Ordered crossover (OX)
    fn crossover(&self, parent1: &Individual, parent2: &Individual) -> (Individual, Individual) {
        let len = parent1.len();
        if len < 2 {
            return (parent1.clone(), parent2.clone());
        }

        // Select random segment
        let start = (random() * (len - 1) as f64) as usize;
        let end = start + 1 + (random() * (len - start - 1) as f64) as usize;

        // Create children
        let mut child1 = vec![usize::MAX; len];
        let mut child2 = vec![usize::MAX; len];

        // Copy segment
        for i in start..=end {
            child1[i] = parent1[i];
            child2[i] = parent2[i];
        }

        // Fill remaining positions
        fill_remaining(&mut child1, parent2, start, end);
        fill_remaining(&mut child2, parent1, start, end);

        (child1, child2)
    }

    /// Create result from best individual
    fn create_result(
        &self,
        individual: &Individual,
        _student_map: &HashMap<&str, &Student>,
        computation_time_ms: u64,
    ) -> OptimizationResult {
        let seats = self.create_seats(individual);

        // Create student positions map
        let mut student_positions = HashMap::new();
        for seat in &seats {
            if let Some(ref student_id) = seat.student_id {
                student_positions.insert(student_id.clone(), seat.position);
            }
        }

        // Calculate objective scores
        let objective_scores = calculate_fitness(&seats, &self.students, &self.weights, &self.constraints);
        let fitness_score = calculate_total_fitness(&objective_scores, &self.weights);

        // Create layout
        let layout = ClassroomLayout {
            layout_type: LayoutType::Rows,
            rows: self.rows,
            cols: self.cols,
            total_seats: self.rows * self.cols,
            seats,
        };

        OptimizationResult::new(
            layout,
            student_positions,
            fitness_score,
            objective_scores,
            self.config.max_generations,
            computation_time_ms,
        )
    }

    /// Check the final result for any remaining violations and add warnings
    fn add_violation_warnings(&self, result: &mut OptimizationResult) {
        let mut warnings: Vec<String> = Vec::new();

        for seat in &result.layout.seats {
            if let Some(ref student_id) = seat.student_id {
                if let Some(student) = self.students.iter().find(|s| &s.id == student_id) {
                    if student.requires_front_row && !seat.position.is_front_row {
                        warnings.push(format!(
                            "{} requires front row but placed in row {}",
                            student.name,
                            seat.position.row + 1
                        ));
                    }
                    if student.has_mobility_issues && seat.position.row > 1 {
                        warnings.push(format!(
                            "{} has mobility issues but placed in row {}",
                            student.name,
                            seat.position.row + 1
                        ));
                    }
                }
            }
        }

        for warning in warnings {
            result.add_warning(warning);
        }
    }
}

/// Shuffle a vector using Fisher-Yates algorithm
fn shuffle(vec: &mut Vec<usize>) {
    let len = vec.len();
    for i in (1..len).rev() {
        let j = (random() * (i + 1) as f64) as usize;
        vec.swap(i, j);
    }
}

/// Mutate an individual by swapping two random positions
fn mutate(individual: &mut Individual) {
    if individual.len() < 2 {
        return;
    }

    let i = (random() * individual.len() as f64) as usize;
    let j = (random() * individual.len() as f64) as usize;

    if i != j {
        individual.swap(i, j);
    }
}

/// Fill remaining positions in crossover
fn fill_remaining(child: &mut Individual, parent: &Individual, start: usize, end: usize) {
    let segment: std::collections::HashSet<_> = child[start..=end].iter().collect();
    let parent_values: Vec<usize> = parent.iter().filter(|x| !segment.contains(x)).copied().collect();
    let mut parent_iter = parent_values.into_iter();

    for i in 0..child.len() {
        if child[i] == usize::MAX {
            if let Some(val) = parent_iter.next() {
                child[i] = val;
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_optimizer_creation() {
        let students = vec![
            Student::new("1", "Alice"),
            Student::new("2", "Bob"),
        ];

        let optimizer = GeneticOptimizer::new(students, 2, 2, None, None);
        assert_eq!(optimizer.students.len(), 2);
    }

    #[test]
    fn test_front_row_constraint_enforced() {
        // Student 0 requires front row, 3 rows x 2 cols
        let students = vec![
            Student::new("a", "Alice").with_front_row(true),
            Student::new("b", "Bob"),
            Student::new("c", "Charlie"),
            Student::new("d", "David"),
        ];
        let optimizer = GeneticOptimizer::new(students, 3, 2, None, None);
        let population = optimizer.initialize_population();

        // Every individual must have student 0 in positions 0 or 1 (front row)
        for individual in &population {
            let alice_pos = individual.iter().position(|&s| s == 0).unwrap();
            assert!(
                alice_pos < 2,
                "Alice (requires_front_row) at position {}, expected < 2",
                alice_pos
            );
        }
    }

    #[test]
    fn test_repair_restores_constraints() {
        let students = vec![
            Student::new("a", "Alice").with_front_row(true),
            Student::new("b", "Bob"),
            Student::new("c", "Charlie"),
            Student::new("d", "David"),
        ];
        let optimizer = GeneticOptimizer::new(students, 2, 2, None, None);

        // Place Alice (index 0) at position 3 (back row) — broken
        let mut individual = vec![1, 2, 3, 0];
        optimizer.repair(&mut individual);

        let alice_pos = individual.iter().position(|&s| s == 0).unwrap();
        assert!(
            alice_pos < 2,
            "After repair, Alice at position {}, expected < 2",
            alice_pos
        );
    }
}
