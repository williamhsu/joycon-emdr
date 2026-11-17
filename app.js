import { JoyCon, requestJoyCons, grantedJoyCons } from './joycon.js';

const $ = (id) => document.getElementById(id);
const pads = { left: null, right: null };
const hasHID = 'hid' in navigator;
let running = false, side = 'left', taps = 0, timer = null, audio = null;

if (!hasHID) {
  $('support').hidden = false;
  $('connect').disabled = true;
  $('useHaptic').checked = false;
  $('useLight').checked = true;
}

// ---------- settings ----------
const s = () => ({
  hz: Number($('speed').value),
  amp: 0.15 + (Number($('intensity').value) - 1) * (0.85 / 9),
  len: Number($('length').value),
  set: Number($('set').value),
});
function labels() {
  const v = s();
  $('speedOut').textContent = `${v.hz.toFixed(1)} taps/sec`;
  $('intOut').textContent = `${$('intensity').value} / 10`;
  $('lenOut').textContent = `${v.len} ms`;
  $('setOut').textContent = v.set ? `${v.set} taps` : 'continuous';
}
['speed', 'intensity', 'length', 'set'].forEach((id) => $(id).addEventListener('input', labels));
labels();

// ---------- controllers ----------
function render() {
  for (const [k, el, st] of [['left', 'padL', 'stL'], ['right', 'padR', 'stR']]) {
    $(el).classList.toggle('on', !!pads[k]);
    $(st).textContent = pads[k] ? 'connected' : 'not connected';
  }
  $('test').disabled = !(pads.left || pads.right);
}

async function attach(devices) {
  for (const d of devices) {
    const jc = new JoyCon(d);
    if (jc.side === 'unknown' || pads[jc.side]) continue;
    try { await jc.open(); pads[jc.side] = jc; }
    catch (e) { console.warn('Could not open', d.productName, e); }
  }
  render();
}

$('connect').addEventListener('click', async () => {
  try { await attach(await requestJoyCons()); }
  catch (e) { console.warn(e); }
});

$('test').addEventListener('click', async () => {
  const v = s();
  if (pads.left) await pads.left.pulse(v.len, { amplitude: v.amp });
  setTimeout(() => pads.right && pads.right.pulse(v.len, { amplitude: v.amp }), 500);
});

if (hasHID) {
  grantedJoyCons().then(attach);
  navigator.hid.addEventListener('connect', (e) => attach([e.device]));
  navigator.hid.addEventListener('disconnect', (e) => {
    for (const k of ['left', 'right']) if (pads[k] && pads[k].device === e.device) pads[k] = null;
    render();
  });
}

// ---------- audio ----------
function click(pan) {
  audio ??= new (window.AudioContext || window.webkitAudioContext)();
  const t = audio.currentTime;
  const osc = audio.createOscillator(), gain = audio.createGain(), p = audio.createStereoPanner();
  osc.frequency.value = 440; p.pan.value = pan;
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(0.35, t + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.001, t + Math.max(0.06, s().len / 1000));
  osc.connect(gain).connect(p).connect(audio.destination);
  osc.start(t); osc.stop(t + 0.5);
}

// ---------- session ----------
function tick() {
  const v = s();
  if ($('useHaptic').checked && pads[side]) pads[side].pulse(v.len, { amplitude: v.amp });
  if ($('useSound').checked) click(side === 'left' ? -1 : 1);
  if ($('useLight').checked) {
    $('ball').style.left = side === 'left' ? '0%' : 'calc(100% - var(--ball) - 16px)';
    $('ball').style.transitionDuration = `${Math.round(1000 / v.hz * 0.85)}ms`;
  }
  taps++;
  $('count').textContent = `${taps} taps`;
  side = side === 'left' ? 'right' : 'left';
  if (v.set && taps >= v.set) return stop();
  timer = setTimeout(tick, 1000 / v.hz);
}

function start() {
  if (running) return;
  if ($('useHaptic').checked && !pads.left && !pads.right && !$('useLight').checked && !$('useSound').checked) {
    $('count').textContent = 'Connect Joy-Cons or turn on the light bar or audio';
    return;
  }
  running = true; taps = 0; side = 'left';
  $('start').textContent = 'Stop';
  $('bar').classList.toggle('show', $('useLight').checked);
  tick();
}

function stop() {
  running = false;
  clearTimeout(timer);
  pads.left?.stop(); pads.right?.stop();
  $('start').textContent = 'Start';
}

$('start').addEventListener('click', () => (running ? stop() : start()));
$('useLight').addEventListener('change', () => $('bar').classList.toggle('show', $('useLight').checked));
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && !['INPUT', 'BUTTON'].includes(document.activeElement?.tagName)) {
    e.preventDefault(); running ? stop() : start();
  }
});
window.addEventListener('beforeunload', () => { pads.left?.close(); pads.right?.close(); });
render();
