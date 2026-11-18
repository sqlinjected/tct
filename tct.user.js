// ==UserScript==
// @name         tct
// @namespace    sqlinjected
// @version      0.1
// @description  torn time and local time in a compact window
// @match        https://www.torn.com/*
// @grant        none
// @run-at       document-end
// @noframes
// ==/UserScript==

(function () {
  'use strict';

  if (window.top !== window.self) return;

  const clockOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' };
  const tctClock = new Intl.DateTimeFormat('en-GB', { ...clockOptions, timeZone: 'UTC' });
  const localClock = new Intl.DateTimeFormat('en-GB', clockOptions);

  // datetime-local takes a date and time without a timezone.
  function inputTime(date, tct) {
    const offset = tct ? 0 : date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  }

  function convert(value, fromTct) {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return 'pick a date and time';

    const date = new Date(fromTct ? value + 'Z' : value);
    if (!Number.isFinite(date.getTime())) return 'pick a valid date and time';

    // Date can roll an invalid day or a skipped local hour forward.
    if (inputTime(date, fromTct) !== value) {
      return fromTct ? 'pick a valid date and time' : "that date or time doesn't exist locally";
    }

    const result = inputTime(date, !fromTct).replace('T', ' ');
    if (fromTct) return result + ' local';

    // If the clocks go back, Date picks the first of the two matching times.
    const tomorrow = new Date(date);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const shift = tomorrow.getTimezoneOffset() - date.getTimezoneOffset();
    const repeated = shift > 0 && inputTime(new Date(date.getTime() + shift * 60000), false) === value;
    return result + ' TCT' + (repeated ? ' (first occurrence)' : '');
  }

  function addWidget() {
    if (document.getElementById('sqlinjected-tct')) return;

    const widget = document.createElement('div');
    widget.id = 'sqlinjected-tct';
    const root = widget.attachShadow({ mode: 'open' });
    root.innerHTML = `
      <style>
        :host {
          position: fixed;
          left: max(12px, env(safe-area-inset-left));
          bottom: calc(64px + env(safe-area-inset-bottom, 0px));
          z-index: 9999;
          color: #e8ebef;
          color-scheme: dark;
          font: 14px/1.4 system-ui, sans-serif;
        }
        details {
          background: #171b20;
          border: 1px solid #3b444e;
          border-radius: 10px;
          box-shadow: 0 4px 18px #0008;
          max-height: 70vh;
          overflow: auto;
        }
        details[open] { width: min(280px, calc(100vw - 32px)); }
        summary { cursor: pointer; padding: 12px; font-weight: 650; }
        .clocks, form { display: grid; gap: 8px; padding: 0 12px 12px; }
        .clocks div { display: flex; justify-content: space-between; gap: 8px; }
        time { font-variant-numeric: tabular-nums; }
        #torn { color: #b6df8a; }
        label { display: grid; gap: 4px; min-width: 0; }
        select, input, button {
          box-sizing: border-box;
          width: 100%;
          min-width: 0;
          min-height: 44px;
          border: 1px solid #515c69;
          border-radius: 6px;
          padding: 6px 8px;
          background: #242b33;
          color: inherit;
          font: 16px system-ui, sans-serif;
        }
        button { cursor: pointer; background: #344628; }
        output:empty { display: none; }
      </style>
      <details>
        <summary>TCT</summary>
        <div class="clocks">
          <div><span>TCT</span><time id="torn"></time></div>
          <div><span>Local</span><time id="local"></time></div>
        </div>
        <form>
          <label>Direction
            <select id="direction">
              <option value="tct">TCT to local</option>
              <option value="local">Local to TCT</option>
            </select>
          </label>
          <label>Date and time
            <input id="when" type="datetime-local" required>
          </label>
          <button type="submit">Convert</button>
          <output aria-live="polite"></output>
        </form>
      </details>
    `;
    document.body.append(widget);

    const torn = root.getElementById('torn');
    const local = root.getElementById('local');
    const direction = root.getElementById('direction');
    const when = root.getElementById('when');
    const result = root.querySelector('output');
    const form = root.querySelector('form');

    function updateClocks() {
      const now = new Date();
      torn.textContent = tctClock.format(now);
      local.textContent = localClock.format(now);
      torn.dateTime = now.toISOString();
      local.dateTime = torn.dateTime;
    }

    when.value = inputTime(new Date(), true);
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      result.textContent = convert(when.value, direction.value === 'tct');
    });
    form.addEventListener('input', () => { result.textContent = ''; });

    updateClocks();
    setInterval(updateClocks, 1000);
  }

  if (document.body) addWidget();
  else document.addEventListener('DOMContentLoaded', addWidget, { once: true });
})();
