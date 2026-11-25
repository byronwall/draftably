/**
 * A group's body: one member per line. A line is `name  type  [pk|fk|uk|nn]…  [-> table.column]`.
 * The name is the first word; the type is every word after it up to the first key mark or `->`,
 * so a type may hold spaces (`timestamp with time zone`). A leading `+`, `-` or `~` is a change
 * mark, as on a statement.
 */
import { TABLE_KEYS, type TableKey, type TableRow } from '../model/table';

const NAME = /^[A-Za-z_][A-Za-z0-9_-]*$/,
  REF = /^[A-Za-z_][A-Za-z0-9_.-]*$/;

const isKey = (w: string): w is TableKey => (TABLE_KEYS as readonly string[]).includes(w);

export interface BodyRow {
  name: string;
  row: TableRow;
  mark?: '+' | '-' | '~';
  /** 1-based source line. */
  line: number;
}

/**
 * The members a body lists. `first` is the source line of the body's first line. Blank lines and
 * lines that start with `#` are skipped. Throws through `fail` with the line of a bad row.
 */
export function readBodyRows(
  lines: string[],
  first: number,
  fail: (message: string, line: number) => never,
): BodyRow[] {
  const out: BodyRow[] = [];
  lines.forEach((raw, i) => {
    const line = first + i;
    let text = raw.trim();
    if (!text || text.startsWith('#')) return;
    let mark: BodyRow['mark'];
    if (/^[-+~]\s/.test(text)) {
      mark = text[0] as BodyRow['mark'];
      text = text.slice(1).trim();
    }
    // With two or more spaces between columns, the third column on holds only marks and `->`,
    // so a misspelt mark there is an error, not part of the type.
    const cols = text.split(/[ \t]*\t[ \t]*| {2,}/),
      [name, ...words] = (cols.length >= 3 ? cols.slice(0, 2).join(' ') : text).split(/\s+/),
      end = words.findIndex(w => w.includes('->') || isKey(w.toLowerCase())),
      type = words.slice(0, end < 0 ? words.length : end).join(' '),
      rest = [
        ...(end < 0 ? [] : words.slice(end)),
        ...(cols.length >= 3 ? cols.slice(2).join(' ').split(/\s+/) : []),
      ];
    if (!NAME.test(name))
      fail(
        `A table row starts with its column name (letters, digits, _ or -); got ${name}. Write name  type  [pk|fk|uk|nn]  [-> table.column].`,
        line,
      );
    const keys: TableKey[] = [];
    let ref: string | undefined;
    for (let k = 0; k < rest.length; k++) {
      const w = isKey(rest[k].toLowerCase()) ? rest[k].toLowerCase() : rest[k];
      if (w.includes('->') && w !== '->')
        fail(
          `Row ${name} needs a space on each side of ->: -> ${w.split('->')[1] || 'table.column'}.`,
          line,
        );
      if (w === '->') {
        const target = rest[k + 1];
        if (!target || !REF.test(target) || k + 2 !== rest.length)
          fail(`Row ${name} ends with -> and the one row it refers to: -> orgs.id.`, line);
        ref = target;
        break;
      }
      if (!isKey(w))
        fail(
          `Unknown key mark ${w} on row ${name}; a row's marks are pk, fk, uk and nn, after its type and before -> table.column.`,
          line,
        );
      const key = w as TableKey;
      if (keys.includes(key)) fail(`Row ${name} has ${w} twice.`, line);
      keys.push(key);
    }
    out.push({
      name,
      row: { type, keys, ...(ref ? { ref } : {}) },
      ...(mark ? { mark } : {}),
      line,
    });
  });
  return out;
}
