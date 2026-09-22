// Browser-safe local review. No network access, model inference, or provider submission.
export const version = '1.1.0';
export const MAX_REVIEW_BYTES = 64 * 1024;
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const filled = value => typeof value === 'string' && value.trim().length > 0;
const decimal = value => typeof value === 'string' && /^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value) && Number(value) > 0 && Number.isFinite(Number(value));
const usd = value => typeof value === 'string' && /^(?:0|[1-9]\d*)\.\d{2} USD$/.test(value) && Number(value.split(' ')[0]) > 0;
const validUrl = value => { try { const u = new URL(value); return ['http:', 'https:'].includes(u.protocol) && !u.username && !u.password; } catch { return false; } };
export function validGtin(value) {
  if (typeof value !== 'string' || !/^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(value)) return false;
  const digits = value.slice(0, -1).split('').reverse();
  const sum = digits.reduce((total, digit, i) => total + Number(digit) * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - sum % 10) % 10 === Number(value.at(-1));
}

export function mapRecord(input) {
  if (!object(input)) throw new Error('Input must be one JSON object.');
  const row = structuredClone(input), changes = [], unresolved = [];
  const rename = (from, to) => {
    if (!Object.hasOwn(row, from)) return;
    if (Object.hasOwn(row, to) && JSON.stringify(row[to]) !== JSON.stringify(row[from])) {
      unresolved.push({ code: 'alias_conflict', path: from, message: `Conflicting ${from} and ${to}; no precedence guessed.` }); return;
    }
    if (!Object.hasOwn(row, to)) { row[to] = row[from]; changes.push(`${from} → ${to}`); }
    delete row[from];
  };
  for (const [from, to] of [['id','item_id'],['link','url'],['image_link','image_url'],['item_group_id','group_id']]) rename(from,to);
  if (row.availability === 'preorder') { row.availability = 'pre_order'; changes.push('preorder → pre_order'); }
  if (Object.hasOwn(row, 'variant_option')) {
    const options = Object.create(null);
    let valid = filled(row.variant_option);
    if (valid) for (const token of row.variant_option.split(',')) {
      const parts = token.split(':').map(part => part.trim());
      if (parts.length !== 2 || !parts[0] || !parts[1] || Object.hasOwn(options, parts[0])) { valid = false; break; }
      options[parts[0]] = parts[1];
    }
    if (!valid) unresolved.push({code:'ambiguous_options',path:'variant_option',message:'This small parser needs unambiguous name:value pairs with unique names. No repair guessed.'});
    else if (Object.hasOwn(row,'listing_has_variations') && row.listing_has_variations !== true) unresolved.push({code:'variant_flag_conflict',path:'listing_has_variations',message:'The supplied variant flag does not enable variants. Resolve it before constructing native variant fields; no supplied value is overwritten.'});
    else if (row.variant_dict && JSON.stringify(row.variant_dict) !== JSON.stringify(options)) unresolved.push({code:'option_representation_conflict',path:'variant_dict',message:'Two option representations disagree.'});
    else { row.variant_dict = {...options}; row.listing_has_variations = true; delete row.variant_option; changes.push('Constructed explicit native variant fields'); }
  }
  const measureKeys = ['product_length','product_width','product_height'].filter(key => Object.hasOwn(row,key));
  if (measureKeys.length) {
    const axes = {}, factors = {cm:1,in:2.54,mm:0.1,m:100,ft:30.48};
    let valid = measureKeys.length >= 2;
    for (const key of measureKeys) {
      const match = typeof row[key] === 'string' && row[key].match(/^((?:0|[1-9]\d*)(?:\.\d+)?) (cm|in|mm|m|ft)$/);
      const converted = match ? Number(match[1]) * factors[match[2]] : NaN;
      if (!Number.isFinite(converted) || converted <= 0 || converted > 1000000) valid = false;
      else axes[key.replace('product_','')] = String(Number(converted.toPrecision(12)));
    }
    if (!valid) unresolved.push({code:'unresolved_dimensions',path:'product_dimensions',message:'Need at least two positive explicit axes within this demonstration’s numeric range.'});
    else if (['dimensions','length','width','height','dimensions_unit'].some(key => Object.hasOwn(row,key))) unresolved.push({code:'dimension_representation_conflict',path:'dimensions',message:'Source axes coexist with a structured or separate native measurement representation. Reconcile them before conversion; no supplied measurements are overwritten.'});
    else { row.dimensions = {...axes,unit:'cm'}; for (const key of measureKeys) delete row[key]; changes.push('Converted explicit product axes to centimeters'); }
  }
  return {row,changes,unresolved};
}

