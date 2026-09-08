// Small DOM harness for real panel handlers; no browser or network services.
export function panelDOM() {
  class Element {
    constructor(tag) {
      this.tag = tag; this.children = []; this.style = {}; this.dataset = {};
      this.attributes = {}; this.listeners = {}; this.textContent = ''; this.value = ''; this.files = [];
    }
    append(child) { this.children.push(child); child.parentElement = this; }
    replaceChildren(...children) { this.children = []; for (const child of children) this.append(child); }
    remove() { this.parentElement.children = this.parentElement.children.filter(child => child !== this); }
    setAttribute(name, value) { this.attributes[name] = value; }
    addEventListener(type, callback) { this.listeners[type] = callback; }
    focus() {}
    scrollIntoView() {}
    click() { if (!this.disabled) return this.listeners.click?.(); }
  }
  const body = new Element('body');
  const all = () => { const visit = node => [node, ...node.children.flatMap(visit)]; return visit(body); };
  globalThis.location = { origin: 'chrome-extension://test', pathname: '/panel.html' };
  globalThis.document = { body, createElement: tag => new Element(tag), createElementNS: (_, tag) => new Element(tag), getElementById: id => all().find(node => node.id === id) };
  return { all, button: text => all().find(node => node.tag === 'button' && node.textContent === text), status: () => all().find(node => node.className === 'ema-result')?.textContent };
}
