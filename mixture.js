'use strict';

// Rounded normal boiling points in °C are used only to seed the teaching example.
const hydrocarbons = [
  ['Methane', 'CH4', -161.5],
  ['Ethane', 'C2H6', -88.6],
  ['Ethylene', 'C2H4', -103.7, 'ethene'],
  ['Acetylene', 'C2H2', -84.0, 'ethyne'],
  ['Propane', 'C3H8', -42.1],
  ['Propylene', 'C3H6', -47.6, 'propene'],
  ['Propyne', 'C3H4', -23.2, 'methylacetylene'],
  ['Isobutane', 'C4H10', -11.7, '2-methylpropane i-butane'],
  ['n-Butane', 'C4H10', -0.5, 'butane normal'],
  ['1-Butene', 'C4H8', -6.3, 'but-1-ene'],
  ['Isobutylene', 'C4H8', -6.9, 'isobutene 2-methylpropene'],
  ['trans-2-Butene', 'C4H8', 0.9, 'trans-but-2-ene'],
  ['cis-2-Butene', 'C4H8', 3.7, 'cis-but-2-ene'],
  ['1,3-Butadiene', 'C4H6', -4.4, 'buta-1,3-diene'],
  ['Neopentane', 'C5H12', 9.5, '2,2-dimethylpropane'],
  ['Isopentane', 'C5H12', 27.8, '2-methylbutane i-pentane'],
  ['n-Pentane', 'C5H12', 36.1, 'pentane normal'],
  ['1-Pentene', 'C5H10', 30.0, 'pent-1-ene'],
  ['Cyclopentane', 'C5H10', 49.2],
  ['2-Methylpentane', 'C6H14', 60.3, 'isohexane i-hexane'],
  ['3-Methylpentane', 'C6H14', 63.3],
  ['n-Hexane', 'C6H14', 68.7, 'hexane normal'],
  ['1-Hexene', 'C6H12', 63.5, 'hex-1-ene'],
  ['Methylcyclopentane', 'C6H12', 71.8],
  ['Benzene', 'C6H6', 80.1],
  ['Cyclohexane', 'C6H12', 80.7],
  ['n-Heptane', 'C7H16', 98.4, 'heptane normal'],
  ['1-Heptene', 'C7H14', 93.6, 'hept-1-ene'],
  ['Methylcyclohexane', 'C7H14', 100.9],
  ['Toluene', 'C7H8', 110.6, 'methylbenzene'],
  ['Cycloheptane', 'C7H14', 118.4],
  ['Isooctane', 'C8H18', 99.2, '2,2,4-trimethylpentane i-octane'],
  ['1-Octene', 'C8H16', 121.3, 'oct-1-ene'],
  ['n-Octane', 'C8H18', 125.6, 'octane normal'],
  ['Ethylbenzene', 'C8H10', 136.2],
  ['p-Xylene', 'C8H10', 138.4, 'para xylene 1,4-dimethylbenzene'],
  ['m-Xylene', 'C8H10', 139.1, 'meta xylene 1,3-dimethylbenzene'],
  ['o-Xylene', 'C8H10', 144.4, 'ortho xylene 1,2-dimethylbenzene'],
  ['Styrene', 'C8H8', 145.2, 'vinylbenzene'],
  ['n-Nonane', 'C9H20', 150.8, 'nonane normal'],
  ['Cumene', 'C9H12', 152.4, 'isopropylbenzene'],
  ['n-Decane', 'C10H22', 174.1, 'decane normal'],
  ['n-Undecane', 'C11H24', 195.9, 'undecane normal'],
  ['Naphthalene', 'C10H8', 218.0],
  ['n-Dodecane', 'C12H26', 216.2, 'dodecane normal'],
  ['n-Tridecane', 'C13H28', 234.5, 'tridecane normal'],
  ['n-Tetradecane', 'C14H30', 253.6, 'tetradecane normal'],
  ['n-Pentadecane', 'C15H32', 270.6, 'pentadecane normal'],
  ['n-Hexadecane', 'C16H34', 286.9, 'hexadecane cetane normal'],
  ['n-Eicosane', 'C20H42', 343.0, 'eicosane normal'],
].map(([name, formula, boilingPoint, aliases = '']) => ({
  name, formula, aliases,
  // Common entropy of vaporization approximation at a 373 K reference temperature.
  logVolatility: 10 * (100 - boilingPoint) / 373.15,
}));

