'use strict';

const designWalkthrough = $('design-walkthrough');
const walkthroughCard = designWalkthrough.querySelector('.walkthrough-card');
const walkthroughBody = walkthroughCard.querySelector('.walkthrough-body');
const startWalkthrough = $('start-walkthrough');
const walkthroughNext = $('walkthrough-next');
const walkthroughBack = $('walkthrough-back');
const walkthroughStatus = $('walkthrough-status');
const walkthroughEdit = $('walkthrough-edit');
const walkthroughBar = $('walkthrough-bar');
const walkthroughKey = 'distillation-lab:first-design-walkthrough';

function checkWorkingPoint() {
  return currentResult?.point ? '' : $('input-error').textContent || 'Enter valid feed and design inputs to calculate a working point.';
}

const walkthroughSteps = [
  {
    element: $('mixture-picker-step'),
    title: 'Build the feed',
    instruction: 'Load the four-component course example, or search for and add at least two hydrocarbons.',
    reason: 'To estimate trays and reflux, start with what enters the column. The feed composition tells you what is available to separate.',
    check() {
      const count = feedAndKeyInputs().componentInputs.length;
      return count < 2 ? `${count} of 2 components added` : '';
    },
  },
  {
    element: $('feed-conditions'),
    title: 'Check the keys and feed state',
    instruction: 'Choose the light and heavy keys and check q. A value of 0.50 means half the feed is liquid by moles.',
    reason: 'The more volatile light key goes mostly to the top product. The heavy key goes mostly to the bottoms. Underwood uses q to account for the vapor entering with the feed.',
    check() {
      if (!$('key-pair').value) return 'Select a key pair.';
      return $('quality-value').validity.valid ? '' : 'Enter a feed liquid fraction from 0 to 1 in 0.01 steps.';
    },
  },
  {
    element: $('recovery-controls'),
    title: 'Set both recovery targets',
    instruction: 'Keep or adjust the two recoveries. A light-key recovery of 0.95 sends 95% of the incoming light key overhead.',
    reason: 'Recoveries specify where each key goes. The material balance uses them to find the product compositions needed to calculate the limits.',
    check: () => recoveryKeys.some((key) => !$(`${key}-value`).validity.valid)
      ? 'Enter both recoveries from 0.51 to 0.99 in 0.01 steps.' : '',
  },
  {
    element: $('operating-controls'),
    title: 'Choose reflux and a feed tray',
    instruction: 'Try 1.50 times minimum reflux and start with the feed near the middle at 0.50.',
    reason: 'Underwood’s minimum is the pinch limit. Use more reflux to reach the target in a finite number of stages. The feed location divides the trays above and below the inlet.',
    editSetup: true,
    check() {
      if (!$('multiple-value').validity.valid) return 'Enter a reflux multiplier from 1.05 to 5 in 0.01 steps.';
      if (!$('feedPosition-value').validity.valid) return 'Enter a feed position from 0 to 1 in 0.01 steps.';
      return checkWorkingPoint();
    },
  },
  {
    element: $('operating-readout'),
    title: 'Find the stage estimate',
    instruction: 'Read the stage estimate and its rounded count. The whole stages include one equilibrium reboiler.',
    reason: 'Fenske gives the fewest stages at total reflux, when no product leaves. Underwood gives the least reflux, where the stages needed grow without bound. Gilliland uses both limits and your reflux to estimate the stage count.',
    editSetup: true,
    check: checkWorkingPoint,
  },
];
walkthroughBar.max = walkthroughSteps.length;

let seenWalkthrough = false;
let activeStep = -1;
let walkthroughFrame;

function alreadyOfferedWalkthrough() {
  try {
    return seenWalkthrough || localStorage.getItem(walkthroughKey) !== null;
  } catch {
    return seenWalkthrough;
  }
}

function rememberWalkthrough(outcome) {
  seenWalkthrough = true;
  try {
    localStorage.setItem(walkthroughKey, outcome);
  } catch {
    // Keep the first-visit behavior for the current page if storage is unavailable.
  }
}

const walkthroughViewport = window.visualViewport;
const clampTo = (value, low, high) => Math.max(low, Math.min(value, high));

