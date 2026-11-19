'use strict';

function playback(button, { interval, start, advance, finish, playLabel, pauseLabel }) {
  let timer;
  function stop() {
    if (timer === undefined) return;
    clearInterval(timer);
    timer = undefined;
    button.textContent = playLabel;
    finish?.();
  }

  button.addEventListener('click', () => {
    if (timer !== undefined) {
      stop();
      return;
    }
    start();
    button.textContent = pauseLabel;
    timer = setInterval(() => {
      if (!advance()) stop();
    }, interval);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
  });
  return stop;
}

const flowCanvas = $('equipment-motion');
const flowPlay = $('flow-play');
let flowSurface;
let flowPlaying = false;
let flowVisible = false;
let flowFrame;

function clearFlow() {
  if (flowSurface) {
    const { ctx, width, height } = flowSurface;
    ctx.clearRect(0, 0, width, height);
  }
}

function animateFlows(time) {
  const { ctx } = flowSurface;
  clearFlow();
  for (const { points, color } of flowRoutes) {
    const segments = points.slice(1).map(([endX, endY], index) => {
      const [x, y] = points[index];
      return { x, y, dx: endX - x, dy: endY - y, length: Math.hypot(endX - x, endY - y) };
    });
    const length = segments.reduce((sum, segment) => sum + segment.length, 0);
    if (length <= 0) continue;
    // Particle movement teaches flow direction. Read the pipe labels for material amounts.
    const count = Math.max(1, Math.round(length / 46));
    for (let index = 0; index < count; index++) {
      let distance = (time * 0.052 + index * length / count) % length;
      for (const segment of segments) {
        if (distance < segment.length) {
          const fraction = distance / segment.length;
          ctx.beginPath();
          ctx.arc(segment.x + fraction * segment.dx, segment.y + fraction * segment.dy, 3, 0, 2 * Math.PI);
          ctx.fillStyle = color;
          ctx.fill();
          break;
        }
        distance -= segment.length;
      }
    }
  }
  flowFrame = requestAnimationFrame(animateFlows);
}

function syncFlowPlayback() {
  cancelAnimationFrame(flowFrame);
  clearFlow();
  if (flowPlaying && flowVisible && flowSurface && !document.hidden) {
    flowFrame = requestAnimationFrame(animateFlows);
  }
}

flowPlay.addEventListener('click', () => {
  flowPlaying = !flowPlaying;
  flowPlay.textContent = flowPlaying ? 'Pause flow animation' : 'Play flow animation';
  syncFlowPlayback();
});
new ResizeObserver(() => {
  flowSurface = prepareCanvas(flowCanvas);
  syncFlowPlayback();
}).observe(flowCanvas);
new IntersectionObserver(([entry]) => {
  flowVisible = entry.isIntersecting;
  syncFlowPlayback();
}).observe(flowCanvas);
document.addEventListener('visibilitychange', syncFlowPlayback);

document.querySelectorAll('[data-equipment-case]').forEach((link) => {
  link.addEventListener('click', () => {
    $('equipment-mode').value = link.dataset.equipmentCase;
    drawEquipment();
    syncFlowPlayback();
  });
});

const stagePlay = $('stage-play');
const stageNext = $('stage-next');
let enrichment;
let shownStages = 0;

function showStage(announce = false) {
  const stageLabel = shownStages === 0
    ? 'Stage 0 · bottom liquid'
    : `After ${Number(shownStages.toFixed(2))} ${shownStages === 1 ? 'stage' : 'stages'}`;
  const odds = enrichment ? enrichment.start * enrichment.factor ** shownStages : 0;
  const share = 100 * odds / (1 + odds);
  $('stage-label').textContent = stageLabel;
  $('stage-current-value').textContent = enrichment ? `${share.toFixed(1)}% light` : '—';
  $('stage-current-bar').style.width = `${share}%`;
  if (announce) $('stage-status').textContent = `${stageLabel}, ${share.toFixed(1)} percent light key among the two keys.`;
  stageNext.textContent = enrichment && shownStages >= enrichment.stages ? 'Restart stages' : 'Next stage';
}

const stopStages = playback(stagePlay, {
  interval: 430,
  playLabel: 'Play enrichment',
  pauseLabel: 'Pause enrichment',
  start() {
    if (shownStages >= enrichment.stages) shownStages = 0;
    showStage();
  },
  advance() {
    const stride = Math.max(1, Math.ceil(enrichment.stages / 18));
    shownStages = Math.min(enrichment.stages, shownStages + stride);
    showStage();
    return shownStages < enrichment.stages;
  },
});

stageNext.addEventListener('click', () => {
  stopStages();
  shownStages = shownStages >= enrichment.stages ? 0 : Math.min(enrichment.stages, shownStages + 1);
  showStage(true);
});

