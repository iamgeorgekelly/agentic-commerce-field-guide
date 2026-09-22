// Browser-safe, deterministic snapshot comparison. No network access or mutations.
// This is a deliberately narrow local contract, not an OpenAI upload validator.
export const ruleVersion = '1.0.0';
export const scope = 'Compares reader-supplied source and feed snapshots for exact item IDs, current USD price, explicit sale state, and availability. References are not fetched or authenticated. A match does not prove live stock, provider acceptance, or shopper display.';
export const limits = Object.freeze({ maxItems: 100, maxInputBytes: 200000, maxIdLength: 128, maxEvidenceRefLength: 1000, minMaxAgeHours: 1, maxMaxAgeHours: 720 });
export const availabilityValues = Object.freeze(['in_stock', 'out_of_stock', 'pre_order', 'backorder', 'unknown']);

const fields = ['price', 'sale_price', 'availability'];
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const text = (value, max) => typeof value === 'string' && value.length >= 1 && value.length <= max && value === value.trim() && !/[\u0000-\u001f\u007f]/.test(value);

// Parse the written calendar date before applying the offset. Date.parse alone
// accepts nonexistent dates such as February 30 by rolling into the next month.
function timestamp(value) {
  if (typeof value !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|([+-])(\d{2}):(\d{2}))$/.exec(value);
  if (!match) return null;
  const [, y, m, d, h, min, s, fraction = '', zone, sign, oh = '0', om = '0'] = match;
  const [year, month, day, hour, minute, second, offsetHour, offsetMinute] = [y, m, d, h, min, s, oh, om].map(Number);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > days[month - 1] || hour > 23 || minute > 59 || second > 59 || offsetHour > 14 || offsetMinute > 59 || (offsetHour === 14 && offsetMinute !== 0) || zone === '-00:00') return null;
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(hour, minute, second, Number(fraction.padEnd(3, '0')));
  const offset = (offsetHour * 60 + offsetMinute) * 60000 * (sign === '-' ? -1 : 1);
  return date.getTime() - offset;
}

// Integer cents avoid floating-point rounding. The local ceiling is explicit:
// 999,999,999.99 USD; prices above this range require a different checker.
function cents(value) {
  if (typeof value !== 'string' || !/^(?:0|[1-9]\d{0,8})\.\d{2} USD$/.test(value)) return null;
  const amount = Number(value.slice(0, -4).replace('.', ''));
  return amount > 0 ? amount : null;
}