const searchKey = (text) => text.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g, '');
const componentTerms = ({ name, formula, aliases }) => [name, formula, ...aliases.split(' ')];
const courseComponents = [
  ['n-Pentane', 2.50],
  ['n-Hexane', 2.00],
  ['n-Heptane', 1.00],
  ['n-Octane', 0.70],
];
const feedUnits = 1000; // 0.1 mol% per unit
const labCaseKey = 'distillation-lab:case-v1';

let selectedComponents = [];
let componentInputs = [];
let keyIndex = 0;

function referenceComponent() {
  return selectedComponents[keyIndex + 1] ?? selectedComponents[0];
}

function feedAndKeyInputs() {
  return { componentInputs, keys: [keyIndex, keyIndex + 1] };
}

function updateFeedBalance() {
  const alpha = componentInputs.map(({ alpha: input }) => input.valueAsNumber);
  $('sort-mixture').hidden = !alpha.some((value, index) => index > 0 && value > alpha[index - 1]);
  const note = $('feed-balance-error');
  let error = '';
  if (componentInputs.length) {
    const entered = componentInputs.slice(0, -1);
    const balance = componentInputs.at(-1).feed;
    for (const { feed, alpha } of componentInputs) {
      feed.setAttribute('aria-invalid', String(!feed.readOnly && !feed.validity.valid));
      alpha.setAttribute('aria-invalid', String(!alpha.validity.valid));
    }
    const valid = entered.every(({ feed }) => feed.validity.valid);
    const enteredTotal = entered.reduce((sum, { feed }) => sum + Math.round(10 * feed.valueAsNumber), 0);
    const remaining = feedUnits - enteredTotal;
    if (!valid) error = 'Enter a value from 0.1 to 99.9 mol% in 0.1 increments for each editable component.';
    else if (remaining < 1) {
      error = `The entered fractions total ${(enteredTotal / 10).toFixed(1)} mol%. Leave at least 0.1 mol% for the balance component.`;
    }
    balance.value = error ? '' : (remaining / 10).toFixed(1);
    balance.setAttribute('aria-invalid', String(Boolean(error)));
  }
  if (note.textContent !== error) note.textContent = error;
  note.hidden = !error;
}

function saveLabCase() {
  const components = componentInputs.map(({ component, feed, alpha }) => ({
    name: component.name,
    logVolatility: component.logVolatility,
    feedUnits: component.feedUnits,
    feed: feed.value,
    alpha: alpha.value,
  }));
  const settings = Object.fromEntries(controls.map(({ key, number, range }) =>
    [key, { value: number.value, range: range.value }]));
  try {
    sessionStorage.setItem(labCaseKey, JSON.stringify({ components, keyIndex, settings }));
  } catch {
    // The live case remains usable when session storage is unavailable.
  }
}

function restoreLabCase() {
  let saved;
  try {
    saved = JSON.parse(sessionStorage.getItem(labCaseKey));
  } catch {
    // Start with an empty mixture when there is no readable case.
  }
  const components = saved?.components;
  const validComponents = Array.isArray(components) && components.length <= feedUnits
    && components.every((component) => typeof component?.name === 'string' && Number.isFinite(component.logVolatility));
  if (validComponents) {
    selectedComponents = components.map(({ name, logVolatility, feedUnits }) => ({ name, logVolatility, feedUnits }));
    const lastKey = Math.max(0, components.length - 2);
    if (Number.isInteger(saved.keyIndex) && saved.keyIndex >= 0 && saved.keyIndex <= lastKey) keyIndex = saved.keyIndex;
    for (const { key, number, range } of controls) {
      const setting = saved.settings?.[key];
      if (typeof setting?.value === 'string') number.value = setting.value;
      if (typeof setting?.range === 'string') range.value = setting.range;
    }
  }
  document.addEventListener('lab:results', saveLabCase);
  renderMixture('', validComponents ? components : []);
}

