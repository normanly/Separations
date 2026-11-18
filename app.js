'use strict';

// Illustrative constant volatilities for the shortcut model.
const componentPairs = [
  { light: 'Benzene', heavy: 'Toluene', alpha: 2.50 },
  { light: 'Isobutane', heavy: 'n-Butane', alpha: 1.35 },
  { light: 'n-Pentane', heavy: 'n-Hexane', alpha: 2.65 },
  { light: 'n-Hexane', heavy: 'n-Heptane', alpha: 2.40 },
  { light: 'n-Heptane', heavy: 'n-Octane', alpha: 2.20 },
  { light: 'Toluene', heavy: 'Ethylbenzene', alpha: 2.00 },
];

const mixtures = [
  { label: 'Four-component course example', keys: [1, 2], components: [
    ['n-Pentane', 25, 2.50], ['n-Hexane', 25, 2.00], ['n-Heptane', 25, 1], ['n-Octane', 25, 0.70],
  ] },
  { label: 'Three-component alkane mixture', keys: [0, 1], components: [
    ['n-Hexane', 35, 2.10], ['n-Heptane', 40, 1], ['n-Octane', 25, 0.52],
  ] },
];

const parameters = [
  { key: 'alpha', label: 'Relative volatility', symbol: 'α', min: 1.15, max: 6, step: 0.01, initial: componentPairs[0].alpha },
  { key: 'feed', label: 'Light-key fraction in the feed', symbol: 'z<sub>F</sub>', min: 0.01, max: 0.99, step: 0.01, initial: 0.50 },
  { key: 'lightRecovery', label: 'Light-key recovery to distillate', symbol: 'r<sub>LK,D</sub>', min: 0.51, max: 0.99, step: 0.01, initial: 0.95 },
  { key: 'heavyRecovery', label: 'Heavy-key recovery to bottoms', symbol: 'r<sub>HK,B</sub>', min: 0.51, max: 0.99, step: 0.01, initial: 0.96 },
  { key: 'quality', label: 'Feed quality', symbol: 'q', min: 0, max: 1, step: 0.01, initial: 1.00, ends: ['All vapor', 'All liquid'] },
  { key: 'multiple', label: 'Operating reflux multiplier', symbol: 'R/R<sub>min</sub>', min: 1.05, max: 5, step: 0.01, initial: 1.50, ends: ['1.05 × minimum', '5.00 × minimum'] },
  { key: 'feedPosition', label: 'Feed tray position', symbol: 'f', min: 0, max: 1, step: 0.01, initial: 0.50, ends: ['Top tray', 'Bottom tray'] },
];

const designKeys = ['lightRecovery', 'heavyRecovery', 'multiple', 'feedPosition'];

const optionHelp = {
  equipmentMode: ['Column operating case', 'Working design uses the reflux you chose. Total reflux returns all condensate and withdraws no product. At minimum reflux, the calculation reaches the limiting pinch that would take infinitely many stages.'],
  mixture: ['Hydrocarbon mixture', 'Choose a two-, three-, or four-component feed. The preset labels the light and heavy keys, the two components used to set the separation target. The volatility values are illustrative and can be edited.'],
  feedPercent: ['Feed mole percent', 'The share of all feed moles belonging to each component. On a 100 mol feed basis, 25 mol% means 25 mol. The last row fills in the amount needed to bring the total to 100%.'],
  componentAlpha: ['Component relative volatility (α)', 'How readily each component vaporizes compared with the heavy key. The heavy key is the reference at 1.00. Keep the values in descending order, with the most volatile component first.'],
  alpha: ['Relative volatility (α)', 'How readily the light key enters the vapor compared with the heavy key. At α = 2, an ideal contact doubles the light-to-heavy ratio in the vapor relative to the liquid. Larger values mean an easier separation.'],
  feed: ['Light-key feed fraction', 'The fraction of feed moles that are light key. A value of 0.50 means 50 mol of light key per 100 mol of feed. The rest is heavy key in a two-component mixture.'],
  lightRecovery: ['Light-key recovery to distillate', 'The share of the incoming light key sent to the top product. At 0.95, 95% of the light key goes overhead and 5% goes to the bottoms. Product purity instead uses the total moles in the product as its basis.'],
  heavyRecovery: ['Heavy-key recovery to bottoms', 'The share of the incoming heavy key sent to the bottom product. At 0.96, 96% of the heavy key goes to the bottoms and 4% goes overhead. Product purity instead uses the total moles in the product as its basis.'],
  quality: ['Feed quality (q)', 'In this lab, q is the fraction of the incoming feed that is liquid. q = 0 means saturated vapor, q = 0.50 means half liquid by moles, and q = 1 means saturated liquid. Underwood uses q to account for vapor entering with the feed.'],
  multiple: ['Operating reflux multiplier (R/Rₘᵢₙ)', 'R is the liquid returned to the column divided by the distillate flow. A multiplier of 1.50 sets R to 1.5 times Underwood’s minimum. More reflux reduces the required stages and increases internal circulation.'],
  feedPosition: ['Feed tray position (f)', 'Where the feed enters. 0 is the top tray, 0.50 is near the middle, and 1 is the bottom tray. This splits the estimated trays above and below the feed.'],
  pinchMode: ['Pinch example reflux case', 'At minimum reflux, the tray steps crowd together where the equilibrium and operating lines meet. At 1.5 times minimum reflux, a gap opens and the steps reach the feed in a finite number of contacts. This plot uses a fixed two-component example.'],
  designAxes: ['Reflux and stages axes', 'Shows the actual reflux ratio R horizontally and the estimated number of stages N vertically. Use this view to read your operating point directly.'],
  normalizedAxes: ['Normalized axes', 'Shows the same operating point on 0-to-1 scales. X measures departure from minimum reflux and Y measures departure from minimum stages. This is the form used in the Gilliland correlation.'],
  refluxSweep: ['Operating reflux slider', 'This controls the same reflux multiplier as the design input above. Moving it shows the trade-off on the Gilliland curve and updates the stage estimate.'],
};