export function checkFreshness(input) {
  const issues = [];
  const changes = [];
  const add = (code, path, message) => issues.push({ code, path, message });
  const report = checkedAt => ({ status: issues.length ? 'hold' : changes.length ? 'update_needed' : 'match', issues, changes: issues.length ? [] : changes, checkedAt, ruleVersion, scope });
  const keys = (value, expected, path) => {
    for (const key of Object.keys(value)) if (!expected.includes(key)) add('unknown_field', `${path}.${key}`, 'This field is outside the local snapshot contract. Remove it from the comparison input only after reviewing its meaning.');
    for (const key of expected) if (!Object.hasOwn(value, key)) add('missing_field', `${path}.${key}`, 'An explicit value is required by this local comparison contract.');
  };
  if (!object(input)) {
    add('input_object', '$', 'Supply one JSON object in the snapshot comparison format.');
    return report(null);
  }
  keys(input, ['schemaVersion', 'profile', 'asOf', 'maxAgeHours', 'source', 'feed'], '$');
  if (input.schemaVersion !== '1.0') add('schema_version', '$.schemaVersion', 'Use local schemaVersion 1.0.');
  if (input.profile !== 'openai-native-stable') add('profile', '$.profile', 'Only the openai-native-stable comparison profile is supported. This does not validate the complete provider feed.');
  const asOf = timestamp(input.asOf);
  if (asOf === null) add('timestamp', '$.asOf', 'Use a real calendar timestamp with seconds and an explicit known timezone: YYYY-MM-DDTHH:mm:ss[.SSS]Z or a numeric offset.');
  const ageValid = typeof input.maxAgeHours === 'number' && Number.isFinite(input.maxAgeHours) && input.maxAgeHours >= limits.minMaxAgeHours && input.maxAgeHours <= limits.maxMaxAgeHours;
  if (!ageValid) add('age_threshold', '$.maxAgeHours', 'Supply your own freshness threshold from 1 through 720 hours. This is a local policy, not a provider guarantee.');
  const snapshots = {};
  for (const name of ['source', 'feed']) {
    const snapshot = input[name], path = `$.${name}`;
    if (!object(snapshot)) { add('snapshot_object', path, 'Supply a snapshot object.'); continue; }
    keys(snapshot, ['capturedAt', 'evidenceRef', 'items'], path);
    const capturedAt = timestamp(snapshot.capturedAt);
    if (capturedAt === null) add('timestamp', `${path}.capturedAt`, 'Supply a real calendar timestamp with seconds and an explicit known timezone.');
    else if (asOf !== null) {
      if (capturedAt > asOf) add('future_snapshot', `${path}.capturedAt`, 'The snapshot is later than asOf. Resolve the clock or reference time before comparison.');
      else if (ageValid && asOf - capturedAt > input.maxAgeHours * 3600000) add('stale_snapshot', `${path}.capturedAt`, 'The snapshot exceeds your selected age threshold; obtain current evidence before proposing updates.');
    }
    if (!text(snapshot.evidenceRef, limits.maxEvidenceRefLength)) add('evidence_reference', `${path}.evidenceRef`, 'Supply a nonempty reference of at most 1,000 characters with no surrounding whitespace or control characters. The checker does not fetch or authenticate it.');
    if (!Array.isArray(snapshot.items) || snapshot.items.length < 1 || snapshot.items.length > limits.maxItems) {
      add('item_count', `${path}.items`, 'Supply 1 through 100 items in each snapshot.'); continue;
    }
    const items = new Map();
    for (let i = 0; i < snapshot.items.length; i++) {
      const item = snapshot.items[i], itemPath = `${path}.items[${i}]`;
      if (!object(item)) { add('item_object', itemPath, 'Supply an item object.'); continue; }
      keys(item, ['item_id', 'price', 'sale_price', 'availability'], itemPath);
      if (!text(item.item_id, limits.maxIdLength)) add('item_id', `${itemPath}.item_id`, 'Use an exact string ID of 1–128 characters, without surrounding whitespace or control characters. IDs are never trimmed, recased, or converted from numbers.');
      else if (items.has(item.item_id)) add('duplicate_item_id', `${itemPath}.item_id`, 'The same exact item ID occurs more than once in this snapshot.');
      else items.set(item.item_id, item);
      const price = cents(item.price), sale = item.sale_price === null ? null : cents(item.sale_price);
      if (price === null) add('price', `${itemPath}.price`, 'Use a positive USD amount with two decimals, no leading zeros, and no more than nine whole-number digits, such as 79.99 USD.');
      if (item.sale_price !== null && sale === null) add('sale_price', `${itemPath}.sale_price`, 'Use explicit null for confirmed no sale, or a positive USD amount with two decimals. Omission does not establish no sale.');
      else if (sale !== null && price !== null && sale >= price) add('sale_relationship', `${itemPath}.sale_price`, 'The current sale price must be strictly below the regular price.');
      if (!availabilityValues.includes(item.availability)) add('availability', `${itemPath}.availability`, 'Use the native vocabulary: in_stock, out_of_stock, pre_order, backorder, or unknown. No alias is converted automatically.');
      else if (item.availability === 'unknown') add('unknown_availability', `${itemPath}.availability`, 'The provider vocabulary permits unknown, but this comparison cannot verify stock when either snapshot is unknown.');
    }
    snapshots[name] = { capturedAt, items };
  }
  if (snapshots.source && snapshots.feed) {
    for (const itemId of snapshots.source.items.keys()) if (!snapshots.feed.items.has(itemId)) add('missing_feed_item', '$.feed.items', `Source item ${JSON.stringify(itemId)} is missing from the feed snapshot. Resolve scope or identity before comparing.`);
    for (const itemId of snapshots.feed.items.keys()) if (!snapshots.source.items.has(itemId)) add('missing_source_item', '$.source.items', `Feed item ${JSON.stringify(itemId)} has no source record. Resolve scope or identity before comparing.`);
    if (!issues.length) {
      for (const [itemId, source] of snapshots.source.items) {
        const feed = snapshots.feed.items.get(itemId);
        for (const field of fields) if (source[field] !== feed[field]) changes.push({ itemId, field, sourceValue: source[field], feedValue: feed[field] });
      }
      if (changes.length && snapshots.source.capturedAt < snapshots.feed.capturedAt) add('source_older_than_feed', '$.source.capturedAt', 'The supplied authority is older than the disagreeing feed snapshot. Refresh the source or reconcile chronology before proposing an update.');
    }
  }
  return report(asOf === null ? null : input.asOf);
}
