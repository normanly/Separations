'use strict';

const predictionForm = $('prediction-form');
const predictionCheck = $('check-prediction');
const startLesson = $('start-guided-lesson');
const experimentLink = $('open-experiment');
const resetExperiment = $('reset-experiment');
const predictionTask = $('prediction-task');
const comparisonPoint = $('compare-working-point');
const comparisonPending = $('compare-working-pending');
const equipmentMode = $('equipment-mode');
const sectionToggle = $('section-menu-toggle');
const sectionMenu = sectionToggle.closest('nav');
let prediction;
let lessonPhase = 'idle';

function isGuidedLesson() {
  return lessonPhase === 'setup' || lessonPhase === 'limits';
}

function showLessonSection(id) {
  const section = $(id);
  if (id === 'prediction') setPredictionOpen(true);
  location.hash = id;
  const heading = section.querySelector('h2');
  heading.tabIndex = -1;
  heading.focus({ preventScroll: true });
  section.scrollIntoView({ block: 'start' });
}

function setPredictionOpen(open) {
  if (predictionTask.hidden === !open) return;
  $('lesson-preview').hidden = open;
  $('prediction-title').textContent = open ? 'Make a prediction' : 'Your first lesson';
  predictionTask.hidden = !open;
  updateIntroLesson();
}

function showEquipmentCase(mode) {
  if (equipmentMode.value === mode) return;
  equipmentMode.value = mode;
  equipmentMode.dispatchEvent(new Event('change'));
}

function updateEquipmentLink() {
  const link = $('equipment-next');
  const mode = equipmentMode.value;
  const atMinimum = mode === 'minimum';
  link.href = atMinimum ? '#underwood' : '#fenske';
  link.textContent = atMinimum ? 'Return to the pinch demonstration ↓'
    : mode === 'total' ? 'Return to the Fenske lesson ↓' : 'Next · Inspect total reflux ↓';
}

function updateIntroLesson() {
  const inspecting = isGuidedLesson();
  const result = currentResult;
  const point = result?.point;
  const active = feedAndKeyInputs().componentInputs.length > 0
    || controls.some(({ number }) => number.valueAsNumber !== Number(number.defaultValue));
  const resumeFirst = active && predictionTask.hidden;
  const firstAction = resumeFirst ? experimentLink : startLesson;

  startLesson.hidden = !predictionTask.hidden;
  startLesson.classList.toggle('primary-button', !resumeFirst);
  startLesson.classList.toggle('text-link', resumeFirst);
  experimentLink.classList.toggle('primary-button', resumeFirst);
  experimentLink.classList.toggle('text-link', !resumeFirst);
  if (firstAction.parentElement.firstElementChild !== firstAction) firstAction.parentElement.prepend(firstAction);
  $('open-experiment-label').textContent = inspecting ? 'Return to the lesson setup' : active ? 'Resume my experiment' : 'Build a custom case';
  if (!active && document.activeElement === resetExperiment) $('component-search').focus({ preventScroll: true });
  resetExperiment.hidden = !active;
  $('prediction-replace').hidden = !active || inspecting;
  $('preset-replace').hidden = !active;
  $('guided-case').hidden = !inspecting;
  $('column-form').hidden = inspecting;
  $('setup-actions').hidden = inspecting;
  $('setup-results-link').hidden = inspecting || !point;
  predictionCheck.hidden = lessonPhase !== 'limits';
  $('prediction-needs-fenske').hidden = lessonPhase !== 'setup';
  $('skip-prediction-check').hidden = inspecting;
  $('comparison-actions').hidden = inspecting;
  $('comparison-return').hidden = !inspecting;
  $('gilliland-pending').hidden = !inspecting;
  $('gilliland-axes').hidden = inspecting;
  $('gilliland-workspace').hidden = inspecting;
  equipmentMode.querySelector('option[value="design"]').disabled = inspecting;

  const matchesPinch = result?.names.length === 2 && result.names[0] === 'Benzene' && result.names[1] === 'Toluene'
    && result.feed[0] === pinchFeed && result.quality === 1 && result.alpha[0] === pinchAlpha
    && Math.abs(result.distillate?.[0] - pinchDistillate) < 1e-12;
  $('pinch-case-label').textContent = matchesPinch
    ? 'This plot uses the active benzene–toluene case. Each horizontal move reaches equilibrium. Each vertical move applies the column balance.'
    : 'Separate benzene–toluene example. The reflux values on this plot apply to that binary feed and target. Each horizontal move is one equilibrium contact.';

  if (result) {
    const [light, heavy] = result.keys.map((index) => result.names[index]);
    $('comparison-feed').textContent = `${result.names.length}-component feed · ${light} / ${heavy} keys. All three cases use the same feed and recovery targets.`;
  } else {
    $('comparison-feed').textContent = 'Load an example or build a valid feed to compare all three cases for one separation.';
  }
  $('compare-min-stages').value = result?.nMin === undefined ? '—' : formatEstimate(result.nMin);
  $('compare-min-reflux').value = result?.rMin === undefined ? '—' : showRefluxPrecision(result.rMin);
  comparisonPoint.hidden = inspecting || !point;
  comparisonPending.hidden = !comparisonPoint.hidden;
  if (!comparisonPoint.hidden) {
    const multiplier = fixed($('multiple-value').valueAsNumber);
    const count = point.wholeStages === null ? '' : ` Use ${point.wholeStages.toLocaleString('en-US')} whole stages, including one equilibrium reboiler.`;
    comparisonPoint.textContent = `At R = ${multiplier} × minimum ≈ ${showRefluxPrecision(point.reflux)}, N ≈ ${formatEstimate(point.stages)}.${count}`;
  } else {
    comparisonPoint.textContent = '';
    comparisonPending.textContent = inspecting ? 'Check the prediction to reveal the working estimate.' : 'Set the feed, targets, and working reflux to get an estimate.';
  }
}

