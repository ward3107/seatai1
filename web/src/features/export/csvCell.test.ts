import { describe, it, expect } from 'vitest';
import { csvCell } from './ExportButton';

describe('csvCell', () => {
  it('leaves ordinary values unquoted', () => {
    expect(csvCell('Alice')).toBe('Alice');
    expect(csvCell(42)).toBe('42');
    expect(csvCell(undefined)).toBe('');
  });

  it('quotes and escapes values with commas, quotes, or newlines', () => {
    expect(csvCell('Cohen, Alice')).toBe('"Cohen, Alice"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('line1\nline2')).toBe('"line1\nline2"');
  });

  it('neutralizes spreadsheet formula injection by prefixing a quote', () => {
    // A student-controlled name that would execute as a formula in Excel/Sheets.
    expect(csvCell('=HYPERLINK("http://evil","x")')).toBe(`"'=HYPERLINK(""http://evil"",""x"")"`);
    expect(csvCell('+1+1')).toBe(`'+1+1`);
    expect(csvCell('-2')).toBe(`'-2`);
    expect(csvCell('@SUM(A1)')).toBe(`'@SUM(A1)`);
    // A leading tab that Excel would strip back to a formula is also guarded.
    expect(csvCell('\t=1')).toBe(`'\t=1`);
  });
});
