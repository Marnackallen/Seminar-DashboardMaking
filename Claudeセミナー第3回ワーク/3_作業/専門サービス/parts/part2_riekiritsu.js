/* part2：利益率の推移（会計） */
Dashboard.addPart({
  id: "part2",
  slot: "slot-top",
  title: "利益率の推移",
  note: "利益率 ＝ 利益 ÷ 売上。いちばん低い月と高い月に数字を出しています。",
  needs: ["kaikei"],
  render: function (el, data) {
    var U = Dashboard.util, C = MiniChart.COLORS;
    var uri = U.byMonth(data.kaikei, function (r) { return r["区分"] === "売上" ? r["金額"] : null; });
    var hi = U.byMonth(data.kaikei, function (r) { return r["区分"] === "費用" ? r["金額"] : null; });
    var rate = uri.map(function (v, i) { return v ? (v - hi[i]) / v * 100 : 0; });
    var lo = rate.indexOf(Math.min.apply(null, rate)), top = rate.indexOf(Math.max.apply(null, rate));
    MiniChart.line(el, {
      categories: U.MONTHS,
      series: [{ name: "利益率", color: C.series[0], values: rate }],
      notes: [{ index: lo, label: MiniChart.pct(rate[lo]) }, { index: top, label: MiniChart.pct(rate[top]) }],
      axisFormat: function (v) { return MiniChart.pct(v, 0); }
    });
  }
});