const colors = {
  teal: '#74e1c4',
  violet: '#c4b2fa',
  amber: '#f4c477',
  grid: '#2b424c',
  label: '#b0c4c8',
  background: '#0f1e25',
};

const $ = (id) => document.getElementById(id);
const fixed = (value) => value.toFixed(2);
const formatEstimate = (value) => {
  if (value >= 10000 || (value > 0 && value < 0.01)) return value.toExponential(2);
  return fixed(value);
};

function minimumStages(alpha, distillate, bottoms, [light, heavy]) {
  return (Math.log(distillate[light] / distillate[heavy])
    - Math.log(bottoms[light] / bottoms[heavy])) / Math.log(alpha[light] / alpha[heavy]);
}

function underwoodSum(alpha, composition, root) {
  return alpha.reduce((sum, volatility, i) => sum + volatility * composition[i] / (volatility - root), 0);
}

function underwood(alpha, feed, distillate, quality, [light, heavy]) {
  // The shortcut uses the root between adjacent keys, where the feed sum is strictly increasing.
  let low = alpha[heavy];
  let high = alpha[light];
  for (let iteration = 0; iteration < 50; iteration++) {
    const middle = (low + high) / 2;
    if (underwoodSum(alpha, feed, middle) < 1 - quality) low = middle;
    else high = middle;
  }
  const root = (low + high) / 2;
  return { root, minimum: underwoodSum(alpha, distillate, root) - 1 };
}

function gillilandExponent(x) {
  if (x <= 0) return -Infinity;
  if (x >= 1) return 0;
  return ((1 + 54.4 * x) / (11 + 117.2 * x)) * ((x - 1) / Math.sqrt(x));
}

function estimateStages(minimum, exponent) {
  // Use 1 − Y = exp(exponent) directly to avoid rounding Y to 1 near minimum reflux.
  return (minimum + 1) / Math.exp(exponent) - 1;
}

function createControl(parameter) {
  const { key, label, symbol, min, max, step, initial, ends = [fixed(min), fixed(max)] } = parameter;
  const control = document.createElement('div');
  control.className = 'control';
  control.innerHTML = `
    <div class="control-title">
      <div class="option-with-help" data-option-help="${key}">
        <label for="${key}-value">${label} <span class="symbol" aria-hidden="true">${symbol}</span></label>
      </div>
      <input class="value" type="number" inputmode="decimal" id="${key}-value"
        min="${min}" max="${max}" step="${step}" value="${fixed(initial)}" required>
    </div>
    <input type="range" id="${key}-range" aria-label="${label} slider"
      min="${min}" max="${max}" step="${step}" value="${initial}">
    <div class="control-endpoints" aria-hidden="true"><span>${ends[0]}</span><span>${ends[1]}</span></div>
  `;
  $(designKeys.includes(key) ? 'design-controls' : 'basis-controls').append(control);
  const number = $(`${key}-value`);
  const range = $(`${key}-range`);

  range.addEventListener('input', () => {
    number.value = fixed(range.valueAsNumber);
    updateResults();
  });
  number.addEventListener('input', () => {
    if (number.validity.valid) range.value = number.value;
    updateResults();
  });
  number.addEventListener('change', () => {
    if (number.validity.valid) number.value = fixed(number.valueAsNumber);
  });

  return { ...parameter, control, number, range };
}

const controls = parameters.map(createControl);

for (const option of document.querySelectorAll('[data-option-help]')) {
  const key = option.dataset.optionHelp;
  const [title, description] = optionHelp[key];
  const help = document.createElement('span');
  help.id = `option-help-${key}`;
  help.className = 'option-help';
  help.setAttribute('popover', 'auto');
  const heading = document.createElement('strong');
  heading.textContent = title;
  const body = document.createElement('span');
  body.textContent = description;
  help.append(heading, body);

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'help-trigger';
  button.textContent = '?';
  button.setAttribute('aria-label', `About ${title}`);
  button.setAttribute('popovertarget', help.id);
  option.append(button, help);
}

