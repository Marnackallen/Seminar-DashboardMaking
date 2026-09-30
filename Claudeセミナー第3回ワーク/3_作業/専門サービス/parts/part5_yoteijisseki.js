/* part5：案件ごとの予定時間・実績時間（日報） */
Dashboard.addPart({
  id: "part5",
  slot: "slot2",
  title: "予定時間と実績時間（案件ごと）",
  note: "上の棒が予定時間、下の棒が実績時間です。実績が予定を超えている案件は赤で表示しています。",
  needs: ["nippo"],
  render: function (el, data) {
    var C = MiniChart.COLORS;
    var byProject = {}, order = [];
    data.nippo.forEach(function (r) {
      var k = r["案件"];
      if (!(k in byProject)) { byProject[k] = { plan: 0, actual: 0 }; order.push(k); }
      byProject[k].plan += r["予定時間"];
      byProject[k].actual += r["実績時間"];
    });
    var rows = order
      .map(function (k) { return { project: k, plan: byProject[k].plan, actual: byProject[k].actual }; })
      .sort(function (a, b) { return b.actual - a.actual; });

    var legend = document.createElement("div");
    legend.className = "mc-legend";
    [
      { label: "予定時間", color: C.series[0] },
      { label: "実績時間（予定内）", color: C.series[2] },
      { label: "実績時間（予定超過）", color: C.critical }
    ].forEach(function (s) {
      var i = document.createElement("span");
      i.innerHTML = '<i style="background:' + s.color + '"></i>' + s.label;
      legend.appendChild(i);
    });
    el.appendChild(legend);

    var NS = "http://www.w3.org/2000/svg";
    function svgEl(tag, attrs, parent) {
      var e = document.createElementNS(NS, tag);
      for (var k in attrs) e.setAttribute(k, attrs[k]);
      if (parent) parent.appendChild(e);
      return e;
    }
    // 右端だけ丸い横棒（幅が半径より狭いときは四角のまま）
    function barRect(parent, x, y, w, h, color) {
      if (w <= 0) return null;
      var r = Math.min(6, h / 2, w / 2);
      var d = w < r * 2
        ? "M" + x + "," + y + "H" + (x + w) + "V" + (y + h) + "H" + x + "Z"
        : "M" + x + "," + y + "H" + (x + w - r) + "Q" + (x + w) + "," + y + " " + (x + w) + "," + (y + r) +
          "V" + (y + h - r) + "Q" + (x + w) + "," + (y + h) + " " + (x + w - r) + "," + (y + h) + "H" + x + "Z";
      return svgEl("path", { d: d, fill: color }, parent);
    }

    var W = 1000, L = 220, R = 40, rowH = 46, pad = 10;
    var H = rows.length * rowH + pad * 2;
    var max = Math.max.apply(null, rows.map(function (r) { return Math.max(r.plan, r.actual); })) || 1;
    var scaleW = W - L - R;

    var svg = svgEl("svg", { viewBox: "0 0 " + W + " " + H, width: "100%", role: "img" });
    svg.style.display = "block";

    rows.forEach(function (r, i) {
      var yy = pad + i * rowH;
      var over = r.actual > r.plan;

      var label = svgEl("text", { x: L - 10, y: yy + 27, "text-anchor": "end", fill: C.ink2, "font-size": 14 }, svg);
      label.textContent = r.project;

      var w1 = scaleW * r.plan / max;
      var w2 = scaleW * r.actual / max;

      var planBar = barRect(svg, L, yy + 4, w1, 14, C.series[0]);
      if (planBar) svgEl("title", {}, planBar).textContent = r.project + "　予定：" + MiniChart.hours(r.plan);
      var planLabel = svgEl("text", { x: L + w1 + 8, y: yy + 15, fill: C.ink2, "font-size": 12 }, svg);
      planLabel.textContent = MiniChart.hours(r.plan);

      var actualColor = over ? C.critical : C.series[2];
      var actualBar = barRect(svg, L, yy + 22, w2, 14, actualColor);
      if (actualBar) svgEl("title", {}, actualBar).textContent =
        r.project + "　実績：" + MiniChart.hours(r.actual) + (over ? "（予定超過）" : "");
      var actualText = MiniChart.hours(r.actual) + (over ? "　予定超過 +" + MiniChart.hours(r.actual - r.plan) : "");
      var actualLabel = svgEl("text", {
        x: L + w2 + 8, y: yy + 33, fill: over ? C.critical : C.ink2, "font-size": 12,
        "font-weight": over ? 700 : 400
      }, svg);
      actualLabel.textContent = actualText;
    });

    el.appendChild(svg);
  }
});
