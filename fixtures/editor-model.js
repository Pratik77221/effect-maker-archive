// Minimal model contract shared by adapter and serialized-bridge tests.
export const BUILD = 'effectmaker.effectmaker.en_GB.k9eBOpQ9YWc.2020.O';
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
    kM: () => occupied ? new Map([['text', { getId: () => 'text', Qa: () => 'Text' }]]) : new Map(),
    tM: () => undefined, wy: () => new Map(), uM: () => emptyGraph, Hx: () => new Map(), Vwa: () => new Map()
  };
  globalThis.location = { hostname: 'effects.youtube.com', pathname: '/edit/destination' };
  globalThis.document = { scripts: [{ src: 'https://www.youtube.com/s/_/effectmaker/_/js/k=' + build + '/m=base' }] };
  globalThis.window = { default_effectmaker: ns };
  return { trace, model, ns, setSource: value => { source = new Message(value); } };
}
