/* part3：費用の勘定科目別の内訳（会計・1年分） */
var PART3_BAR_COLOR = "#2a78d6";   // 横棒の色

Dashboard.addPart({
  id: "part3",
  slot: "slot-top",
  title: "費用の内訳（勘定科目別・年間）",
  note: "金額の大きい順。賞与・修繕費のように、特定の月にまとまって出る費用もあります。",
  needs: ["kaikei"],
  render: function (el, data) {
    var rows = data.kaikei.filter(function (r) { return r["区分"] === "費用"; });
    var items = Dashboard.util.sumBy(rows, function (r) { return r["勘定科目"]; }, function (r) { return r["金額"]; })
      .sort(function (a, b) { return b.value - a.value; })
      .map(function (d) { return { label: d.key, value: d.value }; });
    MiniChart.hbar(el, { items: items, color: PART3_BAR_COLOR });
  }
});