function saveComponentInputs() {
  const reference = referenceComponent()?.logVolatility ?? 0;
  for (const { component, feed, alpha } of componentInputs) {
    component.feedUnits = Math.round(feed.valueAsNumber * 10);
    if (!alpha.readOnly && alpha.validity.valid && alpha.value !== alpha.defaultValue) {
      component.logVolatility = reference + Math.log(alpha.valueAsNumber);
    }
  }
}

function redistributeFeed() {
  const weights = selectedComponents.map(({ feedUnits: units }) => units > 0 ? units : 1);
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  const flexible = feedUnits - selectedComponents.length;
  let cumulative = 0;
  let assigned = 0;
  selectedComponents.forEach((component, index) => {
    cumulative += weights[index];
    const throughRow = Math.round(flexible * cumulative / total);
    component.feedUnits = 1 + throughRow - assigned;
    assigned = throughRow;
  });
}

function renderMixture(message = '', drafts = []) {
  const count = selectedComponents.length;
  const keySelect = $('key-pair');
  keySelect.replaceChildren();
  for (let i = 0; i < count - 1; i++) {
    keySelect.add(new Option(`${selectedComponents[i].name} / ${selectedComponents[i + 1].name}`, String(i)));
  }
  keySelect.value = String(keyIndex);
  $('key-pair-field').hidden = count < 2;
  $('mixture-inputs').hidden = count === 0;
  $('mixture-start').hidden = count >= 2;
  $('clear-mixture').hidden = count === 0;
  $('component-status').textContent = message || `${count} component${count === 1 ? '' : 's'} selected`;

  const reference = referenceComponent()?.logVolatility ?? 0;
  const rows = $('mixture-rows');
  rows.replaceChildren();
  componentInputs = selectedComponents.map((component, index) => {
    const { name, logVolatility } = component;
    const heavy = count > 1 && index === keyIndex + 1;
    const role = count < 2 ? 'Reference' : index === keyIndex ? 'Light key' : heavy ? 'Heavy key' : 'Nonkey';
    const balance = index === count - 1;
    const row = document.createElement('tr');
    row.innerHTML = `<th scope="row"><span></span><small></small></th>
      <td><input class="value feed-moles" type="number" min="0.1" max="99.9" step="0.1" inputmode="decimal" required>
        ${balance ? '<small>Balance</small>' : ''}</td>
      <td><input class="value volatility" type="number" min="0.000000001" max="1000000000" step="any" inputmode="decimal" required></td>
      <td><button class="remove-component" type="button">×</button></td>`;
    row.querySelector('th span').textContent = name;
    row.querySelector('th small').textContent = role;
    const feed = row.querySelector('.feed-moles');
    feed.setAttribute('aria-label', `${name} feed mol percent`);
    feed.value = Number.isFinite(component.feedUnits) ? (component.feedUnits / 10).toFixed(1) : '';
    feed.readOnly = balance;
    feed.setAttribute('aria-describedby', 'feed-balance-error');
    const alpha = row.querySelector('.volatility');
    alpha.setAttribute('aria-label', `${name} relative volatility`);
    const relative = Math.exp(logVolatility - reference);
    alpha.defaultValue = Number.isFinite(relative) ? String(Number(relative.toPrecision(12))) : '';
    alpha.readOnly = heavy || count === 1;
    if (!feed.readOnly && typeof drafts[index]?.feed === 'string') feed.value = drafts[index].feed;
    if (!alpha.readOnly && typeof drafts[index]?.alpha === 'string') alpha.value = drafts[index].alpha;
    const remove = row.querySelector('button');
    remove.setAttribute('aria-label', `Remove ${name}`);
    remove.addEventListener('click', () => {
      changeComponents(() => selectedComponents.splice(index, 1), `Removed ${name}.`);
      const buttons = rows.querySelectorAll('.remove-component');
      (buttons[Math.min(index, buttons.length - 1)] ?? $('component-search')).focus();
    });
    rows.append(row);
    return { component, name, alpha, feed };
  });
  for (const link of document.querySelectorAll('[data-dof-link]')) {
    link.search = count >= 2 && count !== courseComponents.length ? `?components=${count}` : '';
  }
  updateResults();
}