function positionWalkthrough() {
  const target = walkthroughSteps[activeStep].element;
  const leftEdge = walkthroughViewport?.offsetLeft ?? 0;
  const topEdge = walkthroughViewport?.offsetTop ?? 0;
  const width = walkthroughViewport?.width ?? document.documentElement.clientWidth;
  const height = walkthroughViewport?.height ?? window.innerHeight;
  const rightEdge = leftEdge + width;
  const bottomEdge = topEdge + height;
  const gap = 14;

  if (activeStep === 0) {
    target.style.setProperty('--walkthrough-results-height', `${clampTo(height - 315, 48, 138)}px`);
  }

  walkthroughCard.style.width = `${Math.min(320, width - gap * 2)}px`;
  const maxHeight = Math.max(0, height - gap * 2);
  walkthroughCard.style.maxHeight = `${maxHeight}px`;
  const cardWidth = walkthroughCard.offsetWidth;
  const cardHeight = walkthroughCard.offsetHeight;
  let rect = target.getBoundingClientRect();
  const roomRight = rightEdge - rect.right - gap * 2;
  const roomLeft = rect.left - leftEdge - gap * 2;
  const needsStack = roomRight < cardWidth && roomLeft < cardWidth;
  const compact = needsStack && height < (activeStep === 0 ? 250 : 340);
  target.classList.toggle('walkthrough-target-scroll', compact);
  if (compact) {
    const messageSpace = Math.min(cardHeight, 125);
    target.style.setProperty('--walkthrough-target-height', `${Math.max(52, height - messageSpace - gap * 3)}px`);
  }
  rect = target.getBoundingClientRect();
  let left = clampTo(rect.left + (rect.width - cardWidth) / 2, leftEdge + gap, rightEdge - cardWidth - gap);
  let top;
  let placement;

  if (!needsStack) {
    placement = roomRight >= cardWidth ? 'right' : 'left';
    left = placement === 'right' ? rect.right + gap : rect.left - cardWidth - gap;
    top = clampTo(rect.top + (rect.height - cardHeight) / 2, topEdge + gap, bottomEdge - cardHeight - gap);
  } else {
    let roomBelow = bottomEdge - rect.bottom - gap * 2;
    let roomAbove = rect.top - topEdge - gap * 2;
    if (roomBelow < cardHeight && roomAbove < cardHeight) {
      // Bring the highlighted input into the visible area when the keyboard reduces it.
      const desiredTop = topEdge + Math.max(gap, (height - rect.height - cardHeight - gap) / 2);
      const shift = rect.top - desiredTop;
      if (Math.abs(shift) > 2) {
        window.scrollBy({ top: shift, behavior: 'instant' });
        rect = target.getBoundingClientRect();
        roomBelow = bottomEdge - rect.bottom - gap * 2;
        roomAbove = rect.top - topEdge - gap * 2;
      }
    }
    const below = roomBelow >= cardHeight || roomBelow >= roomAbove;
    placement = below ? 'below' : 'above';
    const available = clampTo(below ? roomBelow : roomAbove, Math.min(52, maxHeight), maxHeight);
    walkthroughCard.style.maxHeight = `${available}px`;
    top = below ? rect.bottom + gap : rect.top - walkthroughCard.offsetHeight - gap;
    top = clampTo(top, topEdge + gap, bottomEdge - walkthroughCard.offsetHeight - gap);
  }

  const topSpot = clampTo(rect.top - 4, 0, window.innerHeight);
  const leftSpot = clampTo(rect.left - 4, 0, document.documentElement.clientWidth);
  const rightSpot = clampTo(rect.right + 4, leftSpot, document.documentElement.clientWidth);
  const bottomSpot = clampTo(rect.bottom + 4, topSpot, window.innerHeight);
  const edges = {
    top: topSpot, left: leftSpot, right: rightSpot, bottom: bottomSpot,
    width: rightSpot - leftSpot, height: bottomSpot - topSpot,
  };
  for (const [edge, value] of Object.entries(edges)) {
    designWalkthrough.style.setProperty(`--spot-${edge}`, `${value}px`);
  }
  walkthroughCard.style.left = `${left}px`;
  walkthroughCard.style.top = `${top}px`;
  walkthroughCard.dataset.placement = placement;
  const side = placement === 'left' || placement === 'right';
  const pointer = side ? rect.top + rect.height / 2 - top : rect.left + rect.width / 2 - left;
  const edgeLength = side ? walkthroughCard.offsetHeight : cardWidth;
  walkthroughCard.style.setProperty('--spotlight-pointer', `${clampTo(pointer, 15, edgeLength - 15)}px`);
  walkthroughBody.tabIndex = walkthroughBody.scrollHeight > walkthroughBody.clientHeight + 1 ? 0 : -1;
}

function scheduleWalkthroughLayout() {
  if (activeStep < 0 || walkthroughFrame !== undefined) return;
  walkthroughFrame = requestAnimationFrame(() => {
    walkthroughFrame = undefined;
    if (activeStep >= 0) positionWalkthrough();
  });
}

const walkthroughResize = new ResizeObserver(scheduleWalkthroughLayout);

function refreshWalkthrough() {
  if (activeStep < 0) return;
  const step = walkthroughSteps[activeStep];
  if (!step.element.getClientRects().length) {
    showWalkthroughStep(0);
    return;
  }
  const message = step.check();
  walkthroughStatus.hidden = !message;
  if (walkthroughStatus.textContent !== message) walkthroughStatus.textContent = message;
  walkthroughNext.disabled = Boolean(message);
  walkthroughEdit.hidden = !(step.editSetup && message && !currentResult?.point);
  scheduleWalkthroughLayout();
}

function releaseWalkthroughTarget() {
  if (activeStep < 0) return;
  const { element } = walkthroughSteps[activeStep];
  walkthroughResize.unobserve(element);
  element.classList.remove('walkthrough-target', 'walkthrough-target-scroll');
  element.style.removeProperty('--walkthrough-results-height');
  element.style.removeProperty('--walkthrough-target-height');
}

