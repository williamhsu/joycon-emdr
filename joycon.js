// Minimal Nintendo Joy-Con rumble driver over WebHID.
//
// Protocol notes come from the community reverse-engineering documentation:
// https://github.com/dekuNukem/Nintendo_Switch_Reverse_Engineering
//   - output report 0x01 = rumble + subcommand; subcommand 0x48 (arg 0x01) enables vibration
//   - output report 0x10 = rumble only
//   - each report starts with a 4-bit packet counter, then 8 bytes of rumble data
//     (4 for the left actuator, 4 for the right; a single Joy-Con reads its own half)

export const NINTENDO_VENDOR_ID = 0x057e;
export const JOYCON_L = 0x2006;
export const JOYCON_R = 0x2007;

const NEUTRAL = [0x00, 0x01, 0x40, 0x40];
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// Encode one actuator's rumble: a low band, a high band and one amplitude (0..1).
export function encodeRumble(lowFreq, highFreq, amplitude) {
  if (amplitude <= 0) return NEUTRAL.slice();
  const lf = Math.round(Math.log2(clamp(lowFreq, 41, 626) / 10) * 32) - 0x40;
  const hf = (Math.round(Math.log2(clamp(highFreq, 82, 1252) / 10) * 32) - 0x60) * 4;
  const amp = clamp(amplitude, 0.12, 1);
  const encAmp = amp > 0.23
    ? Math.round(Math.log2(amp * 8.7) * 32)
    : Math.round(Math.log2(amp * 17) * 16);
  const hfAmp = encAmp * 2;
  const lfAmp = Math.floor(encAmp / 2) + 0x40;
  return [hf & 0xff, (hfAmp + ((hf >> 8) & 0xff)) & 0xff, lf & 0xff, lfAmp & 0xff];
}

export class JoyCon {
  constructor(device) {
    this.device = device;
    this.counter = 0;
    this.side = device.productId === JOYCON_L ? 'left' : device.productId === JOYCON_R ? 'right' : 'unknown';
    this.timer = null;
  }

  get name() { return this.device.productName || `Joy-Con (${this.side})`; }

  async open() {
    if (!this.device.opened) await this.device.open();
    // Enable vibration (subcommand 0x48, argument 0x01).
    await this.#send(0x01, [...NEUTRAL, ...NEUTRAL, 0x48, 0x01]);
  }

  async #send(reportId, payload) {
    const data = new Uint8Array([this.counter, ...payload]);
    this.counter = (this.counter + 1) & 0x0f;
    await this.device.sendReport(reportId, data);
  }

  async rumble(lowFreq, highFreq, amplitude) {
    const r = encodeRumble(lowFreq, highFreq, amplitude);
    await this.#send(0x10, [...r, ...r]);
  }

  async stop() {
    clearInterval(this.timer); this.timer = null;
    try { await this.#send(0x10, [...NEUTRAL, ...NEUTRAL]); } catch { /* device gone */ }
  }

  // One tap: vibrate for ms, refreshing the packet so the controller does not drop it early.
  async pulse(ms, { lowFreq = 160, highFreq = 320, amplitude = 0.6 } = {}) {
    clearInterval(this.timer);
    const send = () => this.rumble(lowFreq, highFreq, amplitude).catch(() => {});
    await send();
    this.timer = setInterval(send, 40);
    setTimeout(() => this.stop(), ms);
  }

  async close() {
    await this.stop();
    if (this.device.opened) await this.device.close();
  }
}

export async function requestJoyCons() {
  const devices = await navigator.hid.requestDevice({
    filters: [
      { vendorId: NINTENDO_VENDOR_ID, productId: JOYCON_L },
      { vendorId: NINTENDO_VENDOR_ID, productId: JOYCON_R },
    ],
  });
  return devices;
}

export async function grantedJoyCons() {
  const devices = await navigator.hid.getDevices();
  return devices.filter((d) => d.vendorId === NINTENDO_VENDOR_ID && (d.productId === JOYCON_L || d.productId === JOYCON_R));
}