function changeComponents(change, message) {
  saveComponentInputs();
  const oldLight = selectedComponents[keyIndex];
  const oldHeavy = selectedComponents[keyIndex + 1];
  change?.();
  selectedComponents.sort((a, b) => b.logVolatility - a.logVolatility);
  const heavy = selectedComponents.indexOf(oldHeavy);
  const light = selectedComponents.indexOf(oldLight);
  // Retain the former heavy key where possible, using its new adjacent light key.
  keyIndex = heavy > 0 ? heavy - 1 : light >= 0 && light < selectedComponents.length - 1 ? light : 0;
  if (change) redistributeFeed();
  const newLight = selectedComponents[keyIndex];
  const newHeavy = selectedComponents[keyIndex + 1];
  const keyChange = oldLight && oldHeavy && newHeavy && (newLight !== oldLight || newHeavy !== oldHeavy);
  const countMessage = `${message} ${selectedComponents.length} selected.`;
  renderMixture(keyChange ? `${countMessage} Keys are now ${newLight.name} / ${newHeavy.name}.` : countMessage);
}

function setCourseMixture() {
  const reference = hydrocarbons.find(({ name }) => name === 'n-Heptane').logVolatility;
  selectedComponents = courseComponents.map(([name, alpha]) => ({
    name,
    feedUnits: 250,
    logVolatility: reference + Math.log(alpha),
  }));
  keyIndex = 1;
  $('component-search').value = '';
  renderMixture();
}

function setPinchMixture() {
  const reference = hydrocarbons.find(({ name }) => name === 'Toluene').logVolatility;
  selectedComponents = [
    { name: 'Benzene', feedUnits: 500, logVolatility: reference + Math.log(2.5) },
    { name: 'Toluene', feedUnits: 500, logVolatility: reference },
  ];
  keyIndex = 0;
  $('component-search').value = '';
  renderMixture();
}

function clearMixture() {
  selectedComponents = [];
  keyIndex = 0;
  $('component-search').value = '';
  renderMixture();
}

