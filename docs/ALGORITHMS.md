# SeatAI Algorithms Documentation

This document describes the optimization algorithms used in SeatAI.

---

## Table of Contents

- [Overview](#overview)
- [Genetic Algorithm](#genetic-algorithm)
- [Fitness Functions](#fitness-functions)
- [Operators](#operators)
- [Configuration](#configuration)
- [Performance](#performance)

---

## Overview

SeatAI uses a **Genetic Algorithm (GA)** to find optimal classroom seating arrangements. The GA is well-suited for this problem because:

- **Large search space** - For 30 students in 30 seats, there are 30! ≈ 10³² possible arrangements
- **Multiple objectives** - Balance academic, behavioral, diversity, and special needs
- **Constraints** - Handle incompatible pairs, front row requirements, etc.
- **Time constraints** - Needs to run in browser in under a second

---

## Genetic Algorithm

### Algorithm Flow

```
1. INITIALIZATION
   ├─ Create population of N random arrangements
   └─ Seed one arrangement with constraint-aware placement

2. EVOLUTION (repeat for max generations)
   ├─ EVALUATE each arrangement's fitness
   ├─ SELECT best parents via tournament selection
   ├─ CROSSOVER parents to create offspring
   ├─ MUTATE offspring with swap mutation
   └─ REPLACE population with new generation

3. RETURN best arrangement found
```

### Pseudocode

```
function optimize(students, rows, cols, config):
    population = initialize_population(students, rows, cols, config.population_size)
    best_fitness = -∞
    best_arrangement = null
    stagnation = 0

    for generation in 1..config.max_generations:
        # Evaluate fitness
        scored_pop = [(arr, fitness(arr)) for arr in population]
        sort(scored_pop, by=fitness, descending)

        # Track best
        if scored_pop[0].fitness > best_fitness:
            best_fitness = scored_pop[0].fitness
            best_arrangement = scored_pop[0].arrangement
            stagnation = 0
        else:
            stagnation += 1

        # Early stop
        if stagnation >= config.early_stop_patience:
            break

        # Selection + reproduction
        new_pop = [scored_pop[0].arrangement]  # elitism

        while len(new_pop) < config.population_size:
            parent_a = tournament_select(scored_pop, config.tournament_size)
            parent_b = tournament_select(scored_pop, config.tournament_size)

            if random() < config.crossover_rate:
                child = order_crossover(parent_a, parent_b)
            else:
                child = parent_a.copy()

            if random() < config.mutation_rate:
                swap_mutate(child)

            new_pop.append(child)

        population = new_pop

    return best_arrangement
```

### Initialization

The population is initialized with:

1. **One seeded chromosome** - Places students according to constraints:
   - Front-row students → Row 0
   - Back-row students → Last row
   - Keep-together pairs → Adjacent seats
   - Remaining students → Random placement

2. **N-1 random chromosomes** - Completely random arrangements

This ensures the algorithm starts with at least one constraint-aware solution.

---

## Fitness Functions

The fitness function evaluates how "good" a seating arrangement is. It considers multiple objectives:

### Overall Fitness

```
fitness = Σ (weight × objective_score)
```

Where weights are configurable (default: academic=0.3, behavioral=0.3, diversity=0.2, special_needs=0.2).

### Academic Balance

**Goal:** Distribute academic levels evenly across rows for peer tutoring.

**Calculation:**
```
For each student:
    neighbors = get_adjacent_students(student)
    avg_neighbor_academic = average(neighbors.academic_score)
    score = 1 - |student.academic_score - avg_neighbor_academic| / 100

academic_fitness = average(all_student_scores)
```

**Rationale:** Students with similar academic capabilities can support each other through peer tutoring.

### Behavioral Balance

**Goal:** Place students with compatible behavior levels together.

**Calculation:**
```
For each student:
    neighbors = get_adjacent_students(student)
    avg_neighbor_behavior = average(neighbors.behavior_score)
    score = 1 - |student.behavior_score - avg_neighbor_behavior| / 100

behavioral_fitness = average(all_student_scores)
```

**Rationale:** Students with similar behavior patterns are less likely to disrupt each other.

### Diversity

**Goal:** Promote gender and language diversity within rows.

**Calculation:**
```
For each student:
    neighbors = get_adjacent_students(student)
    same_gender_count = count(neighbors with same gender)
    diversity_ratio = 1 - (same_gender_count / total_neighbors)

diversity_fitness = average(all_student_scores)
```

**Rationale:** Diverse seating promotes cross-cultural understanding and prevents cliques.

### Special Needs

**Goal:** Accommodate students with special requirements.

**Front Row Requirement:**
```
If student.requires_front_row or student.has_mobility_issues:
    if row == 0:
        score += 1.0  # Bonus for front row
    else:
        score -= 0.5  # Penalty for not in front
```

**Quiet Area Requirement:**
```
If student.requires_quiet_area:
    if is_edge_or_corner:
        score += 0.5  # Bonus for quiet location
```

### Constraint Penalties

**Separate Pairs:**
```
For each pair in separate_pairs:
    if distance(student_a, student_b) <= 1:
        total_fitness -= 1.0  # Large penalty
```

**Keep Together:**
```
For each pair in keep_together_pairs:
    if distance(student_a, student_b) <= 1:
        total_fitness += 0.5  # Bonus
```

**Friend Preferences:**
```
For each student:
    friend_count = count(friends in adjacent_seats)
    total_fitness += 0.1 × friend_count  # Small bonus
```

**Incompatible Pairs:**
```
For each student:
    if has_incompatible_neighbor:
        total_fitness -= 0.5  # Penalty
```

---

## Operators

### Selection: Tournament Selection

```
function tournament_select(population, k):
    best = random_choice(population)
    for i in 1..k:
        candidate = random_choice(population)
        if candidate.fitness > best.fitness:
            best = candidate
    return best.arrangement
```

**Parameters:**
- `k` (tournament size) = 3 (default)

**Rationale:** Tournament selection provides selection pressure while maintaining diversity.

### Crossover: Order Crossover (OX1)

Preserves relative ordering from both parents while creating valid permutations.

```
function order_crossover(parent_a, parent_b):
    length = len(parent_a)
    start, end = random_substring(length)

    # Copy segment from parent A
    child = array(length, fill='')
    used = empty_set

    for i in start..end:
        child[i] = parent_a[i]
        used.add(parent_a[i])

    # Fill remaining from parent B (preserving order)
    child_idx = (end + 1) % length
    for i in 0..length:
        gene = parent_b[(end + 1 + i) % length]
        if gene not in used:
            while child[child_idx] != '':
                child_idx = (child_idx + 1) % length
            child[child_idx] = gene
            used.add(gene)

    return child
```

**Example:**
```
Parent A: [1, 2, 3, 4, 5, 6, 7, 8]
Parent B: [8, 7, 6, 5, 4, 3, 2, 1]
Start: 2, End: 5

Child steps:
1. Copy segment from A: [_, _, 3, 4, 5, 6, _, _]
2. Fill from B in order: [8, 7, 3, 4, 5, 6, 2, 1]
```

### Mutation: Swap Mutation

```
function swap_mutate(chromosome):
    i = random_index(chromosome)
    j = random_index(chromosome)
    swap(chromosome[i], chromosome[j])
```

**Example:**
```
Before: [1, 2, 3, 4, 5, 6, 7, 8]
Swap indices 2 and 6
After:  [1, 2, 7, 4, 5, 6, 3, 8]
```

**Rationale:** Simple, maintains valid permutation, provides exploration.

---

## Configuration

### Default Parameters

| Parameter | Default | Range | Effect |
|-----------|---------|-------|--------|
| populationSize | 100 | 50-200 | Larger = better results, slower |
| maxGenerations | 100 | 50-200 | More = better results, slower |
| crossoverRate | 0.8 | 0.5-1.0 | Higher = faster convergence |
| mutationRate | 0.2 | 0.1-0.5 | Higher = more exploration |
| tournamentSize | 3 | 2-5 | Higher = more selection pressure |
| earlyStopPatience | 20 | 10-50 | Lower = faster stop |

### Recommended Configurations

| Classroom Size | Population | Generations | Rationale |
|----------------|------------|-------------|-----------|
| Small (< 20) | 50 | 50 | Faster convergence needed |
| Medium (20-50) | 100 | 100 | Balanced |
| Large (50+) | 150 | 150 | More diversity needed |

### Weight Recommendations

| Scenario | Academic | Behavioral | Diversity | Special Needs |
|----------|----------|------------|-----------|--------------|
| Standard | 0.3 | 0.3 | 0.2 | 0.2 |
| Test Prep | 0.5 | 0.2 | 0.1 | 0.2 |
| Behavior Focus | 0.2 | 0.5 | 0.2 | 0.1 |
| Inclusion Class | 0.2 | 0.2 | 0.2 | 0.4 |

---

## Performance

### Complexity

- **Time:** O(G × P × N²) where:
  - G = generations
  - P = population size
  - N = number of students

- **Space:** O(P × N) for storing population

### Benchmarks

| Students | Seats | Time (ms) | Fitness |
|----------|-------|-----------|---------|
| 15 | 15 | ~30 | 85-90 |
| 30 | 30 | ~80 | 82-88 |
| 50 | 50 | ~200 | 80-86 |
| 100 | 100 | ~600 | 78-84 |

*Benchmarks on M1 MacBook Pro, default config*

### Optimization Tips

1. **Use web workers** for large classes (> 50 students)
2. **Reduce generations** for faster results (minor quality impact)
3. **Lower population** for quick previews
4. **Enable early stopping** - already default

---

## Future Algorithms

Planned alternatives to the genetic algorithm:

### Simulated Annealing

Better for:
- Small classrooms (< 20 students)
- Quick optimization
- Escape local optima

### Greedy Algorithm

Useful for:
- Initial seeding (as currently used)
- Real-time adjustments
- Very large classrooms

### Hybrid Approach

Combine algorithms:
1. Greedy for initial constraint satisfaction
2. GA for refinement
3. Local search for final polish

---

## References

- Goldberg, D. E. (1989). *Genetic Algorithms in Search, Optimization, and Machine Learning*
- Davis, L. (1991). *Handbook of Genetic Algorithms*
- Holland, J. H. (1975). *Adaptation in Natural and Artificial Systems*

---

*Last updated: 2026-03-29*