const pairSelect = $('component-pair');
const presets = [...mixtures, ...componentPairs];
presets.forEach((preset, index) => {
  pairSelect.add(new Option(preset.label || `${preset.light} / ${preset.heavy}`, String(index), index === 0, index === 0));
});

const componentColors = [colors.teal, colors.violet, '#83bdf6', '#e5ae8b'];
const productStreams = [
  { key: 'distillate', title: 'Distillate · overhead', keyIndex: 1 },
  { key: 'bottoms', title: 'Bottoms', keyIndex: 0 },
].map((product) => {
  const stream = document.createElement('section');
  stream.className = 'product-stream';
  stream.innerHTML = `<h3>${product.title}<span class="stream-rate"></span></h3>
    <div class="composition-bar" aria-hidden="true"></div><dl></dl>`;
  $('product-streams').append(stream);
  return { ...product, stream };
});

let currentResult;
let componentInputs = [];
let flowRoutes = [];

function setControlValue(key, value) {
  $(`${key}-range`).value = String(value);
  $(`${key}-value`).value = fixed(value);
}

function loadPreset() {
  const preset = presets[pairSelect.selectedIndex];
  const multicomponent = Boolean(preset.components);
  $('binary-caption').hidden = multicomponent;
  $('mixture-inputs').hidden = !multicomponent;
  for (const { key, control } of controls) {
    if (['alpha', 'feed'].includes(key)) control.hidden = multicomponent;
  }
  setControlValue('quality', multicomponent ? 0.5 : 1);
  setControlValue('lightRecovery', 0.95);
  setControlValue('heavyRecovery', multicomponent ? 0.96 : 0.95);
  $('mixture-rows').replaceChildren();
  componentInputs = [];
  if (!multicomponent) {
    $('alpha-range').value = String(preset.alpha);
    $('alpha-value').value = fixed(preset.alpha);
  } else {
    componentInputs = preset.components.map(([name, feed, alpha], index) => {
      const role = index === preset.keys[0] ? 'Light key' : index === preset.keys[1] ? 'Heavy key' : 'Nonkey';
      const balance = index === preset.components.length - 1;
      const row = document.createElement('tr');
      row.innerHTML = `<th scope="row">${name}<small>${role}</small></th>
        <td><input class="value feed-moles" aria-label="${name} feed mol percent" type="number"
          min="0.1" max="99.9" step="0.1" value="${feed}" ${balance ? 'readonly' : 'required'}>
          ${balance ? '<small>Balance</small>' : ''}</td>
        <td><input class="value volatility" aria-label="${name} relative volatility" type="number"
          min="0.05" max="20" step="0.01" value="${fixed(alpha)}" ${role === 'Heavy key' ? 'readonly' : ''} required></td>`;
      $('mixture-rows').append(row);
      return { name, feed: row.querySelector('.feed-moles'), alpha: row.querySelector('.volatility') };
    });
  }
  updateUnitCounts(preset.components?.length || 2);
}

function updateFeedBalance() {
  if (!componentInputs.length) return;
  const entered = componentInputs.slice(0, -1);
  const balance = componentInputs.at(-1).feed;
  const remainingTenths = 1000 - entered.reduce((sum, { feed }) => sum + Math.round(10 * feed.valueAsNumber), 0);
  balance.value = entered.every(({ feed }) => feed.validity.valid) ? (remainingTenths / 10).toFixed(1) : '';
  balance.setAttribute('aria-invalid', String(remainingTenths <= 0));
}

function resolveStreams(values) {
  const preset = presets[pairSelect.selectedIndex];
  const multicomponent = Boolean(preset.components);
  const names = multicomponent ? componentInputs.map(({ name }) => name) : [preset.light, preset.heavy];
  const keys = preset.keys || [0, 1];
  const feed = multicomponent
    ? componentInputs.map(({ feed: input }) => input.valueAsNumber / 100)
    : [values.feed, 1 - values.feed];
  const alpha = multicomponent
    ? componentInputs.map(({ alpha: input }) => input.valueAsNumber)
    : [values.alpha, 1];
  if (componentInputs.some(({ feed, alpha }) => (!feed.readOnly && !feed.validity.valid) || !alpha.validity.valid)) {
    return { error: 'Enter valid feed percentages and relative volatilities for each component.' };
  }
  if (feed.some((fraction) => !Number.isFinite(fraction) || fraction <= 0)) {
    return { error: 'Leave at least 0.1 mol% for the balance component.' };
  }
  if (alpha.some((value, index) => index > 0 && alpha[index - 1] <= value)) {
    return { error: 'Set relative volatilities in descending order from top to bottom.' };
  }
  const [light, heavy] = keys;
  const toDistillate = feed.map((fraction, index) => {
    if (index < light) return fraction;
    if (index === light) return fraction * values.lightRecovery;
    if (index === heavy) return fraction * (1 - values.heavyRecovery);
    return 0;
  });
  const distillateRate = toDistillate.reduce((sum, moles) => sum + moles, 0);
  return { names, keys, alpha, feed, distillateRate,
    distillate: toDistillate.map((moles) => moles / distillateRate),
    bottoms: feed.map((fraction, index) => (fraction - toDistillate[index]) / (1 - distillateRate)) };
}

