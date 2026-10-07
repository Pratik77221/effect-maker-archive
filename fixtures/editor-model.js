// Minimal model contract shared by adapter and serialized-bridge tests.
export const BUILD = 'effectmaker.effectmaker.en_GB.k9eBOpQ9YWc.2020.O';
export const SEPTEMBER_11_BUILD = 'effectmaker.effectmaker.en_GB.gfHrZWkok9A.2020.O';
export const SEPTEMBER_22_BUILD = 'effectmaker.effectmaker.en_GB.JjyImd5Sung.2020.O';
export const OCTOBER_5_BUILD = 'effectmaker.effectmaker.en_GB.kns6RAOc7Cs.2020.O';
export const CURRENT_BUILD = 'effectmaker.effectmaker.en_GB.DUk-5bdFiPk.2020.O';
export const REVIEWED_BUILDS = [BUILD, SEPTEMBER_11_BUILD, SEPTEMBER_22_BUILD, OCTOBER_5_BUILD, CURRENT_BUILD];
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
  } else if (build === SEPTEMBER_22_BUILD) {
    exposed = { K: ns.I, id: ns.id, EQ: ns.FQ, lC: ns.hC, aD: ns.XC, PC: ns.LC, Ws: ns.Vs,
      DA: ns.zA, FA: ns.BA, Jo: ns.Ho, kM: ns.kM, tM: ns.tM, yy: ns.wy, uM: ns.uM,
      Jx: ns.Hx, bxa: ns.Vwa, my: ns.ky, lM: ns.lM };
    model.v = { nb: model.v.sb, wf: model.v.yf, Ld: model.v.Ke };
  }
  if (build === OCTOBER_5_BUILD) {
    exposed = { J: ns.I, id: ns.id, cR: ns.FQ, TC: ns.hC, JD: ns.XC, xD: ns.LC, lt: ns.Vs,
      kB: ns.zA, mB: ns.BA, Vo: ns.Ho, KM: ns.kM, UM: ns.tM, Sy: ns.wy, VM: ns.uM,
      cy: ns.Hx, ixa: ns.Vwa, Gy: ns.ky, LM: ns.lM };
    model.v = { qb: model.v.sb, Ef: model.v.yf, Od: model.v.Ke };
    exposed.VM = () => ({ Ob: emptyGraph.Lb, v: emptyGraph.v });
  }
  if (build === CURRENT_BUILD) {
    exposed = { J: ns.I, od: ns.id, uR: ns.FQ, ZC: ns.hC, PD: ns.XC, DD: ns.LC, tt: ns.Vs,
      qB: ns.zA, sB: ns.BA, cp: ns.Ho, bN: ns.kM, lN: ns.tM, az: ns.wy, mN: ns.uM,
      ly: ns.Hx, hxa: ns.Vwa, Py: ns.ky, cN: ns.lM };
    model.v = { wb: model.v.sb, Ff: model.v.yf, Od: model.v.Ke };
    exposed.mN = () => ({ Kb: emptyGraph.Lb, v: emptyGraph.v });
  }
  globalThis.window = { default_effectmaker: exposed };
  return { trace, model, ns: exposed, setSource: value => { source = new Message(value); } };
}