function updateFenskeLesson(result) {
  const [light, heavy] = result?.keys ?? [];
  const factor = result ? result.alpha[light] / result.alpha[heavy] : undefined;
  const start = result ? result.bottoms[light] / result.bottoms[heavy] : undefined;
  const target = result ? result.distillate[light] / result.distillate[heavy] : undefined;
  // Reflux changes do not disturb the stage illustration for a fixed separation.
  if (enrichment && enrichment.factor === factor && enrichment.start === start && enrichment.target === target) return;
  stopStages();
  shownStages = 0;
  enrichment = result ? { factor, start, target, stages: result.nMin } : undefined;
  stagePlay.disabled = !result;
  stageNext.disabled = !result;
  $('stage-factor').textContent = result ? formatEstimate(factor) : '—';
  $('fenske-work').textContent = result
    ? `ln(${formatEstimate(target)} ÷ ${formatEstimate(start)}) ÷ ln(${formatEstimate(factor)}) = ${formatEstimate(result.nMin)} stages`
    : 'Enter the feed and both key recoveries to work this example.';
  for (const [position, ratio] of [['start', start], ['target', target]]) {
    const share = ratio ? 100 * ratio / (1 + ratio) : 0;
    $(`stage-${position}-bar`).style.width = `${share}%`;
    $(`stage-${position}-value`).textContent = ratio ? `${share.toFixed(1)}% light` : '—';
  }
  showStage();
}

const pinchAlpha = 2.5;
const pinchFeed = 0.5;
const pinchDistillate = 0.95;
const pinchEquilibrium = (x) => pinchAlpha * x / (1 + (pinchAlpha - 1) * x);
const pinchVapor = pinchEquilibrium(pinchFeed);
const pinchReflux = (pinchDistillate - pinchVapor) / (pinchVapor - pinchFeed);
let pinchExample;
let pinchSegments;

function buildPinchExample() {
  const atMinimum = $('pinch-mode').value === 'minimum';
  const reflux = atMinimum ? pinchReflux : 1.5 * pinchReflux;
  const operating = (x) => (reflux * x + pinchDistillate) / (reflux + 1);
  const steps = [[pinchDistillate, pinchDistillate]];
  let vapor = pinchDistillate;
  for (let stage = 0; stage < 13; stage++) {
    const liquid = vapor / (pinchAlpha - (pinchAlpha - 1) * vapor);
    steps.push([liquid, vapor]);
    if (liquid <= pinchFeed) break;
    vapor = operating(liquid);
    steps.push([liquid, vapor]);
  }
  pinchExample = { atMinimum, reflux, operating, steps };
  pinchSegments = steps.length - 1;
  $('pinch-caption').textContent = atMinimum
    ? `At R = ${fixed(reflux)}, the lines meet at the feed composition. The steps shrink toward that pinch.`
    : `At R = ${fixed(reflux)}, the lines separate at the feed. The steps can reach the feed region in a finite number of contacts.`;
}

function drawPinchLesson() {
  const canvas = $('pinch-plot');
  const { ctx, width, height } = prepareCanvas(canvas);
  const { atMinimum, operating, steps } = pinchExample;
  const left = 38;
  const right = width - 13;
  const top = 23;
  const bottom = height - 32;
  const xAt = (x) => left + (right - left) * (x - 0.4) / 0.6;
  const yAt = (y) => bottom - (bottom - top) * (y - 0.6) / 0.4;
  const plot = ([x, y]) => [xAt(x), yAt(y)];

  ctx.fillStyle = colors.label;
  ctx.font = '10px monospace';
  ctx.textAlign = 'center';
  for (let tick = 4; tick <= 10; tick++) {
    const value = tick / 10;
    const x = xAt(value);
    drawLine(ctx, [[x, top], [x, bottom]], colors.grid);
    ctx.fillText(value.toFixed(1), x, bottom + 13);
  }
  ctx.textAlign = 'right';
  for (let tick = 6; tick <= 10; tick++) {
    const value = tick / 10;
    const y = yAt(value);
    drawLine(ctx, [[left, y], [right, y]], colors.grid);
    ctx.fillText(value.toFixed(1), left - 5, y + 3);
  }
  ctx.textAlign = 'center';
  ctx.fillText('Liquid light-key fraction, x', (left + right) / 2, height - 5);
  ctx.textAlign = 'left';
  ctx.fillText('Vapor light-key fraction, y', left, 13);

  ctx.save();
  ctx.beginPath();
  ctx.rect(left, top, right - left, bottom - top);
  ctx.clip();
  drawLine(ctx, [[xAt(pinchFeed), top], [xAt(pinchFeed), bottom]], '#5d7782', 1, [2, 4]);
  const equilibrium = Array.from({ length: 61 }, (_, index) => {
    const x = 0.4 + 0.6 * index / 60;
    return plot([x, pinchEquilibrium(x)]);
  });
  drawLine(ctx, equilibrium, colors.violet, 2);
  drawLine(ctx, [plot([0.4, operating(0.4)]), plot([pinchDistillate, pinchDistillate])], colors.label, 1.5, [5, 3]);
  drawLine(ctx, steps.slice(0, pinchSegments + 1).map(plot), colors.amber, 1.6);
  drawDot(ctx, ...plot(steps[pinchSegments]), 3, colors.amber);
  if (atMinimum) drawDot(ctx, ...plot([pinchFeed, pinchVapor]), 4, colors.violet);
  ctx.restore();

  ctx.fillStyle = colors.label;
  ctx.fillText(atMinimum ? 'Pinch' : 'Feed', xAt(pinchFeed) + 6, yAt(pinchVapor) + 16);
  canvas.setAttribute('aria-label', atMinimum
    ? 'At minimum reflux, equilibrium and operating lines meet at a liquid fraction of 0.50. The tray steps shrink toward the pinch.'
    : 'At 1.5 times minimum reflux, the two lines are separated at the feed and the tray steps cross the feed composition.');
}