function updateProductStreams(result) {
  const preset = presets[pairSelect.selectedIndex];
  const names = result?.names || preset.components?.map(([name]) => name) || [preset.light, preset.heavy];
  const keys = result?.keys || preset.keys || [0, 1];
  const light = keys[0];
  const rate = result?.distillateRate;
  if (result) {
    const inlet = result.feed[light];
    const overhead = rate * result.distillate[light];
    $('product-example').textContent = `${fixed(100 * inlet)} mol ${names[light]} × ${(100 * overhead / inlet).toFixed(0)}% recovery = ${fixed(100 * overhead)} mol overhead. Divide by ${fixed(100 * rate)} mol of distillate to get ${fixed(100 * result.distillate[light])} mol%.`;
  } else {
    $('product-example').textContent = 'Set the feed composition and both key recoveries to calculate the split.';
  }
  const formatPercent = new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 2 });
  for (const { key, keyIndex, stream } of productStreams) {
    const amount = key === 'distillate' ? rate : 1 - rate;
    stream.querySelector('.stream-rate').textContent = result ? `${fixed(100 * amount)} mol` : '—';
    const bar = stream.querySelector('.composition-bar');
    const list = stream.querySelector('dl');
    bar.replaceChildren();
    list.replaceChildren();
    for (const [index, name] of names.entries()) {
      const fraction = result?.[key][index];
      const colorIndex = index === keys[0] ? 0 : index === keys[1] ? 1 : index < keys[0] ? 2 : 3;
      const color = componentColors[colorIndex];
      const segment = document.createElement('i');
      segment.className = 'stream-segment';
      segment.style.setProperty('--segment-width', `${100 * (fraction ?? 0)}%`);
      segment.style.setProperty('--component-color', color);
      bar.append(segment);
      const line = document.createElement('div');
      line.classList.toggle('carryover', index === keys[keyIndex]);
      line.style.setProperty('--component-color', color);
      const role = index === keys[0] ? ' (light key)' : index === keys[1] ? ' (heavy key)' : '';
      line.innerHTML = `<dt><i class="component-dot" aria-hidden="true"></i><span>${name}${role}</span></dt>
        <dd>${fraction === undefined ? '—' : formatPercent.format(fraction)}</dd>`;
      list.append(line);
    }
  }
}

function readInputs() {
  const values = {};
  let error = '';
  let limitsReady = true;
  for (const control of controls) {
    const { key, label, number, range, min, max } = control;
    if (control.control.hidden) continue;
    const valid = number.validity.valid;
    number.setAttribute('aria-invalid', String(!valid));
    range.style.setProperty('--fill', `${100 * (range.valueAsNumber - min) / (max - min)}%`);
    if (valid) values[key] = number.valueAsNumber;
    else if (!['quality', 'multiple', 'feedPosition'].includes(key)) limitsReady = false;
    if (!valid && !error) {
      error = `Enter a value from ${fixed(min)} to ${fixed(max)} in 0.01 increments for ${label.toLowerCase()}.`;
    }
  }
  return { values, error, limitsReady };
}

