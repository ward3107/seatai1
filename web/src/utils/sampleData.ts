import type { Student } from '../types';

// Sample students for demo - Realistic classroom with 30 students
export const sampleStudents: Student[] = [
  // === ROW 1: HIGH ACHIEVERS ===
  { id: 's1', name: 'Alice Johnson', gender: 'female', age: 10, academic_level: 'advanced', academic_score: 98, behavior_level: 'excellent', behavior_score: 95, friends_ids: ['s2', 's5'], incompatible_ids: ['s10'], special_needs: [], requires_front_row: false, requires_quiet_area: false, has_mobility_issues: false, primary_language: 'English', is_bilingual: false },
  { id: 's2', name: 'Bob Smith', gender: 'male', age: 10, academic_level: 'advanced', academic_score: 92, behavior_level: 'good', behavior_score: 82, friends_ids: ['s1', 's3'], incompatible_ids: [], special_needs: [], requires_front_row: false, requires_quiet_area: false, has_mobility_issues: false, primary_language: 'English', is_bilingual: true },
  { id: 's3', name: 'Carol Williams', gender: 'female', age: 10, academic_level: 'proficient', academic_score: 82, behavior_level: 'excellent', behavior_score: 90, friends_ids: ['s2', 's4'], incompatible_ids: [], special_needs: [], requires_front_row: false, requires_quiet_area: false, has_mobility_issues: false, primary_language: 'Spanish', is_bilingual: true },
  { id: 's4', name: 'David Brown', gender: 'male', age: 10, academic_level: 'proficient', academic_score: 78, behavior_level: 'good', behavior_score: 75, friends_ids: ['s3', 's7'], incompatible_ids: ['s12'], special_needs: [], requires_front_row: false, requires_quiet_area: false, has_mobility_issues: false, primary_language: 'English', is_bilingual: false },
  { id: 's5', name: 'Emma Davis', gender: 'female', age: 10, academic_level: 'proficient', academic_score: 85, behavior_level: 'good', behavior_score: 80, friends_ids: ['s1', 's6'], incompatible_ids: [], special_needs: [], requires_front_row: false, requires_quiet_area: false, has_mobility_issues: false, primary_language: 'English', is_bilingual: false },

  // === ROW 2: STRUGGLING STUDENTS - Need Support ===
  { id: 's6', name: 'Frank Miller', gender: 'male', age: 10, academic_level: 'basic', academic_score: 55, behavior_level: 'average', behavior_score: 65, friends_ids: ['s5', 's9'], incompatible_ids: ['s10', 's11'], special_needs: [{ type: 'ADHD', description: 'Needs frequent breaks', requires_front_seat: true, requires_support_buddy: true }], requires_front_row: true, requires_quiet_area: false, has_mobility_issues: false, primary_language: 'English', is_bilingual: false },
  { id: 's7', name: 'Grace Wilson', gender: 'female', age: 10, academic_level: 'basic', academic_score: 52, behavior_level: 'good', behavior_score: 85, friends_ids: ['s4'], incompatible_ids: [], special_needs: [{ type: 'Dyslexia', description: 'Needs extra time', requires_front_seat: true, requires_support_buddy: false }], requires_front_row: true, requires_quiet_area: false, has_mobility_issues: false, primary_language: 'English', is_bilingual: false },
  { id: 's8', name: 'Henry Taylor', gender: 'male', age: 10, academic_level: 'proficient', academic_score: 75, behavior_level: 'challenging', behavior_score: 45, friends_ids: ['s3'], incompatible_ids: ['s9', 's10'], special_needs: [], requires_front_row: true, requires_quiet_area: true, has_mobility_issues: false, primary_language: 'English', is_bilingual: true },
  { id: 's9', name: 'Ivan Petrov', gender: 'male', age: 10, academic_level: 'below_basic', academic_score: 38, behavior_level: 'challenging', behavior_score: 40, friends_ids: ['s6'], incompatible_ids: ['s8', 's12'], special_needs: [{ type: 'ESL', description: 'Russian speaker', requires_front_seat: true, requires_support_buddy: true }], requires_front_row: true, requires_quiet_area: false, has_mobility_issues: false, primary_language: 'Russian', is_bilingual: false },
  { id: 's10', name: 'Jack Thompson', gender: 'male', age: 10, academic_level: 'basic', academic_score: 58, behavior_level: 'average', behavior_score: 60, friends_ids: ['s11'], incompatible_ids: ['s1', 's8', 's9'], special_needs: [], requires_front_row: false, requires_quiet_area: false, has_mobility_issues: false, primary_language: 'English', is_bilingual: false },

  // === ROW 3: DISRUPTIVE PAIR & FRIENDS ===
  { id: 's11', name: 'Kate Anderson', gender: 'female', age: 10, academic_level: 'proficient', academic_score: 72, behavior_level: 'average', behavior_score: 62, friends_ids: ['s10', 's12'], incompatible_ids: ['s6'], special_needs: [], requires_front_row: false, requires_quiet_area: false, has_mobility_issues: false, primary_language: 'English', is_bilingual: false },
  { id: 's12', name: "Liam O'Brien", gender: 'male', age: 10, academic_level: 'basic', academic_score: 48, behavior_level: 'challenging', behavior_score: 42, friends_ids: ['s11'], incompatible_ids: ['s4', 's9'], special_needs: [], requires_front_row: true, requires_quiet_area: false, has_mobility_issues: false, primary_language: 'English', is_bilingual: false },
  { id: 's13', name: 'Mia Chen', gender: 'female', age: 10, academic_level: 'advanced', academic_score: 94, behavior_level: 'excellent', behavior_score: 98, friends_ids: ['s14'], incompatible_ids: [], special_needs: [], requires_front_row: false, requires_quiet_area: true, has_mobility_issues: false, primary_language: 'Mandarin', is_bilingual: true },
  { id: 's14', name: 'Noah Garcia', gender: 'male', age: 10, academic_level: 'proficient', academic_score: 80, behavior_level: 'excellent', behavior_score: 92, friends_ids: ['s13', 's15'], incompatible_ids: [], special_needs: [], requires_front_row: false, requires_quiet_area: false, has_mobility_issues: false, primary_language: 'Spanish', is_bilingual: true },
  { id: 's15', name: 'Olivia Martinez', gender: 'female', age: 10, academic_level: 'proficient', academic_score: 76, behavior_level: 'good', behavior_score: 85, friends_ids: ['s14', 's16'], incompatible_ids: [], special_needs: [{ type: 'Wheelchair', description: 'Needs accessible seat', requires_front_seat: false, requires_support_buddy: false }], requires_front_row: false, requires_quiet_area: false, has_mobility_issues: true, primary_language: 'English', is_bilingual: true },

  // === ROW 4: MIXED ABILITIES ===
  { id: 's16', name: 'Peter Kim', gender: 'male', age: 10, academic_level: 'advanced', academic_score: 90, behavior_level: 'excellent', behavior_score: 95, friends_ids: ['s15'], incompatible_ids: [], special_needs: [], requires_front_row: false, requires_quiet_area: false, has_mobility_issues: false, primary_language: 'Korean', is_bilingual: true },
  { id: 's17', name: 'Quinn Davis', gender: 'female', age: 10, academic_level: 'proficient', academic_score: 74, behavior_level: 'good', behavior_score: 78, friends_ids: ['s18', 's19'], incompatible_ids: ['s22'], special_needs: [], requires_front_row: false, requires_quiet_area: false, has_mobility_issues: false, primary_language: 'English', is_bilingual: false },
  { id: 's18', name: 'Ryan Thompson', gender: 'male', age: 10, academic_level: 'basic', academic_score: 60, behavior_level: 'average', behavior_score: 68, friends_ids: ['s17'], incompatible_ids: [], special_needs: [], requires_front_row: false, requires_quiet_area: false, has_mobility_issues: false, primary_language: 'English', is_bilingual: false },
  { id: 's19', name: 'Sophie Wilson', gender: 'female', age: 10, academic_level: 'advanced', academic_score: 88, behavior_level: 'excellent', behavior_score: 90, friends_ids: ['s17', 's20'], incompatible_ids: [], special_needs: [], requires_front_row: false, requires_quiet_area: false, has_mobility_issues: false, primary_language: 'French', is_bilingual: true },
  { id: 's20', name: 'Thomas Lee', gender: 'male', age: 10, academic_level: 'proficient', academic_score: 77, behavior_level: 'good', behavior_score: 82, friends_ids: ['s19', 's21'], incompatible_ids: ['s25'], special_needs: [], requires_front_row: false, requires_quiet_area: false, has_mobility_issues: false, primary_language: 'English', is_bilingual: false },

  // === ROW 5: MORE STUDENTS ===
  { id: 's21', name: 'Uma Patel', gender: 'female', age: 10, academic_level: 'advanced', academic_score: 91, behavior_level: 'excellent', behavior_score: 94, friends_ids: ['s20'], incompatible_ids: [], special_needs: [], requires_front_row: false, requires_quiet_area: true, has_mobility_issues: false, primary_language: 'Hindi', is_bilingual: true },
  { id: 's22', name: 'Victor Nguyen', gender: 'male', age: 10, academic_level: 'basic', academic_score: 50, behavior_level: 'challenging', behavior_score: 48, friends_ids: ['s23'], incompatible_ids: ['s17', 's24'], special_needs: [], requires_front_row: true, requires_quiet_area: false, has_mobility_issues: false, primary_language: 'Vietnamese', is_bilingual: true },
  { id: 's23', name: 'Wendy Chang', gender: 'female', age: 10, academic_level: 'proficient', academic_score: 79, behavior_level: 'good', behavior_score: 76, friends_ids: ['s22', 's24'], incompatible_ids: [], special_needs: [], requires_front_row: false, requires_quiet_area: false, has_mobility_issues: false, primary_language: 'Mandarin', is_bilingual: true },
  { id: 's24', name: 'Xavier Torres', gender: 'male', age: 10, academic_level: 'below_basic', academic_score: 42, behavior_level: 'average', behavior_score: 58, friends_ids: ['s23'], incompatible_ids: ['s22'], special_needs: [{ type: 'Hearing Impairment', description: 'Needs front seat', requires_front_seat: true, requires_support_buddy: false }], requires_front_row: true, requires_quiet_area: false, has_mobility_issues: false, primary_language: 'Spanish', is_bilingual: false },
  { id: 's25', name: 'Yuki Tanaka', gender: 'female', age: 10, academic_level: 'advanced', academic_score: 96, behavior_level: 'excellent', behavior_score: 97, friends_ids: ['s26'], incompatible_ids: ['s20'], special_needs: [], requires_front_row: false, requires_quiet_area: true, has_mobility_issues: false, primary_language: 'Japanese', is_bilingual: true },

  // === ROW 6: FINAL GROUP ===
  { id: 's26', name: 'Zara Ahmed', gender: 'female', age: 10, academic_level: 'proficient', academic_score: 73, behavior_level: 'good', behavior_score: 80, friends_ids: ['s25', 's27'], incompatible_ids: [], special_needs: [], requires_front_row: false, requires_quiet_area: false, has_mobility_issues: false, primary_language: 'Arabic', is_bilingual: true },
  { id: 's27', name: 'Aaron Black', gender: 'male', age: 10, academic_level: 'basic', academic_score: 56, behavior_level: 'average', behavior_score: 64, friends_ids: ['s26', 's28'], incompatible_ids: ['s30'], special_needs: [], requires_front_row: false, requires_quiet_area: false, has_mobility_issues: false, primary_language: 'English', is_bilingual: false },
  { id: 's28', name: 'Bella Ross', gender: 'female', age: 10, academic_level: 'proficient', academic_score: 81, behavior_level: 'excellent', behavior_score: 88, friends_ids: ['s27', 's29'], incompatible_ids: [], special_needs: [], requires_front_row: false, requires_quiet_area: false, has_mobility_issues: false, primary_language: 'English', is_bilingual: false },
  { id: 's29', name: 'Chris Evans', gender: 'male', age: 10, academic_level: 'advanced', academic_score: 89, behavior_level: 'good', behavior_score: 84, friends_ids: ['s28', 's30'], incompatible_ids: [], special_needs: [], requires_front_row: false, requires_quiet_area: false, has_mobility_issues: false, primary_language: 'English', is_bilingual: false },
  { id: 's30', name: 'Diana Prince', gender: 'female', age: 10, academic_level: 'proficient', academic_score: 75, behavior_level: 'excellent', behavior_score: 92, friends_ids: ['s29'], incompatible_ids: ['s27'], special_needs: [{ type: 'Visual Impairment', description: 'Needs large text and front seat', requires_front_seat: true, requires_support_buddy: false }], requires_front_row: true, requires_quiet_area: false, has_mobility_issues: false, primary_language: 'English', is_bilingual: false },
];

// Generate unique ID
export function generateId(): string {
  return `s_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Create empty student
export function createEmptyStudent(): Student {
  return {
    id: generateId(),
    name: '',
    gender: 'other',
    academic_level: 'proficient',
    academic_score: 70,
    behavior_level: 'good',
    behavior_score: 70,
    friends_ids: [],
    incompatible_ids: [],
    special_needs: [],
    requires_front_row: false,
    requires_quiet_area: false,
    has_mobility_issues: false,
    is_bilingual: false,
  };
}
