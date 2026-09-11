// Scoped to the injected panel so Effect Maker's layout and controls stay intact.
export const panelStyles = `
#em-local-archive-controls {
  all: initial;
  position: fixed;
  z-index: 2147483647;
  top: 80px;
  right: 20px;
  display: flex;
  flex-direction: column;
  width: 384px;
  max-width: calc(100vw - 32px);
  max-height: calc(100vh - 96px);
  max-height: calc(100dvh - 96px);
  box-sizing: border-box;
  overflow: hidden;
  color: #0f0f0f;
  background: #fff;
  border: 1px solid #dedede;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0,0,0,.12), 0 2px 6px rgba(0,0,0,.04);
  font: 14px/1.45 Roboto, Arial, sans-serif;
  text-align: left;
  color-scheme: light;
  isolation: isolate;
}
#em-local-archive-controls *,
#em-local-archive-controls *::before,
#em-local-archive-controls *::after { box-sizing: border-box; }
#em-local-archive-controls [hidden] { display: none !important; }
#em-local-archive-controls :is(h2,h3,p,pre) { margin: 0; padding: 0; font: inherit; color: inherit; }
#em-local-archive-controls button { all: unset; box-sizing: border-box; font: inherit; }
#em-local-archive-controls :is(button,input,summary):focus-visible,
#em-local-archive-controls .ema-picker:focus-within { outline: 2px solid #065fd4; outline-offset: 3px; }
#em-local-archive-controls svg { display: block; width: 20px; height: 20px; flex: 0 0 auto; fill: none; stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }
#em-local-archive-controls .ema-header { display: flex; align-items: center; gap: 12px; padding: 20px; border-bottom: 1px solid #ededed; flex: 0 0 auto; }
#em-local-archive-controls .ema-brand { display: grid; place-items: center; width: 40px; height: 40px; flex: 0 0 auto; color: #fff; background: #ff0033; border-radius: 12px; }
#em-local-archive-controls .ema-brand svg { width: 25px; height: 25px; }
#em-local-archive-controls .ema-heading { flex: 1; min-width: 0; }
#em-local-archive-controls h2 { font-size: 18px; font-weight: 600; line-height: 1.3; letter-spacing: -.2px; }
#em-local-archive-controls .ema-subtitle { margin-top: 3px; color: #606060; font-size: 12px; }
#em-local-archive-controls .ema-close { display: grid; place-items: center; width: 32px; height: 32px; flex: 0 0 auto; border-radius: 50%; cursor: pointer; color: #606060; }
#em-local-archive-controls .ema-close:hover:not(:disabled) { background: #f2f2f2; color: #0f0f0f; }
#em-local-archive-controls .ema-close:disabled { opacity: .35; cursor: default; }
#em-local-archive-controls .ema-body { padding: 20px; overflow-y: auto; overscroll-behavior: contain; scrollbar-width: thin; min-height: 0; }
#em-local-archive-controls .ema-section { padding: 0; }
#em-local-archive-controls .ema-section-heading { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
#em-local-archive-controls .ema-section-icon { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 10px; flex: 0 0 auto; background: #f2f2f2; }
#em-local-archive-controls .ema-section-copy { flex: 1; min-width: 0; }
#em-local-archive-controls h3 { font-size: 15px; font-weight: 600; line-height: 1.4; }
#em-local-archive-controls .ema-description { margin-top: 3px; font-size: 12px; color: #606060; line-height: 1.5; }
#em-local-archive-controls .ema-button { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; min-height: 40px; padding: 10px 16px; border: 1px solid transparent; border-radius: 22px; background: #0f0f0f; color: #fff; font-size: 14px; line-height: 18px; font-weight: 500; cursor: pointer; transition: background .15s, border-color .15s; text-align: center; }
#em-local-archive-controls .ema-button > svg { order: -1; width: 18px; height: 18px; }
#em-local-archive-controls .ema-button:hover:not(:disabled) { background: #303030; }
#em-local-archive-controls .ema-button:disabled { background: #f2f2f2; color: #909090; cursor: default; }
#em-local-archive-controls .ema-button-secondary { background: #fff; border-color: #d9d9d9; color: #0f0f0f; }
#em-local-archive-controls .ema-button-secondary:hover:not(:disabled) { background: #f2f2f2; border-color: #c6c6c6; }
#em-local-archive-controls .ema-divider { height: 1px; border: 0; background: #e9e9e9; margin: 20px 0; }
#em-local-archive-controls .ema-picker { position: relative; display: flex; align-items: center; gap: 12px; padding: 16px 14px; margin-bottom: 12px; background: #fafafa; border: 1px dashed #bdbdbd; border-radius: 12px; cursor: pointer; transition: background .15s, border-color .15s; }
#em-local-archive-controls .ema-picker:hover:not([data-disabled="true"]) { background: #f0f6ff; border-color: #065fd4; }
#em-local-archive-controls .ema-picker[data-state="selected"] { border-style: solid; border-color: #b8d4ef; background: #f5f9ff; }
#em-local-archive-controls .ema-picker[data-state="error"] { border-color: #c88e8e; }
#em-local-archive-controls .ema-picker[data-disabled="true"] { opacity: .55; cursor: default; }
#em-local-archive-controls .ema-picker > svg { color: #065fd4; width: 24px; height: 24px; }
#em-local-archive-controls .ema-picker-copy { min-width: 0; flex: 1; }
#em-local-archive-controls .ema-file-name { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #065fd4; font-size: 13px; font-weight: 500; }
#em-local-archive-controls .ema-file-hint { display: block; margin-top: 3px; color: #606060; font-size: 11px; line-height: 1.4; }
#em-local-archive-controls .ema-file-input { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; font: inherit; }
#em-local-archive-controls .ema-file-input:disabled { cursor: default; }
#em-local-archive-controls .ema-note { margin-top: 10px; color: #606060; font-size: 11px; text-align: center; }
#em-local-archive-controls .ema-status { margin-top: 20px; padding: 14px; border: 1px solid #e9e9e9; border-radius: 12px; background: #f8f8f8; }
#em-local-archive-controls .ema-status-heading { display: flex; align-items: center; gap: 8px; margin-bottom: 5px; font-size: 13px; font-weight: 500; }
#em-local-archive-controls .ema-status-mark { display: grid; place-items: center; width: 16px; height: 16px; flex: 0 0 auto; border: 1.5px solid currentColor; border-radius: 50%; color: #606060; font: 600 10px/1 Arial, sans-serif; }
#em-local-archive-controls .ema-result { color: #606060; font-size: 12px; line-height: 1.55; white-space: pre-wrap; overflow-wrap: anywhere; }
#em-local-archive-controls .ema-time { margin-top: 7px; color: #606060; font-size: 11px; font-variant-numeric: tabular-nums; }
#em-local-archive-controls .ema-time:empty { display: none; }
#em-local-archive-controls .ema-status[data-state="working"] { border-color: #d6e6f7; background: #f5f9ff; }
#em-local-archive-controls .ema-status[data-state="working"] .ema-status-mark { border-color: #c7dcf4; border-top-color: #065fd4; animation: ema-spin .9s linear infinite; }
#em-local-archive-controls .ema-status[data-state="success"] { border-color: #d2e7db; background: #f3faf6; }
#em-local-archive-controls .ema-status[data-state="success"] .ema-status-mark { color: #137333; }
#em-local-archive-controls .ema-status[data-state="error"] { border-color: #f0d5d5; background: #fff7f7; }
#em-local-archive-controls .ema-status[data-state="error"] .ema-status-mark { color: #b3261e; }
#em-local-archive-controls .ema-status .ema-button { margin-top: 12px; min-height: 36px; padding: 8px 14px; font-size: 13px; }
#em-local-archive-controls .ema-details { margin-top: 14px; color: #606060; font-size: 12px; }
#em-local-archive-controls .ema-details summary { width: fit-content; border-radius: 3px; cursor: pointer; font-weight: 500; }
#em-local-archive-controls .ema-details pre { margin-top: 10px; max-height: 180px; overflow: auto; padding: 12px; border-radius: 8px; background: #f8f8f8; color: #454545; white-space: pre-wrap; overflow-wrap: anywhere; font: 11px/1.5 ui-monospace, SFMono-Regular, Consolas, monospace; }
#em-local-archive-controls .ema-log { margin-top: 10px; color: #065fd4; cursor: pointer; font-size: 12px; font-weight: 500; border-radius: 3px; }
#em-local-archive-controls .ema-log:hover { text-decoration: underline; }
#em-local-archive-controls .ema-footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 20px; border-top: 1px solid #ededed; background: #fafafa; color: #606060; font-size: 10px; flex: 0 0 auto; }
#em-local-archive-controls .ema-footer span:first-child { display: flex; align-items: center; gap: 5px; }
#em-local-archive-controls .ema-footer svg { width: 13px; height: 13px; }
#em-local-archive-controls[data-surface="side-panel"] { inset: 0; width: 100%; max-width: none; height: 100vh; height: 100dvh; max-height: none; border: 0; border-radius: 0; box-shadow: none; }
#em-local-archive-controls .ema-tabs { display: flex; gap: 4px; padding: 4px; margin-bottom: 20px; background: #f2f2f2; border-radius: 10px; }
#em-local-archive-controls .ema-tab { flex: 1; padding: 8px 4px; border-radius: 7px; color: #606060; cursor: pointer; font-size: 12px; font-weight: 500; text-align: center; }
#em-local-archive-controls .ema-tab[aria-selected="true"] { color: #0f0f0f; background: #fff; box-shadow: 0 1px 3px #0001; }
#em-local-archive-controls .ema-gh-connect > .ema-button { margin-top: 18px; }
#em-local-archive-controls .ema-gh-field { display: flex; flex-direction: column; gap: 5px; margin: 14px 0 10px; color: #454545; font-size: 12px; }
#em-local-archive-controls .ema-gh-field :is(input,select) { box-sizing: border-box; width: 100%; min-width: 0; height: 38px; padding: 8px 10px; color: #0f0f0f; background: #fff; border: 1px solid #ccc; border-radius: 8px; font: 13px Roboto, Arial, sans-serif; }
#em-local-archive-controls .ema-gh-field :is(input,select):disabled { color: #909090; background: #f8f8f8; }
#em-local-archive-controls .ema-gh-field select:focus-visible { outline: 2px solid #065fd4; outline-offset: 2px; }
#em-local-archive-controls .ema-gh-link { display: inline-block; margin-top: 8px; color: #065fd4; font-size: 12px; text-decoration: none; }
#em-local-archive-controls .ema-gh-link:hover { text-decoration: underline; }
#em-local-archive-controls .ema-gh-repository-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 16px; margin-top: -4px; }
#em-local-archive-controls .ema-gh-repository-actions :is(a,button) { display: inline-flex; align-items: center; min-height: 32px; margin-top: 0; }
#em-local-archive-controls .ema-gh-text-button { color: #065fd4; font-size: 12px; font-weight: 500; cursor: pointer; border-radius: 3px; }
#em-local-archive-controls .ema-gh-text-button:disabled { color: #909090; cursor: default; }
#em-local-archive-controls .ema-gh-text-button:hover:not(:disabled) { text-decoration: underline; }
#em-local-archive-controls .ema-gh-account { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-top: 18px; padding: 12px; color: #137333; background: #f3faf6; border: 1px solid #d2e7db; border-radius: 10px; font-size: 12px; }
#em-local-archive-controls .ema-gh-account > span { min-width: 0; overflow-wrap: anywhere; }
#em-local-archive-controls .ema-gh-account button { flex: 0 0 auto; }
#em-local-archive-controls .ema-gh-connected > .ema-button { margin-top: 12px; }
#em-local-archive-controls .ema-gh-actions { display: flex; gap: 8px; margin-top: 12px; }
#em-local-archive-controls .ema-gh-actions .ema-button { flex: 1; padding: 10px 8px; min-width: 0; }
#em-local-archive-controls .ema-gh-public { display: flex; align-items: flex-start; gap: 8px; margin: 12px 0; padding: 12px; background: #fff8e8; border-radius: 8px; font-size: 12px; }
#em-local-archive-controls .ema-gh-public input { margin: 3px 0 0; accent-color: #065fd4; }
#em-local-archive-controls .ema-gh-path { margin-top: 12px; font-size: 11px; color: #606060; white-space: pre-wrap; overflow-wrap: anywhere; }
#em-local-archive-controls .ema-gh-device { padding: 16px; margin-top: 16px; border: 1px solid #d6e6f7; border-radius: 12px; background: #f5f9ff; font-size: 13px; }
#em-local-archive-controls .ema-gh-device code { display: block; padding: 14px 0 8px; color: #0f0f0f; font: 600 25px/1.2 ui-monospace, Consolas, monospace; letter-spacing: 2px; }
#em-local-archive-controls .ema-gh-device .ema-button { margin: 12px 0 8px; font-size: 13px; }
#em-local-archive-controls .ema-details[open] > .ema-description { margin-top: 10px; }
@keyframes ema-spin { to { transform: rotate(360deg); } }
@media (max-width: 440px) {
  #em-local-archive-controls { top: 72px; right: 12px; max-width: calc(100vw - 24px); max-height: calc(100dvh - 84px); }
  #em-local-archive-controls .ema-header { padding: 16px; gap: 10px; }
  #em-local-archive-controls .ema-body { padding: 16px; }
  #em-local-archive-controls .ema-footer { padding: 12px 16px; }
  #em-local-archive-controls h2 { font-size: 17px; }
  #em-local-archive-controls[data-surface="side-panel"] { inset: 0; max-width: none; max-height: none; }
}
@media (prefers-reduced-motion: reduce) {
  #em-local-archive-controls .ema-status-mark { animation: none !important; }
  #em-local-archive-controls :is(.ema-button,.ema-picker) { transition: none; }
}
`;
