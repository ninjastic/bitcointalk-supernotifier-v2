export default function getNewModlogPrefixLength(previous: string[], current: string[]): number {
  const maxOverlap = Math.min(previous.length, current.length);

  for (let overlap = maxOverlap; overlap >= 0; overlap--) {
    const currentStart = current.length - overlap;
    const matches = previous
      .slice(0, overlap)
      .every((fingerprint, index) => current[currentStart + index] === fingerprint);

    if (matches) {
      return currentStart;
    }
  }

  return current.length;
}
