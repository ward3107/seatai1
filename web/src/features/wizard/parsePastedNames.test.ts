import { describe, expect, it } from 'vitest';
import { parsePastedNames } from './parsePastedNames';

describe('parsePastedNames', () => {
  it('handles spreadsheet columns, Windows line endings and blank rows', () => {
    expect(parsePastedNames('  דנה\tכהן\r\n\r\n أحمد\tعلي \r\n')).toEqual(['דנה כהן', 'أحمد علي']);
  });
  it('preserves classmates with the same name and punctuation', () => {
    expect(parsePastedNames("Alex Smith\nAlex Smith\nO’Neil, Sam")).toEqual(['Alex Smith', 'Alex Smith', 'O’Neil, Sam']);
  });
  it('does not create students from whitespace', () => {
    expect(parsePastedNames(' \t\n\r')).toEqual([]);
  });
});
