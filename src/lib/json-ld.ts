// Serializes a JSON-LD object for embedding inside <script type="application/ld+json">.
// Unicode-escapes "<" so admin-entered content containing the literal substring
// "</script>" (product name/description, etc.) can't prematurely close the tag —
// classic JSON-LD injection vector. `<` round-trips correctly through JSON.parse,
// unlike HTML-entity escaping, which would corrupt the actual string value.
export default function jsonLd(data: unknown): string {
  return JSON.stringify(data).split("<").join(String.fromCharCode(92, 117, 48, 48, 51, 99));
}
