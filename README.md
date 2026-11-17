# Joy-Con EMDR

A free, open-source web app that turns a pair of Nintendo Joy-Con controllers into alternating left-right tactile tappers for EMDR-style bilateral stimulation. It runs entirely in the browser over [WebHID](https://developer.mozilla.org/en-US/docs/Web/API/WebHID_API): no install, no account, nothing leaves your computer.

**Live app:** https://williamhsu.github.io/joycon-emdr/

## What it does

- Connects a left and a right Joy-Con and fires their haptics in alternation
- Adjustable speed (0.5 to 3 taps per second), intensity, tap length and set length
- Optional on-screen light bar and stereo-panned audio clicks (use headphones), which also work without controllers
- Space bar to start and stop; sets end on their own

## Requirements

- Chrome, Edge or Opera on macOS, Windows, Linux or ChromeOS (WebHID)
- Two Joy-Cons paired with the computer over Bluetooth ([pairing guide](https://www.therajoyapp.com/connect-joy-cons))

WebHID is not available on iPhone, iPad, Android, Safari or Firefox. On iPhone and iPad, [TheraJoy](https://www.therajoyapp.com/) drives Joy-Cons natively.

## Why Joy-Cons

Bilateral stimulation wants two separate devices, one per hand, each producing a crisp, identical tap. Joy-Cons are exactly that: two wireless controllers with linear resonant actuators ("HD rumble"), and a used pair costs far less than dedicated EMDR pulsers. Single-shell controllers like the DualSense or Xbox pad blur left and right through one body. Background: [Joy-Cons for EMDR](https://www.therajoyapp.com/joy-cons-for-emdr).

## Run it locally

It is plain HTML, CSS and ES modules with no build step:

```sh
git clone https://github.com/williamhsu/joycon-emdr.git
cd joycon-emdr
python3 -m http.server 8000   # WebHID needs http://localhost or https
```

Then open http://localhost:8000 in Chrome.

## How it works

`joycon.js` is a small driver (about 100 lines). It enables vibration with subcommand `0x48` on output report `0x01`, then sends rumble-only output reports `0x10`, encoding frequency and amplitude as described in the community [Nintendo Switch reverse-engineering notes](https://github.com/dekuNukem/Nintendo_Switch_Reverse_Engineering). `app.js` runs the left-right timing, the light bar and the audio.

Use the driver on its own:

```js
import { JoyCon, requestJoyCons } from './joycon.js';
const [device] = await requestJoyCons();
const jc = new JoyCon(device);
await jc.open();
await jc.pulse(150, { amplitude: 0.6 });
```

## Safety

EMDR is a psychotherapy delivered by a trained clinician. This project only produces alternating stimulation. It is not a medical device, does not provide therapy, and should not replace care from a qualified therapist.

## Contributing

Issues and pull requests are welcome, especially reports from different Joy-Con revisions, operating systems and browsers.

## License

MIT. Made by [TheraJoy](https://www.therajoyapp.com/). Nintendo, Nintendo Switch and Joy-Con are trademarks of Nintendo. This project is not affiliated with or endorsed by Nintendo.