function showRefluxPrecision(value) {
  return value >= 10000 || value < 0.0001 ? formatEstimate(value)
    : value.toLocaleString('en-US', { useGrouping: false, minimumFractionDigits: 2, maximumFractionDigits: 5 });
}

startLesson.addEventListener('click', (event) => {
  if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  showLessonSection('prediction');
});

predictionForm.addEventListener('submit', (event) => {
  event.preventDefault();
  prediction = new FormData(predictionForm).get('prediction');
  if (!prediction) return;
  lessonPhase = 'setup';
  $('prediction-record').textContent = `Prediction recorded. You chose ${prediction.toLowerCase()}.`;
  $('prediction-record').hidden = false;
  $('prediction-answer').hidden = true;
  showEquipmentCase('flow');
  $('condenser-mode').value = 'total';
  $('pinch-mode').value = 'minimum';
  $('pinch-mode').dispatchEvent(new Event('change'));
  loadPinchExample();
  showLessonSection('setup');
});

$('fenske-next').addEventListener('click', () => {
  if (!isGuidedLesson()) return;
  lessonPhase = 'limits';
  showEquipmentCase('minimum');
  updateIntroLesson();
});

$('edit-guided-case').addEventListener('click', () => {
  lessonPhase = 'idle';
  showEquipmentCase('design');
  updateIntroLesson();
  showLessonSection('setup');
});

predictionCheck.addEventListener('click', () => {
  lessonPhase = 'checked';
  const lead = prediction === 'No' ? 'Your prediction was right.' : `You chose ${prediction.toLowerCase()}. The answer is no.`;
  $('prediction-answer').textContent = `${lead} At minimum reflux, nine contacts still leave the liquid above the feed composition. More contacts get closer to the pinch, and none reaches it in a finite number of steps. Fenske’s stage limit applies at total reflux, where no product leaves.`;
  $('prediction-answer').hidden = false;
  showEquipmentCase('design');
  updateIntroLesson();
  showLessonSection('compare');
});

$('compare-load-course').addEventListener('click', () => {
  $('prediction-answer').hidden = true;
  loadCourseExample();
  showEquipmentCase('design');
  showLessonSection('compare');
});

window.addEventListener('hashchange', (event) => {
  if (location.hash === '#prediction' && predictionTask.hidden) showLessonSection('prediction');
  const returnedToStart = !location.hash && new URL(event.oldURL).hash === '#prediction';
  if ((returnedToStart || location.hash === '#top') && !predictionTask.hidden) {
    setPredictionOpen(false);
    document.querySelector('.intro-actions .primary-button').focus({ preventScroll: true });
  }
  if (!isGuidedLesson()) return;
  if (location.hash === '#fenske') {
    lessonPhase = 'limits';
    showEquipmentCase('total');
  } else if (location.hash === '#underwood') {
    showEquipmentCase('minimum');
  }
  updateIntroLesson();
});

function setSectionMenu(open) {
  sectionToggle.setAttribute('aria-expanded', String(open));
  sectionMenu.classList.toggle('section-menu-open', open);
}

sectionMenu.classList.add('section-menu-ready');
sectionToggle.addEventListener('click', () => setSectionMenu(!sectionMenu.classList.contains('section-menu-open')));
$('section-menu-items').addEventListener('click', (event) => {
  const link = event.target.closest('a');
  if (!link || !sectionMenu.classList.contains('section-menu-open') || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  setSectionMenu(false);
  showLessonSection(link.hash.slice(1));
});
sectionMenu.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape' || !sectionMenu.classList.contains('section-menu-open')) return;
  setSectionMenu(false);
  sectionToggle.focus();
});
sectionMenu.addEventListener('focusout', (event) => {
  if (event.relatedTarget && !sectionMenu.contains(event.relatedTarget)) setSectionMenu(false);
});
document.addEventListener('click', (event) => {
  if (sectionMenu.classList.contains('section-menu-open') && !sectionMenu.contains(event.target)) setSectionMenu(false);
});

equipmentMode.addEventListener('change', updateEquipmentLink);
document.addEventListener('lab:results', updateIntroLesson);
updateEquipmentLink();
if (location.hash === '#prediction') showLessonSection('prediction');
else updateIntroLesson();
