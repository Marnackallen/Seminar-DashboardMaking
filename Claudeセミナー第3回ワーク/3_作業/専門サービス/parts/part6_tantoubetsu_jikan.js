/* part6：担当者別の稼働時間（日報） */
Dashboard.addPart({
  id: "part6",
  slot: "slot3",
  title: "担当者別の稼働時間",
  note: "日報（nippo.csv）の予定時間・実績時間を担当者ごとに合計しています。",
  needs: ["nippo"],
  render: function (el, data) {
    var U = Dashboard.util, C = MiniChart.COLORS;
    var plan = U.sumBy(data.nippo, function (r) { return r["担当者"]; }, function (r) { return r["予定時間"]; });
    var actual = U.sumBy(data.nippo, function (r) { return r["担当者"]; }, function (r) { return r["実績時間"]; });
    var names = plan.map(function (d) { return d.key; });
    var planValues = plan.map(function (d) { return d.value; });
    var actualValues = actual.map(function (d) { return d.value; });

    MiniChart.groupedBar(el, {
      categories: names,
      series: [
        { name: "予定時間", color: C.series[0], values: planValues },
        { name: "実績時間", color: C.series[2], values: actualValues }
      ],
      format: MiniChart.hours
    });

    MiniChart.table(el, {
      columns: [
        { key: "name", label: "担当者" },
        { key: "plan", label: "予定時間", align: "right", format: MiniChart.hours },
        { key: "actual", label: "実績時間", align: "right", format: MiniChart.hours },
        {
          key: "diff", label: "差（実績－予定）", align: "right",
          format: function (v) { return (v > 0 ? "+" : "") + MiniChart.hours(v); }
        }
      ],
      rows: names.map(function (name, i) {
        return { name: name, plan: planValues[i], actual: actualValues[i], diff: actualValues[i] - planValues[i] };
      })
    });
  }
});
