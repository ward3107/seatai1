/** One student per line. Tabs join name columns copied from a spreadsheet.
 * Repeated names stay separate: classmates can share a name. */
export function parsePastedNames(text: string): string[] {
  return text.split(/\r\n|\n|\r/)
    .map((line) => line.replace(/\t+/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}