export function reviewRecord(row, evidence = {}) {
  if (!object(row) || !object(evidence)) throw new Error('Record and supplied evidence must be objects.');
  const issues = [];
  const add = (code,path,message) => issues.push({code,path,message});
  // This is a declared canonical-field review subset, not an emulation of provider ingestion.
  for (const key of ['item_id','title','description','url','brand','seller_name','image_url','availability','price'])
    if (!filled(row[key])) add('required_string',key,'Supply a nonempty string from a trusted source. Numeric identifiers are not repaired.');
  for (const key of ['url','image_url']) if (filled(row[key]) && !validUrl(row[key])) add('url_format',key,'Need an absolute HTTP(S) URL without credentials; reachability is not tested.');
  if (filled(row.price) && !usd(row.price)) add('price_profile','price','This experiment checks positive USD amounts with two decimal places only.');
  if (filled(row.availability) && !['in_stock','out_of_stock','pre_order','backorder','unknown'].includes(row.availability)) add('stock_vocabulary','availability','Value is outside the selected native vocabulary.');
  if (Object.hasOwn(row,'item_group_id') || Object.hasOwn(row,'variant_option')) add('source_variant_fields','variant_option','Source-style variant fields still need an explicit mapping.');
  const variant = row.listing_has_variations === true || Object.hasOwn(row,'group_id') || Object.hasOwn(row,'variant_dict');
  if (variant) {
    if (!filled(row.group_id) || row.group_id === row.item_id) add('parent_identity','group_id','Keep the parent distinct from its child item.');
    if (row.listing_has_variations !== true) add('variant_flag','listing_has_variations','Explicitly declare the variant representation.');
    if (!object(row.variant_dict) || !Object.keys(row.variant_dict).length || Object.entries(row.variant_dict).some(([k,v]) => !filled(k) || !filled(v))) add('selected_options','variant_dict','Supply a nonempty selected-option map.');
    else for (const [key,value] of Object.entries(row.variant_dict)) {
      if (Object.hasOwn(row,key) && row[key] !== value) add('option_conflict',key,'Selected option disagrees with the top-level value.');
    }
  }
  if (Object.hasOwn(row,'gtin') && !validGtin(row.gtin)) add('gtin_format','gtin','GTIN length or checksum is invalid; assignment is not checked.');
  if (Object.hasOwn(row,'sale_price') && (!usd(row.sale_price) || !usd(row.price) || Number(row.sale_price.split(' ')[0]) >= Number(row.price.split(' ')[0]))) add('sale_relationship','sale_price','This local review requires a positive USD sale below the regular price.');
  if (['product_length','product_width','product_height'].some(key => Object.hasOwn(row,key))) add('source_dimensions','product_dimensions','Explicit source measurements have not been normalized.');
  if (Object.hasOwn(row,'dimensions')) {
    const d = row.dimensions;
    if (!object(d) || !['in','cm','ft','m','mm'].includes(d.unit) || Object.keys(d).some(k => !['length','width','height','unit'].includes(k)) || ['length','width','height'].filter(k => Object.hasOwn(d,k)).length < 2 || ['length','width','height'].some(k => Object.hasOwn(d,k) && !decimal(d[k]))) add('dimensions_format','dimensions','Need at least two positive decimal-string axes and one explicit supported unit.');
    if (evidence.dimensionBasis !== 'product') add('dimension_basis','evidence.dimensionBasis','Product measurement basis is missing or describes packaging.');
  }
  if (Object.hasOwn(evidence,'pagePrice') && evidence.pagePrice !== (row.sale_price ?? row.price)) add('page_price_conflict','evidence.pagePrice','Supplied page-price evidence disagrees with the current offer. No live page was fetched.');
  return issues;
}

export function evaluateCase(fixture, method) {
  if (!['copy','mapped'].includes(method)) throw new Error('Unknown method.');
  const mapped = method === 'mapped' ? mapRecord(fixture.input) : {row:structuredClone(fixture.input),changes:[],unresolved:[]};
  const issues = [...mapped.unresolved,...reviewRecord(mapped.row,fixture.evidence)];
  return {method,status:issues.length ? 'hold' : 'clear',label:issues.length ? 'Needs review' : 'No issue in these checks',changes:mapped.changes,issues,output:mapped.row};
}

// Bound both the browser and downloaded CLI input before cloning or reviewing it.
// Evidence is a user assertion; parsing it does not verify its source.
export function parseReviewInput(recordText, evidenceText = '{}') {
  if (typeof recordText !== 'string' || typeof evidenceText !== 'string') throw new Error('Record and evidence must be JSON text.');
  if (recordText.length + evidenceText.length > MAX_REVIEW_BYTES || new TextEncoder().encode(recordText + evidenceText).length > MAX_REVIEW_BYTES)
    throw new Error('Record and evidence together must fit within 64 KiB of UTF-8 JSON.');
  const parse = (text, name) => {
    let value;
    try { value = JSON.parse(text); } catch { throw new Error(`${name} must contain valid JSON.`); }
    if (!object(value)) throw new Error(`${name} must be one JSON object, not an array or scalar.`);
    const pending = [{value, depth: 0}];
    let nodes = 0;
    while (pending.length) {
      const entry = pending.pop();
      if (++nodes > 2000 || entry.depth > 20) throw new Error(`${name} is too deeply nested or complex for this single-record check.`);
      if (typeof entry.value === 'number' && !Number.isFinite(entry.value)) throw new Error(`${name} contains a number outside the supported finite range.`);
      if (entry.value !== null && typeof entry.value === 'object')
        for (const child of Object.values(entry.value)) pending.push({value: child, depth: entry.depth + 1});
    }
    return value;
  };
  return {input: parse(recordText, 'Product record'), evidence: parse(evidenceText.trim() || '{}', 'Supplied evidence')};
}

export function reviewInput(recordText, evidenceText = '{}', method = 'copy') {
  const fixture = parseReviewInput(recordText, evidenceText);
  return {
    schemaVersion: '1.0',
    ruleVersion: version,
    scope: 'Local canonical-field review subset; positive USD prices only. No provider submission or live-source verification.',
    evidenceStatus: 'Supplied by the user; not independently verified.',
    notTested: ['Provider admission or upload acceptance', 'Live URLs, images, checkout, or stock', 'GTIN assignment', 'Whole-feed uniqueness and cross-row option consistency', 'Country/category-specific requirements outside this subset'],
    input: fixture.input,
    evidence: fixture.evidence,
    ...evaluateCase(fixture, method),
  };
}
