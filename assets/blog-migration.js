/* Three independent migration charts; all data are existing group comparisons. */
(() => {
  'use strict';
  const data = window.LIFESTYLE_BLOG_MIGRATION_DATA;
  if (!data) return;
  const ns = 'http://www.w3.org/2000/svg';
  const controllers = new Map();
  const number = v => Math.abs(v) < 1e-12 ? '0.000' : `${v > 0 ? '+' : '−'}${Math.abs(v).toFixed(3)}`;
  const node = (tag, attrs = {}, text) => {
    const el = document.createElementNS(ns, tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    if (text !== undefined) el.textContent = text;
    return el;
  };
  class MigrationChart {
    constructor(root, spec) {
      this.root = root;
      this.spec = spec;
      this.selected = new Set(data.activities.map(a => a.key));
      this.index = spec.groups.length - 1;
      this.host = root.querySelector('.bm-plot');
      this.valuesAt = root.querySelector('.bm-values-at');
      this.status = root.querySelector('.bm-status');
      this.root.querySelectorAll('input[data-activity]').forEach(input => {
        input.addEventListener('change', () => {
          if (input.checked) this.selected.add(input.dataset.activity);
          else this.selected.delete(input.dataset.activity);
          this.render();
        });
      });
      root.querySelector('[data-show-all]').addEventListener('click', () => this.chooseAll(true));
      root.querySelector('[data-hide-all]').addEventListener('click', () => this.chooseAll(false));
      this.host.addEventListener('pointermove', event => {
        const rect = this.svg.getBoundingClientRect();
        const x = (event.clientX - rect.left) * this.width / rect.width;
        const y = event.clientY - rect.top;
        if (x < this.left - 14 || x > this.width - this.right + 14 || y < this.top || y > this.height - 12) return;
        this.inspect(Math.max(0, Math.min(spec.groups.length - 1,
          Math.round((x - this.left) / (this.width - this.left - this.right) * (spec.groups.length - 1)))));
      });
      root.querySelector('.bm-group-select').addEventListener('change', event => this.inspect(Number(event.target.value)));
      if (window.ResizeObserver) {
        this.observer = new ResizeObserver(() => {
          const next = Math.round(this.host.getBoundingClientRect().width);
          if (next !== this.width) this.render();
        });
        this.observer.observe(this.host);
      } else window.addEventListener('resize', () => this.render());
      this.render();
    }
    chooseAll(show) {
      this.selected = new Set(show ? data.activities.map(a => a.key) : []);
      this.root.querySelectorAll('input[data-activity]').forEach(input => { input.checked = show; });
      this.render();
    }
    inspect(index) {
      if (index === this.index) return;
      this.index = index;
      this.updateInspection();
    }
    updateInspection() {
      this.valuesAt.textContent = this.spec.labels[this.index].join(' ');
      this.root.querySelector('.bm-group-select').value = String(this.index);
      const x = this.x(this.index);
      this.guide.setAttribute('x1', x);
      this.guide.setAttribute('x2', x);
      this.svg.querySelectorAll('.bm-point').forEach(point => {
        point.setAttribute('r', Number(point.dataset.index) === this.index ? 5 : 3.2);
      });
      this.root.querySelectorAll('[data-value-for]').forEach(value => {
        const activity = value.dataset.valueFor;
        value.textContent = this.index === 0 ? 'Reference · 0' : number(this.spec.series[activity][this.index]);
      });
      this.root.querySelectorAll('label.bm-line-toggle').forEach(label => {
        label.classList.toggle('bm-muted', !this.selected.has(label.querySelector('input').dataset.activity));
      });
      const n = this.selected.size;
      this.status.textContent = n ? `${n} of 6 lifestyle lines shown` : 'Select a lifestyle above to show its line.';
    }
    render() {
      this.width = Math.max(270, Math.round(this.host.getBoundingClientRect().width));
      this.height = this.width < 500 ? 330 : 365;
      this.left = this.width < 500 ? 51 : 66;
      this.right = this.width < 500 ? 22 : 35;
      this.top = 35;
      this.bottom = this.spec.key === 'education' ? 86 : 64;
      const w = this.width, h = this.height, plotBottom = h - this.bottom;
      this.x = i => this.left + i / (this.spec.groups.length - 1) * (w - this.left - this.right);
      const y = value => this.top + (.10 - value) / .20 * (plotBottom - this.top);
      const svg = node('svg', {viewBox: `0 0 ${w} ${h}`, width: w, height: h, role: 'img', 'aria-labelledby': `bm-title-${this.spec.key} bm-desc-${this.spec.key}`});
      svg.append(node('title', {id: `bm-title-${this.spec.key}`}, `${this.spec.title}: selected lifestyle lines`));
      svg.append(node('desc', {id: `bm-desc-${this.spec.key}`}, 'Original adjusted differences in destination-minus-origin city lifestyle scores. Reference groups are set to zero. Use the checkboxes to choose lines and the group selector to read values. All charts use the same vertical scale.'));
      svg.append(node('text', {x: this.left, y: 16, class: 'bm-axis-title'}, 'Relative lifestyle shift · score units'));
      for (const tick of [-.10, -.05, 0, .05, .10]) {
        svg.append(node('line', {x1: this.left, x2: w - this.right, y1: y(tick), y2: y(tick), class: tick === 0 ? 'bm-zero' : 'bm-grid'}));
        svg.append(node('text', {x: this.left - 9, y: y(tick) + 4, 'text-anchor': 'end', class: 'bm-tick'}, tick === 0 ? '0' : `${tick > 0 ? '+' : '−'}${Math.abs(tick).toFixed(2)}`));
      }
      this.guide = node('line', {x1: this.x(this.index), x2: this.x(this.index), y1: this.top, y2: plotBottom, class: 'bm-guide'});
      svg.append(this.guide);
      this.spec.labels.forEach((parts, i) => {
        svg.append(node('line', {x1: this.x(i), x2: this.x(i), y1: plotBottom, y2: plotBottom + 5, class: 'bm-axis'}));
        const text = node('text', {x: this.x(i), y: plotBottom + 24, 'text-anchor': 'middle', class: 'bm-tick bm-group-label'});
        parts.forEach((part, j) => text.append(node('tspan', {x: this.x(i), dy: j ? 15 : 0}, part)));
        svg.append(text);
      });
      const plot = node('g', {class: 'bm-series-layer'});
      data.activities.forEach(activity => {
        if (!this.selected.has(activity.key)) return;
        const series = this.spec.series[activity.key];
        const g = node('g', {'data-series': activity.key});
        const path = series.map((value, i) => `${i ? 'L' : 'M'} ${this.x(i)} ${y(value)}`).join(' ');
        g.append(node('path', {d: path, fill: 'none', stroke: activity.color, 'stroke-width': 2.7, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', 'stroke-dasharray': activity.dash, class: 'bm-series-line'}));
        series.forEach((value, i) => {
          const point = node('circle', {cx: this.x(i), cy: y(value), r: i === this.index ? 5 : 3.2, fill: i === 0 ? '#fff' : activity.color, stroke: activity.color, 'stroke-width': i === 0 ? 1.8 : 1, class: 'bm-point', 'data-index': i, 'data-value': value});
          point.append(node('title', {}, `${activity.label} · ${this.spec.labels[i].join(' ')} · ${i === 0 ? 'reference (0)' : number(value)}`));
          g.append(point);
        });
        plot.append(g);
      });
      svg.append(plot);
      if (!this.selected.size) svg.append(node('text', {x: (this.left + w - this.right) / 2, y: (this.top + plotBottom) / 2 - 14, 'text-anchor': 'middle', class: 'bm-empty'}, 'Choose a lifestyle above'));
      this.svg = svg;
      this.host.replaceChildren(svg);
      this.updateInspection();
    }
    state() {
      return {selected: data.activities.map(a => a.key).filter(key => this.selected.has(key)), groupIndex: this.index, group: this.spec.groups[this.index], width: this.width, yDomain: [-.1, .1]};
    }
  }
  document.querySelectorAll('[data-blog-migration]').forEach(root => {
    const spec = data.charts.find(chart => chart.key === root.dataset.blogMigration);
    if (spec) controllers.set(spec.key, new MigrationChart(root, spec));
  });
  window.LIFESTYLE_BLOG_MIGRATION = Object.freeze({
    isReady: () => controllers.size === 3,
    getState: key => controllers.get(key)?.state(),
    getData: () => JSON.parse(JSON.stringify(data))
  });
})();
