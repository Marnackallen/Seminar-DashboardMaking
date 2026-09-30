/* part1：月別の売上・費用・利益（会計） */
Dashboard.addPart({
  id: "part1",
  slot: "slot-top",
  title: "月別の売上・費用・利益",
  note: "会計（kaikei.csv）の区分「売上」「費用」を月ごとに合計しています。",
  needs: ["kaikei"],
  render: function (el, data) {
    var U = Dashboard.util, C = MiniChart.COLORS;
    var uri = U.byMonth(data.kaikei, function (r) { return r["区分"] === "売上" ? r["金額"] : null; });
    var hi = U.byMonth(data.kaikei, function (r) { return r["区分"] === "費用" ? r["金額"] : null; });
    var ri = uri.map(function (v, i) { return v - hi[i]; });
    var sum = function (a) { return a.reduce(function (s, v) { return s + v; }, 0); };
    var yU = sum(uri), yH = sum(hi), yR = yU - yH;

    MiniChart.tiles(el, [
      { label: "年間の売上", value: MiniChart.yen(yU) },
      { label: "年間の費用", value: MiniChart.yen(yH) },
      { label: "年間の利益", value: MiniChart.yen(yR) },
      { label: "利益率", value: MiniChart.pct(yR / yU * 100) }
    ]);

    var maxU = uri.indexOf(Math.max.apply(null, uri)), maxR = ri.indexOf(Math.max.apply(null, ri));
    MiniChart.groupedBar(el, {
      categories: U.MONTHS,
      series: [
        { name: "売上", color: C.series[0], values: uri },
        { name: "費用", color: C.series[1], values: hi },
        { name: "利益", color: C.series[2], values: ri }
      ],
      marks: [{ index: maxU, label: "売上最大" }, { index: maxR, label: "利益最大" }]
    });

    MiniChart.table(el, {
      columns: [
        { key: "m", label: "月" },
        { key: "u", label: "売上", align: "right", format: MiniChart.yen },
        { key: "h", label: "費用", align: "right", format: MiniChart.yen },
        { key: "r", label: "利益", align: "right", format: MiniChart.yen },
        { key: "p", label: "利益率", align: "right", format: function (v) { return MiniChart.pct(v); } }
      ],
      rows: U.MONTHS.map(function (m, i) { return { m: m, u: uri[i], h: hi[i], r: ri[i], p: ri[i] / uri[i] * 100 }; })
    });
  }
});
