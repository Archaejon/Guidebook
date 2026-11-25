/**
 * The smallest single splice that turns `before` into `after`: everything
 * between the longest common prefix and the longest common suffix.
 *
 * Edits arrive debounced (one save per pause in typing), so one contiguous
 * splice describes nearly every real change. That is all the shared document
 * needs to merge two people typing in different places, and all an editor needs
 * to keep its caret where it was.
 */
export interface Splice {
  index: number;
  remove: number;
  insert: string;
}

export function spliceDiff(before: string, after: string): Splice {
  if (before === after) return { index: 0, remove: 0, insert: '' };
  const max = Math.min(before.length, after.length);
  let start = 0;
  while (start < max && before.charCodeAt(start) === after.charCodeAt(start)) start++;
  // Never split a surrogate pair: back off onto its first half.
  if (start > 0 && isHighSurrogate(before.charCodeAt(start - 1))) start--;
  let end = 0;
  while (
    end < max - start &&
    before.charCodeAt(before.length - 1 - end) === after.charCodeAt(after.length - 1 - end)
  ) {
    end++;
  }
  if (end > 0 && isLowSurrogate(before.charCodeAt(before.length - end))) end--;
  return {
    index: start,
    remove: before.length - start - end,
    insert: after.slice(start, after.length - end),
  };
}

export function applySplice(text: string, splice: Splice): string {
  return text.slice(0, splice.index) + splice.insert + text.slice(splice.index + splice.remove);
}

/**
 * Three-way merge of one text field: `mine` and `theirs` both started from
 * `base`. When the two changes touch different stretches of text both are kept;
 * when they overlap, `mine` wins, because it is what the person at this screen
 * is looking at and typing into.
 */
export function mergeText(base: string, mine: string, theirs: string): string {
  if (mine === theirs || theirs === base) return mine;
  if (mine === base) return theirs;
  const a = spliceDiff(base, mine);
  const b = spliceDiff(base, theirs);
  const aEnd = a.index + a.remove;
  const bEnd = b.index + b.remove;
  if (bEnd <= a.index && !(b.remove === 0 && a.remove === 0 && b.index === a.index)) {
    // Theirs is entirely before mine: apply mine first, then theirs (offsets unchanged).
    return applySplice(applySplice(base, a), b);
  }
  if (aEnd <= b.index) {
    // Mine is entirely before theirs: apply theirs first, then mine.
    return applySplice(applySplice(base, b), a);
  }
  return mine;
}

/**
 * Where a caret at `position` should sit after `splice` is applied, so text
 * arriving from someone else does not throw the cursor to the end.
 */
export function shiftPosition(position: number, splice: Splice): number {
  if (position <= splice.index) return position;
  if (position >= splice.index + splice.remove) return position + splice.insert.length - splice.remove;
  return splice.index + splice.insert.length;
}

function isHighSurrogate(code: number): boolean {
  return code >= 0xd800 && code <= 0xdbff;
}

function isLowSurrogate(code: number): boolean {
  return code >= 0xdc00 && code <= 0xdfff;
}