function updateResults() {
  updateFeedBalance();
  const { values, error, limitsReady } = readInputs();
  updateDof();
  let message = error;
  currentResult = null;
  const streams = limitsReady ? resolveStreams(values) : null;
  if (streams?.error) message = streams.error;
  if (streams && !streams.error) {
    const { quality, multiple, feedPosition } = values;
    const { alpha, feed, distillate, bottoms, keys } = streams;
    const nMin = minimumStages(alpha, distillate, bottoms, keys);
    currentResult = { ...streams, quality, nMin };
    if (quality !== undefined) {
      const { root, minimum } = underwood(alpha, feed, distillate, quality, keys);
      currentResult.root = root;
      if (minimum > 1e-12) currentResult.rMin = minimum;
      else message ||= 'Underwood gives a zero or negative reflux estimate for this target. Try higher key recoveries or a different feed quality.';
    }
    if (currentResult.rMin && multiple !== undefined) {
      const reflux = multiple * currentResult.rMin;
      const x = (multiple - 1) * currentResult.rMin / (reflux + 1);
      const exponent = gillilandExponent(x);
      const stages = estimateStages(nMin, exponent);
      if (Number.isFinite(stages * 10)) {
        const wholeStages = stages <= Number.MAX_SAFE_INTEGER ? Math.max(2, Math.ceil(stages)) : null;
        const above = wholeStages === null || feedPosition === undefined ? null : Math.round(feedPosition * (wholeStages - 2));
        const trays = above === null ? null : { above, below: wholeStages - 2 - above, feedTray: above + 1 };
        currentResult.point = { reflux, x, y: -Math.expm1(exponent), stages, wholeStages, trays };
      } else {
        message ||= 'The operating point is too close to minimum reflux to plot. Increase the reflux multiplier or adjust the separation target.';
      }
    }
  }

  const result = currentResult;
  const point = result?.point;
  $('input-error').textContent = message;
  $('input-error').hidden = !message;
  $('min-stages').value = result ? formatEstimate(result.nMin) : '—';
  $('min-reflux').value = result?.rMin ? formatEstimate(result.rMin) : '—';
  $('root-value').textContent = result?.root !== undefined ? `θ = ${result.root.toFixed(3)}` : '';
  $('operating-stages').value = point ? formatEstimate(point.stages) : '—';
  $('operating-reflux').value = point ? formatEstimate(point.reflux) : '—';
  $('rounded-stages').value = point?.wholeStages?.toLocaleString('en-US') ?? '—';
  $('plot-message').hidden = Boolean(result?.rMin);
  if (!result?.rMin) $('plot-message').textContent = result?.root !== undefined
    ? 'This key-root result needs a positive minimum reflux to use the multiplier.'
    : 'Enter the feed data and both key recoveries to calculate the limits.';
  $('operating-legend').hidden = !point;
  updateProductStreams(result);
  drawCharts();
  document.dispatchEvent(new Event('lab:results'));
}

function prepareCanvas(canvas) {
  const { width, height } = canvas.getBoundingClientRect();
  const scale = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);
  return { ctx, width, height };
}

function drawLine(ctx, points, color, lineWidth = 1, dash = []) {
  if (points.length === 0) return;
  ctx.beginPath();
  ctx.moveTo(...points[0]);
  for (const point of points.slice(1)) ctx.lineTo(...point);
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.setLineDash(dash);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawDot(ctx, x, y, radius, color) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, 2 * Math.PI);
  ctx.fillStyle = colors.background;
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
}

function tickStep(maximum, count) {
  const target = maximum / count;
  const magnitude = 10 ** Math.floor(Math.log10(target));
  const factor = [1, 2, 2.5, 5, 10].find((candidate) => candidate * magnitude >= target);
  return factor * magnitude;
}

function tickLabel(value, step) {
  if (value >= 10000 || (value > 0 && step < 0.001)) return value.toExponential(0);
  const decimals = Math.max(0, -Math.floor(Math.log10(step)));
  const precision = step * 10 ** decimals % 1 > 0.01 ? decimals + 1 : decimals;
  return value.toFixed(precision).replace(/\.0+$/, '');
}

