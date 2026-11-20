'use strict';

const predictionForm = $('prediction-form');
const predictionCheck = $('check-prediction');
const comparisonPoint = $('compare-working-point');
const comparisonPending = $('compare-working-pending');
let prediction;
let lessonPhase = 'idle';

function isInspectingLimits() {
  return lessonPhase === 'total' || lessonPhase === 'minimum';
}

function showLessonSection(id) {
  const section = $(id);
  location.hash = id;
  const heading = section.querySelector('h2');
  heading.tabIndex = -1;
  heading.focus({ preventScroll: true });
  section.scrollIntoView({ block: 'start' });
}

function showEquipmentCase(mode) {
  const select = $('equipment-mode');
  select.value = mode;
  select.dispatchEvent(new Event('change'));
}

function updateIntroLesson() {
  const inspecting = isInspectingLimits();
  const result = currentResult;
  const point = result?.point;
  const active = feedAndKeyInputs().componentInputs.length > 0;

  $('open-experiment-label').textContent = active ? 'Resume my experiment' : 'Open the experiment';
  $('prediction-replace').hidden = !active;
  $('preset-replace').hidden = !active;
  predictionCheck.hidden = lessonPhase !== 'minimum';
  $('skip-prediction-check').hidden = inspecting;
  $('comparison-actions').hidden = inspecting;
  $('comparison-return').hidden = !inspecting;
  $('gilliland-pending').hidden = !inspecting;
  $('gilliland-axes').hidden = inspecting;
  $('gilliland-workspace').hidden = inspecting;
  $('equipment-mode').options[0].disabled = inspecting;

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

predictionForm.addEventListener('submit', (event) => {
  event.preventDefault();
  prediction = new FormData(predictionForm).get('prediction');
  if (!prediction) return;
  lessonPhase = 'total';
  $('prediction-record').textContent = `Prediction recorded. You chose ${prediction.toLowerCase()}.`;
  $('prediction-record').hidden = false;
  $('prediction-answer').hidden = true;
  showEquipmentCase('total');
  $('condenser-mode').value = 'total';
  $('pinch-mode').value = 'minimum';
  $('pinch-mode').dispatchEvent(new Event('change'));
  loadPinchExample();
  showLessonSection('fenske');
});

for (const link of document.querySelectorAll('[data-lesson-next="minimum"]')) {
  link.addEventListener('click', () => {
    if (lessonPhase !== 'total') return;
    lessonPhase = 'minimum';
    showEquipmentCase('minimum');
    updateIntroLesson();
  });
}

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

window.addEventListener('hashchange', () => {
  if (location.hash !== '#setup' || !isInspectingLimits()) return;
  lessonPhase = 'idle';
  showEquipmentCase('design');
  updateIntroLesson();
});
document.addEventListener('lab:results', updateIntroLesson);
updateIntroLesson();
