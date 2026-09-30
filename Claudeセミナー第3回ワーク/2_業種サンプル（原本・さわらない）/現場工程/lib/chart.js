/* =====================================================================
   lib/chart.js — グラフ部品（外部ライブラリなし・ネット不要）
   使い方の例は parts/ の中の既存パーツを見てください。
   すべての関数は「描き込む先の要素」と「設定」を受け取ります。
   ===================================================================== */
(function () {
  "use strict";

  // ---- 色（役割ごと）------------------------------------------------
  var COLORS = {
    series: ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"],
    critical: "#d03b3b",   // 遅れ・超過など「要注意」の印（色だけに頼らず、文字も添える）
    good: "#0ca30c",
    ink: "#0b0b0b", ink2: "#52514e", muted: "#898781",
    grid: "#e1e0d9", axis: "#c3c2b7", surface: "#fcfcfb"
  };

  // ---- 数字の見せ方 ---------------------------------------------------
  function comma(n) { return Math.round(n).toLocaleString("ja-JP"); }
  function yen(n) { return comma(n) + "円"; }
  function yenShort(n) {               // 目盛り用：740万 など
    if (Math.abs(n) >= 10000) return comma(n / 10000) + "万";
    return comma(n);
  }
  function pct(n, digits) { return n.toFixed(digits == null ? 1 : digits) + "%"; }
  function hours(n) { return Number(n).toFixed(1) + "時間"; }

  // ---- SVG の小道具 ---------------------------------------------------
  var NS = "http://www.w3.org/2000/svg";
  function svgEl(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function text(parent, x, y, str, attrs) {
    var t = svgEl("text", Object.assign({ x: x, y: y, fill: COLORS.muted, "font-size": 13 }, attrs || {}), parent);
    t.textContent = str;
    return t;
  }
  function tip(el, str) { var t = svgEl("title", {}, el); t.textContent = str; }
  // 上だけ角丸の棒（負の値は下だけ角丸）
  function barPath(x, y0, w, y1, r) {
    var up = y1 < y0, h = Math.abs(y1 - y0);
    r = Math.min(r, w / 2, h);
    if (h < 0.5) return "";
    if (up) return "M" + x + "," + y0 + "V" + (y1 + r) + "Q" + x + "," + y1 + " " + (x + r) + "," + y1 +
      "H" + (x + w - r) + "Q" + (x + w) + "," + y1 + " " + (x + w) + "," + (y1 + r) + "V" + y0 + "Z";
    return "M" + x + "," + y0 + "V" + (y1 - r) + "Q" + x + "," + y1 + " " + (x + r) + "," + y1 +
      "H" + (x + w - r) + "Q" + (x + w) + "," + y1 + " " + (x + w) + "," + (y1 - r) + "V" + y0 + "Z";
  }
  // 目盛りの刻み（1・2・2.5・5 の倍数）
  function niceStep(v) {
    if (v <= 0) return 1;
    var p = Math.pow(10, Math.floor(Math.log10(v))), m = v / p;
    return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
  }
  // 最小値・最大値から、きりのよい目盛りを作る
  function scale(lo, hi) {
    lo = Math.min(0, lo); hi = Math.max(0, hi);
    var step = niceStep((hi - lo) / 4 || 1);
    var min = Math.floor(lo / step) * step, max = Math.ceil(hi / step) * step;
    if (max === min) max = min + step;
    var ticks = [];
    for (var v = min; v <= max + step / 2; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
    return { min: min, max: max, ticks: ticks };
  }
  function legend(el, series) {
    var box = document.createElement("div");
    box.className = "mc-legend";
    series.forEach(function (s) {
      var i = document.createElement("span");
      i.innerHTML = '<i style="background:' + s.color + '"></i>' + s.name;
      box.appendChild(i);
    });
    el.appendChild(box);
  }
  function newSvg(el, w, h) {
    var svg = svgEl("svg", { viewBox: "0 0 " + w + " " + h, width: "100%", role: "img" });
    svg.style.display = "block";
    el.appendChild(svg);
    return svg;
  }

  // ---- 縦棒（複数系列を横に並べる）-----------------------------------
  // opts: { categories:[...], series:[{name,color,values:[...]}], format:fn,
  //         marks:[{index, label}] ← 指定した列の上に札を立てる }
  function groupedBar(el, opts) {
    var W = 960, H = 340, L = 64, R = 16, T = 40, B = 36;
    var fmt = opts.format || yen;
    if (opts.series.length > 1) legend(el, opts.series);
    var svg = newSvg(el, W, H);
    var all = [].concat.apply([], opts.series.map(function (s) { return s.values; }));
    var sc = scale(Math.min.apply(null, all), Math.max.apply(null, all)), max = sc.max, min = sc.min;
    var y = function (v) { return T + (max - v) / (max - min) * (H - T - B); };
    sc.ticks.forEach(function (v) {
      var yy = y(v);
      svgEl("line", { x1: L, x2: W - R, y1: yy, y2: yy, stroke: v === 0 ? COLORS.axis : COLORS.grid, "stroke-width": 1 }, svg);
      text(svg, L - 8, yy + 4, opts.axisFormat ? opts.axisFormat(v) : yenShort(v), { "text-anchor": "end", "font-size": 12 });
    });
    var n = opts.categories.length, gw = (W - L - R) / n, k = opts.series.length;
    var bw = Math.min(28, (gw * 0.72 - (k - 1) * 2) / k);
    opts.categories.forEach(function (c, ci) {
      var gx = L + gw * ci + (gw - (bw * k + (k - 1) * 2)) / 2;
      opts.series.forEach(function (s, si) {
        var val = s.values[ci];
        var p = svgEl("path", { d: barPath(gx + si * (bw + 2), y(0), bw, y(val), 4), fill: s.color }, svg);
        tip(p, c + "　" + s.name + "：" + fmt(val));
      });
      text(svg, L + gw * ci + gw / 2, H - 12, c, { "text-anchor": "middle" });
    });
    (opts.marks || []).forEach(function (m, mi) {
      var cx = L + gw * m.index + gw / 2, top = T - 26 + (mi % 2) * 0;
      var label = m.label;
      var tw = label.length * 14 + 16;
      svgEl("rect", { x: cx - tw / 2, y: top - 2, width: tw, height: 22, rx: 11, fill: m.color || COLORS.ink }, svg);
      text(svg, cx, top + 14, label, { "text-anchor": "middle", fill: "#fff", "font-size": 13, "font-weight": 700 });
    });
  }

  // ---- 折れ線 -----------------------------------------------------------
  // opts: { categories, series:[{name,color,values}], format, notes:[{index,label}] }
  function line(el, opts) {
    var W = 960, H = 280, L = 64, R = 24, T = 28, B = 36;
    var fmt = opts.format || function (v) { return pct(v); };
    if (opts.series.length > 1) legend(el, opts.series);
    var svg = newSvg(el, W, H);
    var all = [].concat.apply([], opts.series.map(function (s) { return s.values; }));
    var sc = scale(Math.min.apply(null, all), Math.max.apply(null, all)), max = sc.max, min = sc.min;
    var n = opts.categories.length, step = (W - L - R) / n;
    var x = function (i) { return L + step * i + step / 2; };
    var y = function (v) { return T + (max - v) / (max - min) * (H - T - B); };
    sc.ticks.forEach(function (v) {
      var yy = y(v);
      svgEl("line", { x1: L, x2: W - R, y1: yy, y2: yy, stroke: v === 0 ? COLORS.axis : COLORS.grid }, svg);
      text(svg, L - 8, yy + 4, opts.axisFormat ? opts.axisFormat(v) : fmt(v), { "text-anchor": "end", "font-size": 12 });
    });
    opts.categories.forEach(function (c, i) { text(svg, x(i), H - 12, c, { "text-anchor": "middle" }); });
    opts.series.forEach(function (s) {
      var d = s.values.map(function (v, i) { return (i ? "L" : "M") + x(i) + "," + y(v); }).join("");
      svgEl("path", { d: d, fill: "none", stroke: s.color, "stroke-width": 2 }, svg);
      s.values.forEach(function (v, i) {
        var c = svgEl("circle", { cx: x(i), cy: y(v), r: 4.5, fill: s.color, stroke: COLORS.surface, "stroke-width": 2 }, svg);
        tip(c, opts.categories[i] + "　" + s.name + "：" + fmt(v));
      });
    });
    (opts.notes || []).forEach(function (nt) {
      var s = opts.series[0], v = s.values[nt.index];
      text(svg, x(nt.index), y(v) - 12, nt.label, { "text-anchor": "middle", fill: COLORS.ink, "font-size": 13, "font-weight": 700 });
    });
  }

  // ---- 横棒（項目ごとの大きさ）------------------------------------------
  // opts: { items:[{label, value, color?, note?}], color, format, max?, labelWidth?, valueWidth? }
  function hbar(el, opts) {
    var fmt = opts.format || yen;
    var rowH = 34, W = 960, LBL = opts.labelWidth || 230, VAL = opts.valueWidth || 170, H = opts.items.length * rowH + 8;
    var svg = newSvg(el, W, H);
    var max = opts.max || Math.max.apply(null, opts.items.map(function (d) { return d.value; }));
    opts.items.forEach(function (d, i) {
      var yy = 4 + i * rowH, w = (W - LBL - VAL) * (d.value / max);
      text(svg, LBL - 10, yy + 21, d.label, { "text-anchor": "end", fill: COLORS.ink2, "font-size": 14 });
      var p = svgEl("path", { d: "M" + LBL + "," + (yy + 6) + "H" + (LBL + Math.max(0, w - 4)) +
        "Q" + (LBL + w) + "," + (yy + 6) + " " + (LBL + w) + "," + (yy + 10) + "V" + (yy + rowH - 10) +
        "Q" + (LBL + w) + "," + (yy + rowH - 6) + " " + (LBL + Math.max(0, w - 4)) + "," + (yy + rowH - 6) + "H" + LBL + "Z",
        fill: d.color || opts.color || COLORS.series[0] }, svg);
      tip(p, d.label + "：" + fmt(d.value));
      text(svg, LBL + w + 8, yy + 21, fmt(d.value) + (d.note ? "　" + d.note : ""), { fill: COLORS.ink, "font-size": 14 });
    });
  }

  // ---- 表 ---------------------------------------------------------------
  // opts: { columns:[{key,label,align?,format?}], rows:[{...}], rowClass?:fn }
  function table(el, opts) {
    var t = document.createElement("table");
    t.className = "mc-table";
    var h = "<thead><tr>" + opts.columns.map(function (c) {
      return '<th style="text-align:' + (c.align || "left") + '">' + c.label + "</th>";
    }).join("") + "</tr></thead><tbody>";
    opts.rows.forEach(function (r) {
      var cls = opts.rowClass ? opts.rowClass(r) : "";
      h += '<tr class="' + (cls || "") + '">' + opts.columns.map(function (c) {
        var v = r[c.key];
        return '<td style="text-align:' + (c.align || "left") + '">' + (c.format ? c.format(v, r) : (v == null ? "" : v)) + "</td>";
      }).join("") + "</tr>";
    });
    t.innerHTML = h + "</tbody>";
    el.appendChild(t);
  }

  // ---- 大きな数字（年間の合計など）------------------------------------
  // items: [{label, value(文字列)}]
  function tiles(el, items) {
    var box = document.createElement("div");
    box.className = "mc-tiles";
    items.forEach(function (it) {
      var d = document.createElement("div");
      d.className = "mc-tile";
      d.innerHTML = '<div class="mc-tile-label">' + it.label + '</div><div class="mc-tile-value">' + it.value + "</div>";
      box.appendChild(d);
    });
    el.appendChild(box);
  }

  window.MiniChart = {
    COLORS: COLORS, comma: comma, yen: yen, yenShort: yenShort, pct: pct, hours: hours,
    groupedBar: groupedBar, line: line, hbar: hbar, table: table, tiles: tiles
  };
})();
