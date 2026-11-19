'use strict';

const designWalkthrough = $('design-walkthrough');
const walkthroughCard = designWalkthrough.querySelector('.walkthrough-card');
const startWalkthrough = $('start-walkthrough');
const walkthroughNext = $('walkthrough-next');
const walkthroughBack = $('walkthrough-back');
const walkthroughStatus = $('walkthrough-status');
const walkthroughBar = $('walkthrough-bar');
const walkthroughKey = 'distillation-lab:first-design-walkthrough';
const walkthroughSteps = [
  {
    element: $('component-picker'),
    title: 'Build the feed',
    instruction: 'Add at least two hydrocarbons with the search box, such as n-hexane and n-heptane.',
    check() {
      const count = feedAndKeyInputs().componentInputs.length;
      return count < 2 ? `${count} of 2 components added` : '';
    },
  },
  {
    element: $('key-pair-field'),
    title: 'Choose the keys',
    instruction: 'Confirm the light and heavy key pair to define the separation.',
    check: () => $('key-pair').value === '' ? 'Select a key pair to continue.' : '',
  },
  {
    element: $('multiple-value').closest('.control'),
    title: 'Set operating reflux',
    instruction: 'Keep the starting reflux multiplier or adjust it to choose a working point above minimum reflux.',
    check() {
      if (currentResult?.point) return '';
      return $('input-error').textContent || 'Complete the feed and recovery inputs to calculate a working point.';
    },
  },
  {
    element: $('operating-readout'),
    title: 'Find the stage estimate',
    instruction: 'Read the estimated number of stages for your selected reflux.',
    check: () => currentResult?.point ? '' : 'A working point is needed to calculate the stage estimate.',
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
    target.style.setProperty('--walkthrough-results-height', `${clampTo(height - 255, 48, 138)}px`);
  }

  walkthroughCard.style.width = `${Math.min(320, width - gap * 2)}px`;
  walkthroughCard.style.maxHeight = '';
  const cardWidth = walkthroughCard.offsetWidth;
  const cardHeight = walkthroughCard.offsetHeight;
  let rect = target.getBoundingClientRect();
  const roomRight = rightEdge - rect.right - gap * 2;
  const roomLeft = rect.left - leftEdge - gap * 2;
  let left = clampTo(rect.left + (rect.width - cardWidth) / 2, leftEdge + gap, rightEdge - cardWidth - gap);
  let top;
  let placement;

  if (roomRight >= cardWidth || roomLeft >= cardWidth) {
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
    const available = Math.max(52, below ? roomBelow : roomAbove);
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
  scheduleWalkthroughLayout();
}

function releaseWalkthroughTarget() {
  if (activeStep < 0) return;
  const { element } = walkthroughSteps[activeStep];
  walkthroughResize.unobserve(element);
  element.classList.remove('walkthrough-target');
  element.style.removeProperty('--walkthrough-results-height');
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

function closeWalkthrough(outcome) {
  if (activeStep < 0) return;
  releaseWalkthroughTarget();
  activeStep = -1;
  designWalkthrough.hidden = true;
  document.body.classList.remove('walkthrough-open');
  rememberWalkthrough(outcome);
  const focus = outcome === 'completed' ? $('operating-readout') : startWalkthrough;
  focus.focus({ preventScroll: outcome === 'completed' });
}

startWalkthrough.addEventListener('click', openWalkthrough);
$('walkthrough-skip').addEventListener('click', () => closeWalkthrough('skipped'));
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
    // The picker handles Escape when its search or custom-entry panel is open.
    const pickerOpen = !($('component-results').hidden && $('custom-component').hidden);
    if (activeStep === 0 && pickerOpen && target.contains(event.target)) return;
    event.preventDefault();
    closeWalkthrough('skipped');
  } else if (event.key === 'Tab') {
    const focusable = 'button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href]';
    const controls = [...target.querySelectorAll(focusable), ...walkthroughCard.querySelectorAll(focusable)]
      .filter((element) => element.tabIndex >= 0 && element.getClientRects().length);
    const index = controls.indexOf(document.activeElement);
    const offset = event.shiftKey ? -1 : 1;
    const next = index < 0 && event.shiftKey ? controls.length - 1
      : (index + offset + controls.length) % controls.length;
    event.preventDefault();
    controls[next]?.focus({ preventScroll: true });
  }
}, true);

function offerWalkthroughOnEntry() {
  if (location.hash === '#setup' && !alreadyOfferedWalkthrough() && !currentResult?.point) {
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