function drawMainChart(normalized) {
  const canvas = $('main-plot');
  const { ctx, width, height } = prepareCanvas(canvas);
  if (!currentResult?.rMin) {
    canvas.setAttribute('aria-label', 'Gilliland curve unavailable for the current inputs.');
    return;
  }

  const { rMin, nMin, point } = currentResult;
  const xDivisions = width < 420 ? 4 : 5;
  const xStep = normalized ? 1 / xDivisions : tickStep(Math.max(5.2 * rMin, rMin + 0.6), xDivisions);
  const xCount = xDivisions;
  const yCount = normalized ? 4 : 5;
  const nearMinimumX = 0.05 * rMin / (1.05 * rMin + 1);
  const nearMinimumStages = estimateStages(nMin, gillilandExponent(nearMinimumX));
  const chartHeight = Math.max(2.75 * nMin + 3, 1.12 * (point?.stages ?? 0), Math.min(nearMinimumStages, 4 * nMin + 20));
  const yStep = normalized ? 0.25 : tickStep(chartHeight, yCount);
  const xMax = xStep * xCount;
  const yMax = yStep * yCount;
  const left = width < 420 ? 47 : 57;
  const right = width - 20;
  const top = 12;
  const bottom = height - 46;
  const xAt = (value) => left + (right - left) * value / xMax;
  const yAt = (value) => bottom - (bottom - top) * value / yMax;
  const underwoodX = normalized ? 0 : rMin;
  const fenskeY = normalized ? 0 : nMin;
  const xLabel = normalized ? 'Normalized reflux, X' : 'Reflux ratio, R';
  const yLabel = normalized ? 'Normalized stages, Y' : 'Theoretical stages, N';

  ctx.fillStyle = colors.background;
  ctx.fillRect(left, top, right - left, bottom - top);
  if (!normalized) {
    ctx.fillStyle = '#c1a7fa0e';
    ctx.fillRect(left, top, xAt(underwoodX) - left, bottom - top);
  }

  ctx.font = '11px monospace';
  ctx.fillStyle = colors.label;
  ctx.textAlign = 'center';
  for (let i = 0; i <= xCount; i++) {
    const value = i * xStep;
    const px = xAt(value);
    drawLine(ctx, [[px, top], [px, bottom]], colors.grid);
    ctx.fillText(tickLabel(value, xStep), px, bottom + 18);
  }
  ctx.textAlign = 'right';
  for (let i = 0; i <= yCount; i++) {
    const value = i * yStep;
    const py = yAt(value);
    drawLine(ctx, [[left, py], [right, py]], colors.grid);
    ctx.fillText(tickLabel(value, yStep), left - 8, py + 4);
  }

  ctx.textAlign = 'center';
  ctx.fillText(xLabel, (left + right) / 2, height - 5);
  ctx.save();
  ctx.translate(12, (top + bottom) / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(yLabel, 0, 0);
  ctx.restore();

  drawLine(ctx, [[left, yAt(fenskeY)], [right, yAt(fenskeY)]], colors.teal, 1.2, [5, 5]);
  drawLine(ctx, [[xAt(underwoodX), top], [xAt(underwoodX), bottom]], colors.violet, 1.2, [5, 5]);

  const points = [];
  for (let i = 0; i <= 360; i++) {
    // Concentrate samples near minimum reflux, where the curve is steep.
    const fraction = (i / 360) ** 2;
    const chartX = underwoodX + (xMax - underwoodX) * fraction;
    const curveX = normalized ? chartX : (chartX - rMin) / (chartX + 1);
    const exponent = gillilandExponent(curveX);
    const chartY = normalized ? -Math.expm1(exponent) : estimateStages(nMin, exponent);
    points.push([xAt(chartX), yAt(Math.min(chartY, yMax * 1.3))]);
  }

  ctx.save();
  ctx.beginPath();
  ctx.rect(left, top, right - left, bottom - top);
  ctx.clip();
  const [firstX, firstY] = points[0];
  ctx.beginPath();
  ctx.moveTo(firstX, firstY);
  for (const point of points.slice(1)) ctx.lineTo(...point);
  ctx.lineTo(right, yAt(fenskeY));
  ctx.lineTo(firstX, yAt(fenskeY));
  ctx.closePath();
  const fill = ctx.createLinearGradient(0, top, 0, bottom);
  fill.addColorStop(0, '#f4c47726');
  fill.addColorStop(1, '#f4c47703');
  ctx.fillStyle = fill;
  ctx.fill();
  drawLine(ctx, points, colors.amber, 2.25);
  ctx.restore();

  let description = `Gilliland curve, ${yLabel} versus ${xLabel}.`;
  if (point) {
    const { reflux, stages, x, y } = point;
    const px = xAt(normalized ? x : reflux);
    const py = yAt(normalized ? y : stages);
    drawLine(ctx, [[px, bottom], [px, py], [left, py]], '#f4c47788', 1, [3, 4]);
    drawDot(ctx, px, py, 5, colors.amber);
    description += normalized
      ? ` Operating point: X = ${fixed(x)}, Y = ${fixed(y)}.`
      : ` Operating point: R = ${formatEstimate(reflux)}, N = ${formatEstimate(stages)}.`;
  }
  canvas.setAttribute('aria-label', description);
}

function drawUnderwoodRoot(result) {
  const canvas = $('root-plot');
  if (!canvas.clientWidth) return;
  const { ctx, width, height } = prepareCanvas(canvas);
  if (result?.root === undefined) {
    canvas.setAttribute('aria-label', 'Underwood root plot unavailable for the current inputs.');
    return;
  }
  const { alpha, keys, root, feed, quality } = result;
  const low = alpha[keys[1]];
  const high = alpha[keys[0]];
  const left = 22;
  const right = width - 22;
  const middle = height / 2;
  const xAt = (theta) => left + (right - left) * (theta - low) / (high - low);
  const yAt = (residual) => middle - 13 * residual;
  drawLine(ctx, [[left, middle], [right, middle]], colors.label, 1, [4, 3]);
  drawLine(ctx, [[left, 9], [left, height - 14]], colors.grid);
  drawLine(ctx, [[right, 9], [right, height - 14]], colors.grid);
  const trace = Array.from({ length: 101 }, (_, index) => {
    const theta = low + (high - low) * (0.001 + 0.998 * index / 100);
    return [xAt(theta), yAt(underwoodSum(alpha, feed, theta) - (1 - quality))];
  });
  ctx.save();
  ctx.beginPath();
  ctx.rect(left, 9, right - left, height - 23);
  ctx.clip();
  drawLine(ctx, trace, colors.violet, 1.6);
  ctx.restore();
  drawDot(ctx, xAt(root), middle, 4, colors.amber);
  ctx.fillStyle = colors.label;
  ctx.font = '10px monospace';
  ctx.fillText('αHK', left, height - 3);
  ctx.textAlign = 'right';
  ctx.fillText('αLK', right, height - 3);
  ctx.textAlign = 'center';
  ctx.fillText(`θ = ${root.toFixed(3)}`, Math.max(left + 25, Math.min(right - 25, xAt(root))), middle + 16);
  canvas.setAttribute('aria-label', `Underwood feed equation residual versus theta. The zero crossing is at theta ${root.toFixed(3)}, between heavy-key alpha ${fixed(low)} and light-key alpha ${fixed(high)}.`);
}

function drawEquipment() {
  const canvas = $('equipment-plot');
  const { ctx, width } = prepareCanvas(canvas);
  const result = currentResult;
  const mode = $('equipment-mode').value;
  const total = mode === 'total';
  const minimum = mode === 'minimum';
  flowRoutes = [];
  const reflux = minimum ? result?.rMin : result?.point?.reflux;
  const stages = total ? result?.nMin : minimum && result?.rMin ? Infinity : result?.point?.stages;
  const rate = result?.distillateRate * 100;
  const trays = mode === 'design' ? result?.point?.trays : null;
  const feedMark = trays ? Math.round(6 * trays.above / Math.max(1, trays.above + trays.below)) : 3;
  const feedY = 97 + 17 * feedMark;
  const allocation = $('tray-allocation');
  allocation.hidden = !trays;
  if (trays) {
    const fmt = (count) => count.toLocaleString('en-US');
    allocation.textContent = `Feed tray ${fmt(trays.feedTray)} from the top · ${fmt(trays.above)} trays above · ${fmt(trays.below)} below · 1 equilibrium reboiler`;
  }
  const feed = total ? '0' : reflux ? '100' : '—';
  const distillate = total ? '0' : reflux ? rate.toFixed(2) : '—';
  const bottoms = total ? '0' : reflux ? (100 - rate).toFixed(2) : '—';
  const returned = total ? 'All' : reflux ? (reflux * rate).toFixed(2) : '—';
  const tight = width < 440;
  const column = width * (tight ? 0.31 : 0.33);
  const condenser = width * 0.58;
  const drum = width * 0.80;
  const boiler = width * 0.65;
  const entry = 18;
  const exit = width - 15;
  const towerHalf = tight ? 22 : 32;
  const wall = '#658093';
  const fluid = '#1b3440';
  const liquid = colors.teal;
  const vapor = colors.amber;
  const product = colors.violet;
  const muted = colors.label;
  const quiet = '#536274';
  const text = (label, x, y, color = muted, align = 'left') => {
    ctx.font = `${tight ? 10 : 12}px monospace`;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.fillText(label, x, y);
  };
  const pipe = (points, color, arrow = false) => {
    drawLine(ctx, points, color, 1.8);
    if (color !== quiet && (total || reflux)) flowRoutes.push({ points, color });
    if (!arrow) return;
    const [[beforeX, beforeY], [x, y]] = points.slice(-2);
    const angle = Math.atan2(y - beforeY, x - beforeX);
    drawLine(ctx, [[x - 6 * Math.cos(angle - 0.55), y - 6 * Math.sin(angle - 0.55)],
      [x, y], [x - 6 * Math.cos(angle + 0.55), y - 6 * Math.sin(angle + 0.55)]], color, 1.6);
  };
  const vessel = (x, y, w, h, radius) => {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
    ctx.fillStyle = fluid;
    ctx.fill();
    ctx.strokeStyle = wall;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  };

  const outletColor = reflux && !total ? product : quiet;
  pipe([[entry, feedY], [column - towerHalf, feedY]], outletColor === quiet ? quiet : liquid, true);
  pipe([[column, 75], [column, 49], [condenser - 14, 49]], vapor, true);
  pipe([[condenser + 14, 49], [drum, 49], [drum, 76]], liquid, true);
  const refluxElbow = column + towerHalf + 13;
  pipe([[drum, 104], [drum, 131], [refluxElbow, 131], [refluxElbow, 92], [column + towerHalf + 1, 92]], liquid, true);
  pipe([[drum + 25, 91], [exit, 91]], outletColor, true);
  pipe([[column, 226], [column, 248], [boiler - 14, 248]], liquid, true);
  pipe([[boiler, 225], [boiler, 213], [column + towerHalf, 213]], vapor, true);
  pipe([[boiler, 251], [boiler, 268], [exit, 268]], outletColor, true);

  vessel(column - towerHalf, 76, 2 * towerHalf, 150, towerHalf);
  for (let tray = 0; tray < 7; tray++) {
    const y = 97 + 17 * tray;
    drawLine(ctx, [[column - towerHalf + 7 + (tray % 2) * 7, y],
      [column + towerHalf - 7 - ((tray + 1) % 2) * 7, y]], trays && tray === feedMark ? product : wall, trays && tray === feedMark ? 2 : 1);
  }
  if (total || reflux) {
    pipe([[column - 8, 207], [column - 8, 91]], vapor, true);
    pipe([[column + 8, 91], [column + 8, 207]], liquid, true);
  }
  vessel(condenser - 14, 35, 28, 28, 14);
  vessel(drum - 25, 77, 50, 27, 13);
  vessel(boiler - 14, 224, 28, 28, 14);
  drawLine(ctx, [[condenser - 8, 53], [condenser - 2, 45], [condenser + 3, 52], [condenser + 8, 44]], liquid, 1.2);
  drawLine(ctx, [[drum - 18, 94], [drum + 18, 94]], liquid, 1.2);
  drawLine(ctx, [[boiler - 8, 242], [boiler - 2, 234], [boiler + 3, 241], [boiler + 8, 233]], vapor, 1.2);

  text('Condenser', condenser, 24, muted, 'center');
  text('Reflux drum', drum, 69, muted, 'center');
  text(`Distillate ${distillate}`, exit, 114, outletColor, 'right');
  text(`Feed ${feed}`, entry, feedY - 9, muted);
  text(`Reflux ${returned}`, (column + towerHalf + drum) / 2, 122, liquid, 'center');
  if (feedMark >= 2) text('Above feed', column + towerHalf + 18, Math.min(154, feedY - 8));
  if (feedMark < 6) text('Below feed', column + towerHalf + 9, Math.max(171, feedY + 16));
  text('Reboiler', boiler + 19, 242);
  text(`Bottoms ${bottoms}`, exit, 287, outletColor, 'right');
  text('Tray column', column, 286, muted, 'center');
  if (stages !== undefined) text(`N ${Number.isFinite(stages) ? formatEstimate(stages) : '→ ∞'}`, column - 7, 65, vapor, 'right');

  const caption = total
    ? 'The drum returns all condensate to the column. Feed, distillate, and bottoms are zero at steady total reflux.'
    : minimum
      ? (result?.rMin ? 'A pinch stalls the separation at this reflux. The stream amounts show the limiting product split.' : 'Set valid column inputs with a positive minimum reflux to show the pinch case.')
      : reflux
        ? 'The reboiler sends vapor up the column. The condenser turns it into liquid, and the drum splits that liquid into reflux and distillate.'
        : 'Enter valid recovery and reflux specifications to calculate the operating stream flows.';
  $('equipment-caption').textContent = caption;
  canvas.setAttribute('aria-label', `Tray column with rectifying and stripping sections, condenser, reflux drum and reboiler. Feed ${feed}, distillate ${distillate}, bottoms ${bottoms}, reflux ${returned}. ${caption}`);
}

function updateDof() {
  const remaining = controls.filter(({ key, number }) =>
    designKeys.includes(key) && !number.validity.valid).length;
  $('dof-remaining').value = String(remaining);
}

function updateUnitCounts(components) {
  $('dof-components').textContent = components;
  $('dof-after-trays').textContent = components + 13;
  $('dof-feed-used').textContent = components + 2;
  const units = [
    ['Equilibrium tray', '2C + 6', 2 * components + 6],
    ['Feed tray', '3C + 8', 3 * components + 8],
    ['Condenser and reboiler, each', 'C + 4', components + 4],
    ['Reflux splitter', 'C + 5', components + 5],
  ];
  $('unit-counts').innerHTML = units.map(([name, formula, count]) =>
    `<div><dt>${name}</dt><dd>${formula} = ${count}</dd></div>`).join('');
}

function drawCharts() {
  const normalized = document.querySelector('input[name="axes"]:checked').value === 'normalized';
  $('stage-legend').textContent = normalized ? 'Fenske limit (Y = 0)' : 'Fenske limit';
  $('reflux-legend').textContent = normalized ? 'Underwood limit (X = 0)' : 'Underwood limit';
  const result = currentResult;
  const point = normalized ? result?.point : undefined;
  $('normalized-point').hidden = !point;
  $('normalized-point').textContent = point ? `(${fixed(point.x)}, ${fixed(point.y)})` : '';
  drawUnderwoodRoot(result);
  drawMainChart(normalized);
  drawEquipment();
}

$('column-form').addEventListener('submit', (event) => event.preventDefault());
pairSelect.addEventListener('change', () => {
  loadPreset();
  updateResults();
});
$('mixture-rows').addEventListener('input', updateResults);
$('column-form').addEventListener('reset', (event) => {
  event.preventDefault();
  pairSelect.selectedIndex = 0;
  for (const { number, range } of controls) {
    number.value = number.defaultValue;
    range.value = range.defaultValue;
  }
  loadPreset();
  updateResults();
});
document.querySelector('.chart-switch').addEventListener('change', drawCharts);
$('open-notes').addEventListener('click', () => $('model-notes').showModal());
new ResizeObserver(drawCharts).observe($('main-plot'));
$('equipment-mode').addEventListener('change', drawEquipment);
new ResizeObserver(drawEquipment).observe($('equipment-plot'));
new ResizeObserver(() => drawUnderwoodRoot(currentResult)).observe($('root-plot'));
loadPreset();
updateResults();