function showWalkthroughStep(index) {
  releaseWalkthroughTarget();
  activeStep = index;
  const step = walkthroughSteps[index];
  step.element.classList.add('walkthrough-target');
  walkthroughResize.observe(step.element);
  $('walkthrough-progress').textContent = `Step ${index + 1} of ${walkthroughSteps.length}`;
  walkthroughBar.value = index + 1;
  $('walkthrough-title').textContent = step.title;
  $('walkthrough-instruction').textContent = step.instruction;
  $('walkthrough-reason').textContent = step.reason;
  walkthroughBody.scrollTop = 0;
  walkthroughBack.hidden = index === 0;
  walkthroughNext.textContent = index === walkthroughSteps.length - 1 ? 'Finish' : 'Next';
  step.element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
  // Preserve the selected control on screen when keyboard focus moves into the card.
  refreshWalkthrough();
  positionWalkthrough();
  walkthroughCard.focus({ preventScroll: true });
}

function openWalkthrough() {
  if (activeStep >= 0) return;
  rememberWalkthrough('shown');
  designWalkthrough.hidden = false;
  document.body.classList.add('walkthrough-open');
  showWalkthroughStep(0);
}

function closeWalkthrough(outcome, focus = outcome === 'completed' ? $('operating-readout') : startWalkthrough) {
  if (activeStep < 0) return;
  releaseWalkthroughTarget();
  activeStep = -1;
  designWalkthrough.hidden = true;
  document.body.classList.remove('walkthrough-open');
  rememberWalkthrough(outcome);
  focus.focus({ preventScroll: outcome === 'completed' });
}

startWalkthrough.addEventListener('click', openWalkthrough);
$('walkthrough-skip').addEventListener('click', () => closeWalkthrough('skipped'));
walkthroughEdit.addEventListener('click', () => {
  const form = $('column-form');
  const invalid = form.querySelector('[aria-invalid="true"]:not([readonly])');
  const feed = form.querySelector('.feed-moles:not([readonly])');
  const input = invalid || (form.querySelector('.feed-moles[aria-invalid="true"]') && feed) || $('lightRecovery-value');
  closeWalkthrough('editing', input);
});
walkthroughBack.addEventListener('click', () => {
  if (activeStep > 0) showWalkthroughStep(activeStep - 1);
});
walkthroughNext.addEventListener('click', () => {
  if (activeStep < 0 || walkthroughSteps[activeStep].check()) return;
  if (activeStep === walkthroughSteps.length - 1) closeWalkthrough('completed');
  else showWalkthroughStep(activeStep + 1);
});
designWalkthrough.addEventListener('click', (event) => {
  if (event.target.classList.contains('walkthrough-shade')) closeWalkthrough('skipped');
});

document.addEventListener('keydown', (event) => {
  if (activeStep < 0) return;
  const target = walkthroughSteps[activeStep].element;
  if (event.key === 'Escape') {
    // Close the open help or search before closing the tour.
    const pickerOpen = !($('component-results').hidden && $('custom-component').hidden);
    if (document.querySelector(':popover-open') || (activeStep === 0 && pickerOpen && target.contains(event.target))) return;
    event.preventDefault();
    closeWalkthrough('skipped');
  } else if (event.key === 'Tab') {
    const focusable = 'button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]';
    const controls = [...target.querySelectorAll(focusable), ...walkthroughCard.querySelectorAll(focusable)]
      .filter((element) => element.tabIndex >= 0 && element.getClientRects().length);
    const index = controls.indexOf(document.activeElement);
    const offset = event.shiftKey ? -1 : 1;
    const next = index < 0 && event.shiftKey ? controls.length - 1
      : (index + offset + controls.length) % controls.length;
    event.preventDefault();
    const control = controls[next];
    control?.focus({ preventScroll: true });
    const scrollRegions = '.component-results, .walkthrough-body, .walkthrough-target-scroll';
    let scroller = control?.parentElement.closest(scrollRegions);
    while (scroller) {
      const box = scroller.getBoundingClientRect();
      const rect = control.getBoundingClientRect();
      if (rect.top < box.top) scroller.scrollBy({ top: rect.top - box.top });
      if (rect.bottom > box.bottom) scroller.scrollBy({ top: rect.bottom - box.bottom });
      scroller = scroller.parentElement.closest(scrollRegions);
    }
  }
}, true);

function offerWalkthroughOnEntry() {
  if ((!location.hash || location.hash === '#setup') && !alreadyOfferedWalkthrough() && !currentResult?.point) {
    openWalkthrough();
  }
}

document.addEventListener('lab:results', refreshWalkthrough);
window.addEventListener('hashchange', offerWalkthroughOnEntry);
window.addEventListener('resize', scheduleWalkthroughLayout);
window.addEventListener('scroll', scheduleWalkthroughLayout, { passive: true });
walkthroughViewport?.addEventListener('resize', scheduleWalkthroughLayout);
walkthroughViewport?.addEventListener('scroll', scheduleWalkthroughLayout);
requestAnimationFrame(offerWalkthroughOnEntry);
