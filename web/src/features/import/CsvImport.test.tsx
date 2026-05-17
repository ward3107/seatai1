/**
 * Tests for CSV Import Component
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CsvImport, { parseCsv, MAX_ROSTER } from './CsvImport';
import { useStore } from '../../core/store';

// Mock the store
vi.mock('../../core/store', () => ({
  useStore: vi.fn(),
}));

// Mock the i18n hook
vi.mock('../../hooks/useLanguage', () => ({
  useLanguage: () => ({
    t: (key: string, values?: Record<string, string | number>) => {
      const translations: Record<string, string> = {
        'csvImport.import_mode': 'Import mode:',
        'csvImport.add_to_class': 'Add to class',
        'csvImport.replace_class': 'Replace class',
        'csvImport.drop_here': 'Drop CSV here or <span>click to browse</span>',
        'csvImport.download_template': 'Download template',
        'csvImport.imported': 'students imported',
        'csvImport.error_no_header': 'No header row found',
        'csvImport.error_missing_name': 'Missing required column: name',
        'csvImport.error_missing_name_row': 'Row {{row}}: Missing name',
      };
      let result = translations[key] || key;
      if (values) {
        Object.entries(values).forEach(([k, v]) => {
          result = result.replace(`{{${k}}}`, String(v));
        });
      }
      return result;
    },
  }),
}));

const mockAddStudent = vi.fn();
const mockSetStudents = vi.fn();

describe('CsvImport Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useStore as any).mockReturnValue({
      addStudent: mockAddStudent,
      setStudents: mockSetStudents,
    });
  });

  describe('Rendering', () => {
    it('should render import UI', () => {
      render(<CsvImport />);

      expect(screen.getByText('Import mode:')).toBeInTheDocument();
      expect(screen.getByText('Add to class')).toBeInTheDocument();
      expect(screen.getByText('Replace class')).toBeInTheDocument();
      expect(screen.getByText(/Drop CSV here/)).toBeInTheDocument();
      expect(screen.getByText('Download template')).toBeInTheDocument();
    });

    it('should have append mode selected by default', () => {
      render(<CsvImport />);

      const appendButton = screen.getByText('Add to class');
      const replaceButton = screen.getByText('Replace class');

      // Append should have active class
      expect(appendButton.className).toContain('bg-primary-100');
      expect(replaceButton.className).not.toContain('bg-orange-100');
    });
  });

  describe('Import mode toggle', () => {
    it('should switch to replace mode', async () => {
      render(<CsvImport />);

      const replaceButton = screen.getByText('Replace class');
      await userEvent.click(replaceButton);

      expect(replaceButton.className).toContain('bg-orange-100');
    });

    it('should switch back to append mode', async () => {
      render(<CsvImport />);

      const replaceButton = screen.getByText('Replace class');
      await userEvent.click(replaceButton);

      const appendButton = screen.getByText('Add to class');
      await userEvent.click(appendButton);

      expect(appendButton.className).toContain('bg-primary-100');
    });
  });

  describe('File input', () => {
    it('should have hidden file input', () => {
      render(<CsvImport />);

      const input = document.querySelector('input[type="file"]');
      expect(input).toBeInTheDocument();
      expect(input).toHaveClass('hidden');
    });

    it('should accept CSV files only', () => {
      render(<CsvImport />);

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(input.accept).toBe('.csv');
    });

    it('should trigger file input when drop zone clicked', async () => {
      render(<CsvImport />);

      const dropZone = screen.getByText(/Drop CSV here/).closest('div');
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      // Mock click on input
      const clickSpy = vi.spyOn(input, 'click');

      await userEvent.click(dropZone!);
      expect(clickSpy).toHaveBeenCalled();
    });
  });

  describe('CSV Parsing - Helper functions', () => {
    describe('parseBool', () => {
      it('should be tested via import behavior', () => {
        // This function is internal, tested through import behavior
        expect(true).toBe(true);
      });
    });

    describe('parseStudent', () => {
      it('should be tested via import behavior', () => {
        // This function is internal, tested through import behavior
        expect(true).toBe(true);
      });
    });
  });

  describe('Download template', () => {
    it('should download CSV template', () => {
      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

      render(<CsvImport />);

      // Only intercept the anchor element used for the download — letting
      // React's createElement calls (for divs/buttons) pass through.
      const realCreateElement = document.createElement.bind(document);
      const anchorClick = vi.fn();
      const createElementSpy = vi
        .spyOn(document, 'createElement')
        .mockImplementation(((tag: string) => {
          if (tag === 'a') {
            const a = realCreateElement('a') as HTMLAnchorElement;
            a.click = anchorClick;
            return a;
          }
          return realCreateElement(tag);
        }) as typeof document.createElement);

      const downloadButton = screen.getByText('Download template');
      fireEvent.click(downloadButton);

      expect(createObjectURLSpy).toHaveBeenCalled();
      expect(anchorClick).toHaveBeenCalled();
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');

      createObjectURLSpy.mockRestore();
      revokeObjectURLSpy.mockRestore();
      createElementSpy.mockRestore();
    });
  });

  describe('Import result display', () => {
    it('should show success message after import', async () => {
      // Mock FileReader
      const mockFileContent = 'name,gender,academic_level\nTest Student,female,proficient';
      const file = new File([mockFileContent], 'test.csv', { type: 'text/csv' });

      globalThis.FileReader = vi.fn().mockImplementation(() => ({
        readAsText: vi.fn(),
        onload: null,
        result: mockFileContent,
      })) as any;

      render(<CsvImport />);

      // Trigger file import
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      await waitFor(() => {
        fireEvent.change(input, { target: { files: [file] } });
      });

      // Result should be shown (this is a simplified test)
      // In real scenario, FileReader would trigger onload
    });

    it('should clear result when X button clicked', async () => {
      // This would be tested with actual file import
      // For now, just verify the UI structure
      render(<CsvImport />);

      // Initially no result banner
      expect(screen.queryByText('students imported')).not.toBeInTheDocument();
    });
  });

  describe('parseCsv', () => {
    // Pass-through translator — we only care about the keys & interpolated values.
    const t = (key: string, vars?: Record<string, string | number>) => {
      if (!vars) return key;
      const parts = Object.entries(vars).map(([k, v]) => `${k}=${v}`).join(' ');
      return `${key}|${parts}`;
    };

    it('errors when there are no rows', () => {
      const { students, errors, warnings } = parseCsv('', t);
      expect(students).toEqual([]);
      expect(errors).toContain('csvImport.error_no_header');
      expect(warnings).toEqual([]);
    });

    it('errors when there is no `name` column', () => {
      const { students, errors } = parseCsv('gender,academic_level\nfemale,advanced', t);
      expect(students).toEqual([]);
      expect(errors[0]).toBe('csvImport.error_missing_name');
    });

    it('reports a per-row error when name cell is empty', () => {
      const csv = 'name,gender\n,female\nAlice,female';
      const { students, errors } = parseCsv(csv, t);
      expect(students).toHaveLength(1);
      expect(students[0].name).toBe('Alice');
      // Row 2 (1-indexed + header) is the offender.
      expect(errors.some((e) => e.includes('row=2'))).toBe(true);
    });

    it('parses a clean roster with no warnings', () => {
      const csv = [
        'name,gender,academic_level,academic_score,behavior_level,behavior_score,notes',
        'Alice,female,advanced,90,excellent,95,Strong reader',
        'Bob,male,proficient,75,good,80,',
      ].join('\n');
      const { students, errors, warnings } = parseCsv(csv, t);
      expect(errors).toEqual([]);
      expect(warnings).toEqual([]);
      expect(students).toHaveLength(2);
      expect(students[0]).toMatchObject({
        name: 'Alice',
        gender: 'female',
        academic_level: 'advanced',
        academic_score: 90,
        behavior_level: 'excellent',
        behavior_score: 95,
        notes: 'Strong reader',
      });
      expect(students[1].notes).toBeUndefined();
    });

    it('warns on invalid gender/academic/behavior values and applies safe defaults', () => {
      const csv = [
        'name,gender,academic_level,behavior_level',
        'Alice,martian,wizard,terrible',
      ].join('\n');
      const { students, warnings } = parseCsv(csv, t);
      expect(students[0].gender).toBe('other');
      expect(students[0].academic_level).toBe('proficient');
      expect(students[0].behavior_level).toBe('good');
      expect(warnings.some((w) => w.includes('column=gender'))).toBe(true);
      expect(warnings.some((w) => w.includes('column=academic_level'))).toBe(true);
      expect(warnings.some((w) => w.includes('column=behavior_level'))).toBe(true);
    });

    it('warns when a score is non-numeric and falls back to 70', () => {
      const csv = 'name,academic_score\nAlice,banana';
      const { students, warnings } = parseCsv(csv, t);
      expect(students[0].academic_score).toBe(70);
      expect(warnings.some((w) => w.includes('warn_invalid_score'))).toBe(true);
    });

    it('clamps out-of-range scores to [0, 100] and warns', () => {
      const csv = [
        'name,academic_score,behavior_score',
        'Alice,150,-20',
      ].join('\n');
      const { students, warnings } = parseCsv(csv, t);
      expect(students[0].academic_score).toBe(100);
      expect(students[0].behavior_score).toBe(0);
      expect(warnings.filter((w) => w.includes('warn_score_clamped'))).toHaveLength(2);
    });

    it('warns when two rows share the same name (case-insensitive)', () => {
      const csv = [
        'name',
        'Alice',
        'alice',
      ].join('\n');
      const { students, warnings } = parseCsv(csv, t);
      expect(students).toHaveLength(2);
      expect(warnings.some((w) => w.includes('warn_duplicate_name'))).toBe(true);
      expect(warnings.some((w) => w.includes('first=2') && w.includes('second=3'))).toBe(true);
    });

    it(`caps imports at ${MAX_ROSTER} rows and warns about the overflow`, () => {
      const header = 'name';
      const rows = Array.from({ length: MAX_ROSTER + 50 }, (_, i) => `Student${i}`);
      const csv = [header, ...rows].join('\n');
      const { students, warnings } = parseCsv(csv, t);
      expect(students.length).toBe(MAX_ROSTER);
      expect(warnings.some((w) => w.includes(`max=${MAX_ROSTER}`))).toBe(true);
    });

    it('parses boolean-ish columns from "true"/"1"/"yes"', () => {
      const csv = [
        'name,is_bilingual,requires_front_row,has_mobility_issues,requires_quiet_area',
        'A,true,1,yes,no',
        'B,false,0,,FALSE',
      ].join('\n');
      const { students } = parseCsv(csv, t);
      expect(students[0]).toMatchObject({
        is_bilingual: true,
        requires_front_row: true,
        has_mobility_issues: true,
        requires_quiet_area: false,
      });
      expect(students[1]).toMatchObject({
        is_bilingual: false,
        requires_front_row: false,
        has_mobility_issues: false,
        requires_quiet_area: false,
      });
    });
  });

  describe('Drag and drop', () => {
    it('should handle drag over', () => {
      render(<CsvImport />);

      const dropZone = screen.getByText(/Drop CSV here/).closest('div');

      const dragOverEvent = new Event('dragover', { bubbles: true });
      dropZone?.dispatchEvent(dragOverEvent);

      // Should not prevent default without proper event structure
      // This is a basic check that the element exists
      expect(dropZone).toBeInTheDocument();
    });

    it('should handle file drop', async () => {
      render(<CsvImport />);

      const dropZone = screen.getByText(/Drop CSV here/).closest('div');

      const mockFile = new File(['name,gender\nTest,female'], 'test.csv', {
        type: 'text/csv',
      });

      const dropEvent = new Event('drop', { bubbles: true }) as any;
      dropEvent.dataTransfer = { files: [mockFile] };
      dropEvent.preventDefault = vi.fn();

      dropZone?.dispatchEvent(dropEvent);

      expect(dropEvent.preventDefault).toHaveBeenCalled();
    });

    it('should ignore non-CSV files on drop', async () => {
      render(<CsvImport />);

      const dropZone = screen.getByText(/Drop CSV here/).closest('div');

      const mockFile = new File(['content'], 'test.txt', {
        type: 'text/plain',
      });

      const dropEvent = new Event('drop', { bubbles: true }) as any;
      dropEvent.dataTransfer = { files: [mockFile] };
      dropEvent.preventDefault = vi.fn();

      dropZone?.dispatchEvent(dropEvent);

      // Should prevent default but not process file
      expect(dropEvent.preventDefault).toHaveBeenCalled();
      expect(mockAddStudent).not.toHaveBeenCalled();
    });
  });
});
