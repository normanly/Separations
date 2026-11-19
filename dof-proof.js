'use strict';

const $ = (id) => document.getElementById(id);

const requestedCount = Number(new URLSearchParams(location.search).get('components'));
// The component picker allocates the feed in increments of 0.1 mol%.
const componentCount = Number.isInteger(requestedCount) && requestedCount >= 2 && requestedCount <= 1000
  ? requestedCount
  : 4;

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

updateUnitCounts(componentCount);

const proofRows = Array.from(document.querySelectorAll('.proof-table tbody tr'));
let proofStep = -1;

function showProofStep() {
  const button = $('proof-next');
  proofRows.forEach((row, index) => {
    row.classList.toggle('is-current', index === proofStep);
    if (index === proofStep) row.setAttribute('aria-current', 'step');
    else row.removeAttribute('aria-current');
  });
  if (proofStep < 0) {
    $('proof-current').textContent = 'Start with 2T + C + 13 remaining choices.';
    button.textContent = 'Step through the count';
    return;
  }
  const [label, used, remaining] = Array.from(proofRows[proofStep].cells, (cell) => cell.textContent.trim());
  const previous = proofStep === 0 ? '2T + C + 13' : proofRows[proofStep - 1].cells[2].textContent.trim();
  $('proof-current').textContent = `${label} · (${previous}) − ${used} = ${remaining} remaining`;
  button.textContent = proofStep === proofRows.length - 1 ? 'Restart the count' : 'Next subtraction';
}
$('proof-next').addEventListener('click', () => {
  proofStep = proofStep === proofRows.length - 1 ? -1 : proofStep + 1;
  showProofStep();
});
