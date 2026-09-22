// Minimal model contract shared by adapter and serialized-bridge tests.
export const BUILD = 'effectmaker.effectmaker.en_GB.k9eBOpQ9YWc.2020.O';
export const SEPTEMBER_11_BUILD = 'effectmaker.effectmaker.en_GB.gfHrZWkok9A.2020.O';
export const CURRENT_BUILD = 'effectmaker.effectmaker.en_GB.JjyImd5Sung.2020.O';
export const REVIEWED_BUILDS = [BUILD, SEPTEMBER_11_BUILD, CURRENT_BUILD];
export function setup({ build = BUILD, dirty = false, occupied = false } = {}) {
  const trace = [];
  class Message { constructor(value = []) { this.value = value; } toJSON() { return this.value; } serialize() { return JSON.stringify(this.value); } }
  const emptyGraph = { Lb: () => new Map(), v: () => [] };
  const model = { v: { sb: () => 'destination', yf: () => 'Summer effect', Ke: () => 'test-channel' }, ha: { value: dirty ? 1 : 0 }, ba: { value: new Map() }, save: async () => { trace.push('saved'); model.ha.value = 0; } };
  let source = new Message([]);
  const ns = {
    I: () => ({ resolve: token => token === ns.hC ? model : token === ns.Vs ? { resolveCommand: async command => { trace.push(command); source = new Message(JSON.parse(command.applyEffectSourceCommand.effectSourceJspb)); model.ha.value = 1; } } : {} }),
    id: () => {}, FQ: (handler, command) => ({ handled: true, completion: handler.resolveCommand(command) }),
    hC: function Model() {}, XC: Message, LC: function Scene() {}, Vs: { name: 'COMMAND_HANDLER_TOKEN' }, zA: function Assets() {}, BA: () => '',
    Ho: (parent, Type, field) => parent === model.v ? source : {},
    kM: () => occupied ? new Map([['text', { getId: () => 'text', getName: () => 'Text' }]]) : new Map(),
    tM: () => undefined, wy: () => new Map(), uM: () => emptyGraph, Hx: () => new Map(), Vwa: () => new Map(),
    ky: () => new Map(), lM: () => []
  };
  globalThis.location = { hostname: 'effects.youtube.com', pathname: '/edit/destination' };
  globalThis.document = { scripts: [{ src: 'https://www.youtube.com/s/_/effectmaker/_/js/k=' + build + '/m=base' }] };
  let exposed = ns;
  if (build === SEPTEMBER_11_BUILD) {
    exposed = { I: ns.I, id: ns.id, CQ: ns.FQ, gC: ns.hC, WC: ns.XC, KC: ns.LC, Vs: ns.Vs,
      yA: ns.zA, AA: ns.BA, Ho: ns.Ho, iM: ns.kM, rM: ns.tM, uy: ns.wy, sM: ns.uM,
      Fx: ns.Hx, Wwa: ns.Vwa, iy: ns.ky, jM: ns.lM };
    model.v = { mb: model.v.sb, xf: model.v.yf, Kd: model.v.Ke };
  } else if (build === CURRENT_BUILD) {
    exposed = { K: ns.I, id: ns.id, EQ: ns.FQ, lC: ns.hC, aD: ns.XC, PC: ns.LC, Ws: ns.Vs,
      DA: ns.zA, FA: ns.BA, Jo: ns.Ho, kM: ns.kM, tM: ns.tM, yy: ns.wy, uM: ns.uM,
      Jx: ns.Hx, bxa: ns.Vwa, my: ns.ky, lM: ns.lM };
    model.v = { nb: model.v.sb, wf: model.v.yf, Ld: model.v.Ke };
  }
  globalThis.window = { default_effectmaker: exposed };
  return { trace, model, ns: exposed, setSource: value => { source = new Message(value); } };
}
