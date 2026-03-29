/**
 * Tests for Zustand Store (State Management)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStore } from './index';
import type { Student, OptimizationResult } from '../../types';

const mockStudent: Student = {
  id: 'test-1',
  name: 'Test Student',
  gender: 'female',
  academic_level: 'proficient',
  academic_score: 75,
  behavior_level: 'good',
  behavior_score: 80,
  friends_ids: [],
  incompatible_ids: [],
  special_needs: [],
  requires_front_row: false,
  requires_quiet_area: false,
  has_mobility_issues: false,
  is_bilingual: false
};

describe('Zustand Store', () => {
  beforeEach(() => {
    // Reset store before each test
    useStore.setState({
      students: [],
      rows: 5,
      cols: 6,
      selectedStudentId: null,
      isOptimizing: false,
      result: null,
      weights: {
        academic_balance: 0.3,
        behavioral_balance: 0.3,
        diversity: 0.2,
        special_needs: 0.2
      },
      config: {
        populationSize: 100,
        maxGenerations: 100,
        crossoverRate: 0.8,
        mutationRate: 0.2,
        tournamentSize: 3,
        earlyStopPatience: 20
      },
      constraints: {
        separate_pairs: [],
        keep_together_pairs: [],
        front_row_ids: [],
        back_row_ids: []
      },
      uiLanguage: 'en',
      projects: [],
      currentProjectId: null
    });
  });

  describe('Student Management', () => {
    it('should add a student', () => {
      const { result } = renderHook(() => useStore());

      act(() => {
        result.current.addStudent(mockStudent);
      });

      const { students } = result.current;
      expect(students).toHaveLength(1);
      expect(students[0]).toEqual(mockStudent);
    });

    it('should update a student', () => {
      const { result } = renderHook(() => useStore());

      act(() => {
        result.current.addStudent(mockStudent);
        result.current.updateStudent('test-1', { name: 'Updated Name' });
      });

      const { students } = result.current;
      expect(students[0].name).toBe('Updated Name');
    });

    it('should remove a student', () => {
      const { result } = renderHook(() => useStore());

      act(() => {
        result.current.addStudent(mockStudent);
        result.current.removeStudent('test-1');
      });

      const { students } = result.current;
      expect(students).toHaveLength(0);
    });

    it('should set students', () => {
      const { result } = renderHook(() => useStore());
      const newStudents = [mockStudent];

      act(() => {
        result.current.setStudents(newStudents);
      });

      const { students } = result.current;
      expect(students).toEqual(newStudents);
    });
  });

  describe('Classroom State', () => {
    it('should set classroom dimensions', () => {
      const { result } = renderHook(() => useStore());

      act(() => {
        result.current.setRows(10);
        result.current.setCols(8);
      });

      const { rows, cols } = result.current;
      expect(rows).toBe(10);
      expect(cols).toBe(8);
    });
  });

  describe('Optimization State', () => {
    it('should set weights', () => {
      const { result } = renderHook(() => useStore());
      const newWeights = {
        academic_balance: 0.5,
        behavioral_balance: 0.2,
        diversity: 0.2,
        special_needs: 0.1
      };

      act(() => {
        result.current.setWeights(newWeights);
      });

      const { weights } = result.current;
      expect(weights).toEqual(newWeights);
    });

    it('should set config', () => {
      const { result } = renderHook(() => useStore());
      const newConfig = {
        populationSize: 150,
        maxGenerations: 200,
        crossoverRate: 0.9,
        mutationRate: 0.1,
        tournamentSize: 5,
        earlyStopPatience: 30
      };

      act(() => {
        result.current.setConfig(newConfig);
      });

      const { config } = result.current;
      expect(config).toEqual(newConfig);
    });

    it('should set optimization result', () => {
      const { result } = renderHook(() => useStore());
      const mockResult: OptimizationResult = {
        layout: {
          layout_type: 'rows',
          rows: 5,
          cols: 6,
          total_seats: 30,
          seats: []
        },
        student_positions: {},
        fitness_score: 85.5,
        objective_scores: {
          academic_balance: 80,
          behavioral_balance: 90,
          diversity: 85,
          special_needs: 88
        },
        generations: 100,
        computation_time_ms: 150,
        warnings: []
      };

      act(() => {
        result.current.setResult(mockResult);
      });

      const { result: optResult } = result.current;
      expect(optResult).toEqual(mockResult);
    });

    it('should clear result', () => {
      const { result } = renderHook(() => useStore());
      const mockResult: OptimizationResult = {
        layout: {
          layout_type: 'rows',
          rows: 5,
          cols: 6,
          total_seats: 30,
          seats: []
        },
        student_positions: {},
        fitness_score: 85.5,
        objective_scores: {
          academic_balance: 80,
          behavioral_balance: 90,
          diversity: 85,
          special_needs: 88
        },
        generations: 100,
        computation_time_ms: 150,
        warnings: []
      };

      act(() => {
        result.current.setResult(mockResult);
        result.current.setResult(null);
      });

      const { result: optResult } = result.current;
      expect(optResult).toBeNull();
    });
  });

  describe('UI State', () => {
    it('should set selected student ID', () => {
      const { result } = renderHook(() => useStore());

      act(() => {
        result.current.setSelectedStudentId('test-1');
      });

      const { selectedStudentId } = result.current;
      expect(selectedStudentId).toBe('test-1');
    });

    it('should set UI language', () => {
      const { result } = renderHook(() => useStore());

      act(() => {
        result.current.setUiLanguage('he');
      });

      const { uiLanguage } = result.current;
      expect(uiLanguage).toBe('he');
    });
  });

  describe('Project Management', () => {
    it('should save a project', () => {
      const { result } = renderHook(() => useStore());

      act(() => {
        result.current.setStudents([mockStudent]);
        result.current.saveProject('Test Class');
      });

      const { projects } = result.current;
      expect(projects).toHaveLength(1);
      expect(projects[0].name).toBe('Test Class');
    });

    it('should load a project', () => {
      const { result } = renderHook(() => useStore());

      act(() => {
        result.current.setStudents([mockStudent]);
        result.current.saveProject('Test Class');
      });

      // Get the project ID after the act block
      const projectId = result.current.projects[0]?.id;
      expect(projectId).toBeTruthy();

      act(() => {
        if (projectId) {
          result.current.loadProject(projectId);
        }
      });

      const { currentProjectId } = result.current;
      expect(currentProjectId).toBeTruthy();
    });

    it('should delete a project', () => {
      const { result } = renderHook(() => useStore());

      act(() => {
        result.current.setStudents([mockStudent]);
        result.current.saveProject('Test Class');
      });

      // Get the project ID after the act block
      const projectId = result.current.projects[0]?.id;
      expect(projectId).toBeTruthy();

      act(() => {
        if (projectId) {
          result.current.deleteProject(projectId);
        }
      });

      const { projects } = result.current;
      expect(projects).toHaveLength(0);
    });
  });
});
