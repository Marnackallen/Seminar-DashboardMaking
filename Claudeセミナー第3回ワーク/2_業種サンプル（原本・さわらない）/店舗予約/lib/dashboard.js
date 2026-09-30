/* =====================================================================
   lib/dashboard.js — 画面の土台（データの読み込みとパーツの呼び出し）
   ・「ファイルを選ぶ」で選んだCSVを読み、data.kaikei / data.nippo / data.nyukin に入れる
   ・parts/ のパーツは Dashboard.addPart({...}) で自分を登録する
   ・データがそろったら、登録されたパーツを順に描く
   ===================================================================== */
(function () {
  "use strict";
  var parts = [];
  var data = { kaikei: null, nippo: null, nyukin: null };

  // ---- CSV を読む（先頭のBOM・ダブルクォート・改行コードに対応）------
  function parseCSV(textIn) {
    var text = textIn.replace(/^﻿/, ""), rows = [], row = [], cell = "", q = false;
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (q) {
        if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
        else if (ch === '"') q = false;
        else cell += ch;
      } else if (ch === '"') q = true;
      else if (ch === ",") { row.push(cell); cell = ""; }
      else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && text[i + 1] === "\n") i++;
        row.push(cell); cell = ""; if (row.length > 1 || row[0] !== "") rows.push(row); row = [];
      } else cell += ch;
    }
    if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
    var head = rows.shift().map(function (h) { return h.trim(); });
    return rows.map(function (r) {
      var o = {};
      head.forEach(function (h, j) { o[h] = r[j] == null ? "" : r[j]; });
      return o;
    });
  }

  // ---- どのファイルかは「列名」で見分ける（ファイル名は問わない）-------
  var NUMERIC = ["金額", "予定時間", "実績時間", "請求額"];
  function classify(rows) {
    if (!rows.length) return null;
    var cols = Object.keys(rows[0]);
    rows.forEach(function (r) {
      NUMERIC.forEach(function (k) { if (k in r && r[k] !== "") r[k] = Number(String(r[k]).replace(/,/g, "")); });
    });
    if (cols.indexOf("金額") >= 0 && cols.indexOf("勘定科目") >= 0) return "kaikei";
    if (cols.indexOf("所感") >= 0 || cols.indexOf("実績時間") >= 0) return "nippo";
    if (cols.indexOf("請求額") >= 0) return "nyukin";
    return null;
  }

  function status() {
    var names = { kaikei: "会計", nippo: "日報", nyukin: "入金" };
    return Object.keys(names).map(function (k) {
      return '<span class="' + (data[k] ? "ok" : "ng") + '">' + (data[k] ? "✓ " : "－ ") + names[k] +
        (data[k] ? "（" + data[k].length + "行）" : "（未選択）") + "</span>";
    }).join("");
  }

  // ---- 描く -------------------------------------------------------------
  function renderAll() {
    document.getElementById("load-status").innerHTML = status();
    document.querySelectorAll(".slot").forEach(function (slot) {
      slot.querySelectorAll(".card").forEach(function (c) { c.remove(); });
    });
    parts.forEach(function (p) {
      var slot = document.getElementById(p.slot);
      if (!slot) { console.warn("slot が見つかりません:", p.slot); return; }
      var card = document.createElement("section");
      card.className = "card";
      card.innerHTML = "<h3>" + p.title + "</h3>" + (p.note ? '<p class="note">' + p.note + "</p>" : "");
      var body = document.createElement("div");
      card.appendChild(body);
      slot.appendChild(card);
      var need = p.needs || [];
      var missing = need.filter(function (k) { return !data[k]; });
      if (missing.length) {
        body.innerHTML = '<p class="wait">このパーツには ' + missing.map(function (k) {
          return { kaikei: "会計（kaikei.csv）", nippo: "日報（nippo.csv）", nyukin: "入金（nyukin.csv）" }[k];
        }).join("・") + " が必要です。上の「ファイルを選ぶ」から選んでください。</p>";
        return;
      }
      try { p.render(body, data); }
      catch (e) { body.innerHTML = '<p class="err">このパーツの表示でエラーが出ました：' + e.message + "</p>"; console.error(e); }
    });
    document.querySelectorAll(".slot").forEach(function (slot) {
      var empty = slot.querySelector(".empty");
      if (empty) empty.style.display = slot.querySelector(".card") ? "none" : "";
    });
  }

  function onFiles(files) {
    var list = Array.prototype.slice.call(files), left = list.length;
    list.forEach(function (f) {
      var r = new FileReader();
      r.onload = function () {
        var rows = parseCSV(r.result), kind = classify(rows);
        if (kind) data[kind] = rows;
        else alert(f.name + " は、読めない形式でした（列名を確認してください）");
        if (--left === 0) renderAll();
      };
      r.readAsText(f, "utf-8");
    });
  }

  window.Dashboard = {
    // パーツの登録。{ id, slot:"slot-top"|"slot1"|"slot2", title, note?, needs:["nippo",...], render(el, data) }
    addPart: function (p) { parts.push(p); },
    util: {
      // 月（1〜12）ごとに合計する
      byMonth: function (rows, pick) {
        var m = new Array(12).fill(0);
        rows.forEach(function (r) { var k = pick(r); if (k != null) m[Number(r["日付"].slice(5, 7)) - 1] += k; });
        return m;
      },
      // キーごとに合計する（出てきた順を保つ）
      sumBy: function (rows, keyFn, valFn) {
        var o = {}, order = [];
        rows.forEach(function (r) { var k = keyFn(r); if (!(k in o)) { o[k] = 0; order.push(k); } o[k] += valFn(r); });
        return order.map(function (k) { return { key: k, value: o[k] }; });
      },
      MONTHS: ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"]
    },
    start: function () {
      var input = document.getElementById("file-input");
      input.addEventListener("change", function () { onFiles(input.files); });
      if (window.EMBEDDED_DATA) {           // データを埋め込んだ見本用
        ["kaikei", "nippo", "nyukin"].forEach(function (k) {
          if (window.EMBEDDED_DATA[k]) { data[k] = parseCSV(window.EMBEDDED_DATA[k]); classify(data[k]); }
        });
      }
      renderAll();
    }
  };
})();
