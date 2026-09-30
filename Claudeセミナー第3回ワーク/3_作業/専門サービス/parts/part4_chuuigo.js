/* part4：所感に注意語を含む所感が多い案件（日報） */
var PART4_KEYWORDS = ["遅れ", "遅延", "不安", "懸念", "変更", "キャンセル", "未定", "負担", "疲れ", "クレーム"];

Dashboard.addPart({
  id: "part4",
  slot: "slot1",
  title: "注意語を含む所感が多い案件",
  note: "所感に注意語（" + PART4_KEYWORDS.join("・") + "）を1つ以上含む所感が2件以上ある案件を、件数の多い順に表示しています。",
  needs: ["nippo"],
  render: function (el, data) {
    var byProject = {}, order = [];
    data.nippo.forEach(function (r) {
      var note = r["所感"];
      if (!note) return;
      var hit = PART4_KEYWORDS.some(function (w) { return note.indexOf(w) >= 0; });
      if (!hit) return;
      var key = r["案件"];
      if (!(key in byProject)) { byProject[key] = []; order.push(key); }
      byProject[key].push({ date: r["日付"], note: note });
    });

    var rows = order
      .map(function (k) { return { project: k, count: byProject[k].length, notes: byProject[k] }; })
      .filter(function (d) { return d.count >= 2; })
      .sort(function (a, b) { return b.count - a.count; });

    if (!rows.length) {
      el.innerHTML = '<p class="wait">注意語を含む所感が2件以上ある案件はありませんでした。</p>';
      return;
    }

    MiniChart.table(el, {
      columns: [
        { key: "project", label: "案件" },
        { key: "count", label: "件数", align: "right" },
        {
          key: "notes", label: "該当した所感",
          format: function (notes) {
            return '<ul style="margin:0;padding-left:18px">' + notes.map(function (n) {
              var md = n.date.slice(5).replace("-", "/");
              return "<li>" + md + "：" + n.note + "</li>";
            }).join("") + "</ul>";
          }
        }
      ],
      rows: rows
    });
  }
});