const stopPinch = playback($('pinch-play'), {
  interval: 140,
  playLabel: 'Play tray steps',
  pauseLabel: 'Pause tray steps',
  start() {
    if (pinchSegments >= pinchExample.steps.length - 1) pinchSegments = 0;
    drawPinchLesson();
  },
  advance() {
    pinchSegments++;
    drawPinchLesson();
    return pinchSegments < pinchExample.steps.length - 1;
  },
});
$('pinch-mode').addEventListener('change', () => {
  stopPinch();
  buildPinchExample();
  drawPinchLesson();
});
buildPinchExample();
new ResizeObserver(drawPinchLesson).observe($('pinch-plot'));

const sweep = $('sweep-range');
let sweepFrame = 0;
const stopSweep = playback($('sweep-play'), {
  interval: 95,
  playLabel: 'Play reflux sweep',
  pauseLabel: 'Pause reflux sweep',
  start() {
    sweepFrame = 0;
    $('operating-readout').setAttribute('aria-live', 'off');
    setControlValue('multiple', Number(sweep.min));
    updateResults();
  },
  advance() {
    sweepFrame++;
    const fraction = (sweepFrame / 41) ** 1.55;
    const multiple = Number(sweep.min) + fraction * (Number(sweep.max) - Number(sweep.min));
    setControlValue('multiple', Number(multiple.toFixed(2)));
    updateResults();
    return sweepFrame < 41;
  },
  finish() {
    $('operating-readout').setAttribute('aria-live', 'polite');
  },
});
$('column-form').addEventListener('input', stopSweep, true);
$('column-form').addEventListener('reset', stopSweep);
sweep.addEventListener('input', () => {
  stopSweep();
  setControlValue('multiple', sweep.valueAsNumber);
  updateResults();
});

function updateLessonReadouts() {
  const result = currentResult;
  updateFenskeLesson(result);
  const root = result?.root;
  const input = $('multiple-value');
  const ready = Boolean(result?.rMin);
  const hasMultiple = input.validity.valid;
  if (hasMultiple) sweep.value = input.value;
  sweep.disabled = !ready;
  $('sweep-play').disabled = !ready;
  $('sweep-multiple').textContent = ready && hasMultiple ? `${fixed(input.valueAsNumber)} × minimum` : '—';
  sweep.style.setProperty('--fill', `${100 * (sweep.valueAsNumber - Number(sweep.min)) / (Number(sweep.max) - Number(sweep.min))}%`);
  if (root !== undefined) {
    const sum = underwoodSum(result.alpha, result.distillate, root);
    $('underwood-work').textContent = `q = ${fixed(result.quality)} → 1 − q = ${fixed(1 - result.quality)} → θ = ${root.toFixed(3)}. The second sum gives Rmin = ${fixed(sum)} − 1 = ${fixed(sum - 1)}.`;
    $('root-caption').textContent = 'The curve plots the difference between the two sides of the feed equation. The highlighted zero is the root between the key volatilities.';
  } else {
    $('underwood-work').textContent = 'Enter the feed, feed quality, and both key recoveries to work this example.';
    $('root-caption').textContent = 'The root plot appears when those inputs are available.';
  }
  const point = result?.point;
  $('gilliland-work').textContent = point
    ? `At R = ${formatEstimate(point.reflux)}, X = ${point.x.toFixed(3)}. The fit gives Y = ${point.y.toFixed(3)}. Rearranging gives N = (Nmin + Y) / (1 − Y) = ${formatEstimate(point.stages)} stages.`
    : 'Set a working reflux multiplier to calculate X, Y, and the estimated stage count.';
}

document.addEventListener('lab:results', updateLessonReadouts);
updateLessonReadouts();
