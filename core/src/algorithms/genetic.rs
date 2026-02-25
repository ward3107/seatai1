//! Genetic Algorithm implementation for seating optimization

use crate::models::*;
use crate::fitness::*;
use std::collections::HashMap;

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
        Self {
            students,
            rows,
            cols,
            weights: weights.unwrap_or_default(),
            constraints: constraints.unwrap_or_default(),
            config: GeneticConfig::default(),
        }
    }

    /// Set configuration
    pub fn with_config(mut self, config: GeneticConfig) -> Self {
        self.config = config;
        self
    }

    /// Run optimization
    pub fn optimize(&self) -> OptimizationResult {
        let start_ms = js_sys::Date::now() as u64;

        // Create student ID map for quick lookup
        let student_map: HashMap<&str, &Student> = self.students
            .iter()
            .map(|s| (s.id.as_str(), s))
            .collect();

        // Initialize population
        let mut population = self.initialize_population();

        // Track best fitness for early stopping
        let mut best_fitness = 0.0;
        let mut generations_without_improvement = 0;

        // Evolution loop
        for generation in 0..self.config.max_generations {
            // Evaluate fitness
            let fitnesses: Vec<f64> = population
                .iter()
                .map(|individual| self.evaluate_fitness(individual, &student_map))
                .collect();

            // Find best
            let (best_idx, &current_best) = fitnesses
                .iter()
                .enumerate()
                .max_by(|a, b| a.1.partial_cmp(b.1).unwrap())
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

            // Crossover and mutation
            population = self.breed(&selected);

            // Elitism: keep best individual
            if population.len() > self.config.population_size {
                population[0] = population[best_idx].clone();
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
            .max_by(|a, b| a.1.partial_cmp(b.1).unwrap())
            .unwrap_or((0, &0.0));

        let best_individual = &population[best_idx];

        // Create result
        let elapsed_ms = js_sys::Date::now() as u64 - start_ms;
        self.create_result(best_individual, &student_map, elapsed_ms)
    }

    /// Initialize random population
    fn initialize_population(&self) -> Vec<Individual> {
        let num_students = self.students.len();
        let mut population = Vec::with_capacity(self.config.population_size);

        for _ in 0..self.config.population_size {
            // Create a random permutation
            let mut individual: Vec<usize> = (0..num_students).collect();
            shuffle(&mut individual);
            population.push(individual);
        }

        population
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
                let idx = (js_sys::Math::random() * population.len() as f64) as usize;
                if fitnesses[idx] > best_fitness {
                    best_fitness = fitnesses[idx];
                    best_idx = idx;
                }
            }

            selected.push(population[best_idx].clone());
        }

        selected
    }

    /// Crossover and mutation
    fn breed(&self, population: &[Individual]) -> Vec<Individual> {
        let mut new_population = Vec::with_capacity(self.config.population_size);
        let mut i = 0;

        while new_population.len() < self.config.population_size {
            let parent1 = &population[i % population.len()];
            let parent2 = &population[(i + 1) % population.len()];

            // Crossover
            let (child1, child2) = if js_sys::Math::random() < self.config.crossover_rate {
                self.crossover(parent1, parent2)
            } else {
                (parent1.clone(), parent2.clone())
            };

            // Mutation
            let mut child1 = child1;
            let mut child2 = child2;

            if js_sys::Math::random() < self.config.mutation_rate {
                mutate(&mut child1);
            }
            if js_sys::Math::random() < self.config.mutation_rate {
                mutate(&mut child2);
            }

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
        let start = (js_sys::Math::random() * (len - 1) as f64) as usize;
        let end = start + 1 + (js_sys::Math::random() * (len - start - 1) as f64) as usize;

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
        student_map: &HashMap<&str, &Student>,
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
}

/// Shuffle a vector using Fisher-Yates algorithm
fn shuffle(vec: &mut Vec<usize>) {
    let len = vec.len();
    for i in (1..len).rev() {
        let j = (js_sys::Math::random() * (i + 1) as f64) as usize;
        vec.swap(i, j);
    }
}

/// Mutate an individual by swapping two random positions
fn mutate(individual: &mut Individual) {
    if individual.len() < 2 {
        return;
    }

    let i = (js_sys::Math::random() * individual.len() as f64) as usize;
    let j = (js_sys::Math::random() * individual.len() as f64) as usize;

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
}
