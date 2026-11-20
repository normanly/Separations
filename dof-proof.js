'use strict';

const $ = (id) => document.getElementById(id);

const nHexaneFeed = 25;
const splitFeedback = $('split-feedback');
const enoughInformation = $('split-enough');
const recoveryButtons = [...$('split-recovery').querySelectorAll('[data-recovery]')];

$('split-decision').hidden = false;
enoughInformation.addEventListener('click', () => {
  splitFeedback.textContent = 'Try two possible splits. 15 + 10 and 20 + 5 each give 25 mol. Both satisfy the balance.';
});
$('split-need-value').addEventListener('click', () => {
  splitFeedback.textContent = 'One equation for two unknowns leaves one degree of freedom. A recovery value fixes the amount in the distillate.';
  enoughInformation.disabled = true;
  $('split-recovery').hidden = false;
});
for (const button of recoveryButtons) {
  button.addEventListener('click', () => {
    const recovery = Number(button.dataset.recovery);
    const amount = nHexaneFeed * recovery / 100;
    const distillate = amount.toFixed(2);
    const bottoms = (nHexaneFeed - amount).toFixed(2);
    $('split-distillate').textContent = `${distillate} mol`;
    $('split-bottoms').textContent = `${bottoms} mol`;
    const proportions = $('split-proportions');
    proportions.style.setProperty('--distillate-share', `${recovery}%`);
    proportions.hidden = false;
    $('split-calculation').textContent = `${nHexaneFeed} mol × ${recovery}% = ${distillate} mol in the distillate. ${nHexaneFeed} − ${distillate} = ${bottoms} mol in the bottoms.`;
    for (const choice of recoveryButtons) choice.setAttribute('aria-pressed', String(choice === button));
  });
}

const requestedCount = Number(new URLSearchParams(location.search).get('components'));
// The component picker allocates the feed in increments of 0.1 mol%.
const componentCount = Number.isInteger(requestedCount) && requestedCount >= 2 && requestedCount <= 1000
  ? requestedCount
  : 4;
const startingCount = `2T + ${componentCount + 13}`;

function updateUnitCounts(components) {
  const trayUnknowns = 4 * components + 11;
  const trayEquations = 2 * components + 5;
  const trayFreedom = trayUnknowns - trayEquations;
  $('dof-components').textContent = components;
  $('dof-tray-example').textContent = `With ${components} components, one tray has ${trayUnknowns} unknowns and ${trayEquations} independent equations. That leaves ${trayFreedom} degrees of freedom.`;
  $('dof-after-trays').textContent = components + 13;
  $('dof-feed-used').textContent = components + 2;
  $('dof-equilibrium-tray').textContent = trayFreedom;
  $('dof-feed-tray').textContent = 3 * components + 8;
  $('dof-condenser-reboiler').textContent = components + 4;
  $('dof-splitter').textContent = components + 5;
}

updateUnitCounts(componentCount);

const proofTable = $('proof-table');
const proofRows = Array.from(proofTable.tBodies[0].rows);
const proofButton = $('proof-next');
const proofCurrent = $('proof-current');
let proofStep = -1;

function showProofStep() {
  proofTable.hidden = proofStep < 0;
  $('proof-conclusion').hidden = proofStep < proofRows.length - 1;
  proofRows.forEach((row, index) => {
    row.hidden = index > proofStep;
    row.classList.toggle('is-current', index === proofStep);
    if (index === proofStep) row.setAttribute('aria-current', 'step');
    else row.removeAttribute('aria-current');
  });
  if (proofStep < 0) {
    proofCurrent.textContent = `With C = ${componentCount}, start with ${startingCount} remaining choices.`;
    proofButton.textContent = 'Step through the count';
    return;
  }
  const [label, used, remaining] = Array.from(proofRows[proofStep].cells, (cell) => cell.textContent.trim());
  const previous = proofStep === 0 ? startingCount : proofRows[proofStep - 1].cells[2].textContent.trim();
  proofCurrent.textContent = `${label} · (${previous}) − ${used} = ${remaining} remaining`;
  proofButton.textContent = proofStep === proofRows.length - 1 ? 'Restart the count' : 'Next subtraction';
}
proofButton.addEventListener('click', () => {
  proofStep = proofStep === proofRows.length - 1 ? -1 : proofStep + 1;
  showProofStep();
});
proofButton.hidden = false;
proofCurrent.hidden = false;
showProofStep();