function initMixturePicker() {
  const picker = $('component-picker');
  const search = $('component-search');
  const results = $('component-results');
  const custom = $('custom-component');
  const customAlpha = $('custom-alpha');
  const customError = $('custom-error');

  function closeSearch() {
    results.hidden = true;
    custom.hidden = true;
    customError.hidden = true;
  }

  function addComponent(component) {
    if (selectedComponents.length >= feedUnits) {
      $('component-status').textContent = 'The 0.1 mol% feed resolution supports up to 1000 components.';
      return;
    }
    if (selectedComponents.some(({ name }) => searchKey(name) === searchKey(component.name))) {
      $('component-status').textContent = `${component.name} is already selected.`;
      return;
    }
    changeComponents(() => {
      selectedComponents.push({
        ...component,
        feedUnits: Math.round(feedUnits / Math.max(1, selectedComponents.length)),
      });
    }, `Added ${component.name}.`);
    search.value = '';
    search.focus();
    closeSearch();
  }

  function openCustom(name) {
    results.hidden = true;
    $('custom-name').textContent = name;
    const reference = referenceComponent();
    $('custom-reference').textContent = reference
      ? `Enter α relative to ${reference.name}.`
      : 'The first component becomes the reference at α = 1 until you choose a key pair.';
    customAlpha.value = reference ? '' : '1';
    customAlpha.readOnly = !reference;
    custom.hidden = false;
    customError.hidden = true;
    (reference ? customAlpha : $('custom-add')).focus();
  }

  function addSearchResult(label, description, add) {
    const item = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    if (description) {
      const formula = document.createElement('small');
      formula.textContent = description;
      button.append(formula);
    }
    button.addEventListener('click', add);
    item.append(button);
    results.append(item);
  }

  function showMatches() {
    const query = search.value.trim();
    const term = searchKey(query);
    const selected = new Set(selectedComponents.map(({ name }) => searchKey(name)));
    const matches = hydrocarbons
      .filter((entry) => !selected.has(searchKey(entry.name))
        && componentTerms(entry).some((value) => searchKey(value).includes(term)))
      .sort((a, b) => {
        const exactMatch = (entry) => componentTerms(entry).some((value) => searchKey(value) === term);
        return Number(exactMatch(b)) - Number(exactMatch(a));
      });
    const known = term && hydrocarbons.some((entry) => componentTerms(entry).some((value) => searchKey(value) === term));
    results.replaceChildren();
    for (const entry of matches.slice(0, 8)) {
      addSearchResult(entry.name, entry.formula, () => addComponent(entry));
    }
    if (term && !known && !selected.has(term)) {
      addSearchResult(`Add custom “${query}”`, 'Enter α', () => openCustom(query));
    }
    if (matches.length > 8 || !results.childElementCount) {
      const note = document.createElement('li');
      note.className = 'search-note';
      note.textContent = matches.length > 8
        ? `Showing 8 of ${matches.length} matches. Type more to narrow the list.`
        : 'No unselected matches. Search by a different name or formula.';
      results.append(note);
    }
    custom.hidden = true;
    results.hidden = false;
  }

  search.addEventListener('focus', showMatches);
  search.addEventListener('input', showMatches);
  search.addEventListener('keydown', (event) => {
    if (!['ArrowDown', 'Enter'].includes(event.key)) return;
    event.preventDefault();
    if (results.hidden) showMatches();
    const first = results.querySelector('button');
    if (event.key === 'Enter') first?.click();
    else first?.focus();
  });
  picker.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || (results.hidden && custom.hidden)) return;
    event.preventDefault();
    search.focus();
    closeSearch();
  });
  picker.addEventListener('focusout', (event) => {
    // The custom-entry help is also a child of the picker.
    if (!picker.contains(event.relatedTarget)) closeSearch();
  });
  document.addEventListener('pointerdown', (event) => {
    if (!picker.contains(event.target)) closeSearch();
  });
  $('custom-add').addEventListener('click', () => {
    if (!customAlpha.value || !customAlpha.validity.valid) {
      customError.textContent = 'Enter a relative volatility between 0.000000001 and 1 billion.';
      customError.hidden = false;
      return;
    }
    addComponent({
      name: $('custom-name').textContent,
      logVolatility: (referenceComponent()?.logVolatility ?? 0) + Math.log(customAlpha.valueAsNumber),
    });
  });
  customAlpha.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      $('custom-add').click();
    }
  });
  $('custom-cancel').addEventListener('click', () => {
    search.focus();
    closeSearch();
  });

  $('clear-mixture').addEventListener('click', () => {
    clearMixture();
    search.focus();
  });
  $('sort-mixture').addEventListener('click', () => {
    changeComponents(null, 'Sorted by volatility.');
    ($('key-pair-field').hidden ? search : $('key-pair')).focus();
  });
  $('key-pair').addEventListener('change', (event) => {
    saveComponentInputs();
    keyIndex = Number(event.target.value);
    renderMixture();
  });
  $('mixture-rows').addEventListener('input', updateResults);
  $('column-form').addEventListener('reset', closeSearch);
}
