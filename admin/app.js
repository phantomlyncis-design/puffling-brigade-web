// ---------------------------------------------------------------------------
// app.js - หน้าแอดมิน PUFFLING BRIGADE
//
// ไม่มี framework ไม่มี build step คุยกับ Supabase ด้วย fetch ล้วน ๆ
// เปิดไฟล์ index.html ผ่านเว็บเซิร์ฟเวอร์ก็ใช้งานได้เลย
//
// เรื่องความปลอดภัย: ไฟล์นี้ใช้ publishable key ตัวเดียวกับในเกม ไม่มีกุญแจพิเศษ
// สิทธิ์แอดมินมาจากการที่บัญชีอยู่ในตาราง admins ซึ่งฐานข้อมูลเป็นคนตรวจ (RLS)
// เอาหน้านี้ไปวางบนเว็บสาธารณะได้โดยไม่เสี่ยง
// ---------------------------------------------------------------------------

(function () {
  "use strict";

  var CFG = window.PUFFLING_CONFIG || { url: "", anonKey: "" };
  var SESSION_KEY = "puffling_admin_session";

  // รหัสตัวละครทั้ง 24 ตัว (ต้องตรงกับ Editor/GameContent.cs ในโปรเจกต์เกม)
  var UNIT_IDS = [
    "c_pui", "c_bai", "c_hin", "c_kha", "c_yod", "c_nok", "c_hoi", "c_rakhang",
    "r_pluk", "r_wan", "r_raak", "r_khem", "r_thanu", "r_pao", "r_klong", "r_mon",
    "s_mangkorn", "s_tao", "s_wan", "s_yiao", "s_kaew",
    "u_rachan", "u_wayu", "u_niran"
  ];

  var playerCache = [];   // { id, username } ไว้แปลงชื่อเป็นรหัสตอนส่งจดหมายถึงคนเดียว

  var session = null;   // { access_token, refresh_token, expires_at, email, user_id }

  // ------------------------------------------------------------------
  // ตัวช่วยเล็ก ๆ
  // ------------------------------------------------------------------

  function $(id) { return document.getElementById(id); }

  function esc(s) {
    return String(s === null || s === undefined ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function say(el, text, kind) {
    if (!el) return;
    el.textContent = text || "";
    el.className = "msg" + (kind ? " " + kind : "");
  }

  function thaiDate(iso) {
    if (!iso) return "—";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleString("th-TH", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
  }

  function configured() {
    return CFG.url && CFG.anonKey && CFG.url.indexOf("https://") === 0;
  }

  // ------------------------------------------------------------------
  // เรียก API
  // ------------------------------------------------------------------

  function headers(extra) {
    var h = { "apikey": CFG.anonKey, "Content-Type": "application/json" };
    // publishable key แบบใหม่ไม่ใช่ JWT ห้ามยัดลง Authorization
    if (session && session.access_token) h["Authorization"] = "Bearer " + session.access_token;
    else if (CFG.anonKey.indexOf("eyJ") === 0) h["Authorization"] = "Bearer " + CFG.anonKey;
    if (extra) for (var k in extra) h[k] = extra[k];
    return h;
  }

  async function call(path, options) {
    options = options || {};
    var res = await fetch(CFG.url.replace(/\/+$/, "") + path, {
      method: options.method || "GET",
      headers: headers(options.headers),
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    var text = await res.text();
    var data = null;
    if (text) { try { data = JSON.parse(text); } catch (e) { data = text; } }

    if (!res.ok) {
      var m = (data && (data.message || data.msg || data.error_description || data.error || data.hint)) || text;
      throw new Error(m || ("เซิร์ฟเวอร์ตอบรหัส " + res.status));
    }
    return { data: data, headers: res.headers };
  }

  var rest = function (q, o) { return call("/rest/v1/" + q, o); };
  var auth = function (p, o) { return call("/auth/v1/" + p, o); };

  // ------------------------------------------------------------------
  // เข้าสู่ระบบ
  // ------------------------------------------------------------------

  function saveSession() {
    try {
      if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      else localStorage.removeItem(SESSION_KEY);
    } catch (e) { /* โหมดส่วนตัวของเบราว์เซอร์เขียนไม่ได้ ไม่เป็นไร */ }
  }

  function loadSession() {
    try {
      var raw = localStorage.getItem(SESSION_KEY);
      session = raw ? JSON.parse(raw) : null;
    } catch (e) { session = null; }
  }

  async function signIn(email, password) {
    var r = await auth("token?grant_type=password", {
      method: "POST",
      body: { email: email, password: password }
    });
    session = {
      access_token: r.data.access_token,
      refresh_token: r.data.refresh_token,
      expires_at: Math.floor(Date.now() / 1000) + (r.data.expires_in || 3600),
      email: r.data.user ? r.data.user.email : email,
      user_id: r.data.user ? r.data.user.id : ""
    };
    saveSession();
  }

  async function refreshIfNeeded() {
    if (!session) return false;
    if (session.expires_at - 60 > Math.floor(Date.now() / 1000)) return true;
    try {
      var saved = session;
      session = null;   // ส่งคำขอต่ออายุโดยไม่แนบโทเคนเก่าที่หมดอายุแล้ว
      var r = await auth("token?grant_type=refresh_token", {
        method: "POST",
        body: { refresh_token: saved.refresh_token }
      });
      session = {
        access_token: r.data.access_token,
        refresh_token: r.data.refresh_token,
        expires_at: Math.floor(Date.now() / 1000) + (r.data.expires_in || 3600),
        email: saved.email,
        user_id: saved.user_id
      };
      saveSession();
      return true;
    } catch (e) {
      session = null;
      saveSession();
      return false;
    }
  }

  async function isAdmin() {
    var r = await rest("rpc/is_admin", { method: "POST", body: {} });
    return r.data === true;
  }

  function signOut() {
    if (session) auth("logout", { method: "POST", body: {} }).catch(function () {});
    session = null;
    saveSession();
    showLogin("ออกจากระบบแล้ว", "wait");
  }

  // ------------------------------------------------------------------
  // บันทึกการกระทำ
  // ------------------------------------------------------------------

  async function logAction(action, target, detail) {
    if (!session) return;
    try {
      await rest("admin_log", {
        method: "POST",
        body: {
          admin_id: session.user_id,
          action: action,
          target: target || "",
          detail: detail || ""
        }
      });
    } catch (e) {
      console.warn("บันทึกการกระทำไม่สำเร็จ:", e.message);
    }
  }

  // ------------------------------------------------------------------
  // สลับหน้า
  // ------------------------------------------------------------------

  function showLogin(message, kind) {
    $("appPage").hidden = true;
    $("loginPage").hidden = false;
    if (message) say($("loginMsg"), message, kind || "");
  }

  function showApp() {
    $("loginPage").hidden = true;
    $("appPage").hidden = false;
    $("whoEmail").textContent = session ? session.email : "";
    loadDashboard();
    loadNews();
    loadPlayers("");
    loadMail();
    loadLog();
    fillUnitList();
  }

  function setupTabs() {
    var buttons = document.querySelectorAll("nav.tabs button");
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener("click", function () {
        var name = this.getAttribute("data-page");
        for (var j = 0; j < buttons.length; j++) buttons[j].classList.remove("on");
        this.classList.add("on");
        var pages = document.querySelectorAll("section.page");
        for (var k = 0; k < pages.length; k++) pages[k].classList.remove("on");
        var page = $("page-" + name);
        if (page) page.classList.add("on");
      });
    }
  }

  // ------------------------------------------------------------------
  // แดชบอร์ด
  // ------------------------------------------------------------------

  async function loadDashboard() {
    try {
      var r = await rest("rpc/admin_dashboard", { method: "POST", body: {} });
      var d = r.data || {};
      var cards = [
        { k: "ผู้เล่นทั้งหมด",        n: d.players_total },
        { k: "สมัครวันนี้",           n: d.players_today },
        { k: "สมัครใน 7 วัน",         n: d.players_week },
        { k: "เปิดเซฟข้ามเครื่อง",    n: d.saves_total },
        { k: "เล่นใน 7 วัน",          n: d.saves_active_week },
        { k: "เลเวลเฉลี่ย",           n: d.avg_level },
        { k: "ด่านที่ผ่านเฉลี่ย",     n: d.avg_stages },
        { k: "ประกาศที่แสดงอยู่",     n: d.announcements_active },
        { k: "แอดมิน",                n: d.admins_total }
      ];
      $("statCards").innerHTML = cards.map(function (c) {
        return '<div class="card"><div class="n">' + esc(c.n === undefined ? "—" : c.n) +
               '</div><div class="k">' + esc(c.k) + "</div></div>";
      }).join("");
    } catch (e) {
      $("statCards").innerHTML = '<div class="card"><div class="k">โหลดตัวเลขไม่ได้: ' + esc(e.message) + "</div></div>";
    }

    try {
      var p = await rest("profiles?select=id,username,created_at&order=created_at.desc&limit=10");
      $("recentPlayers").innerHTML = playerTable(p.data, false);
    } catch (e) {
      $("recentPlayers").innerHTML = '<div class="empty">' + esc(e.message) + "</div>";
    }

    loadFunnel();
  }

  async function loadFunnel() {
    try {
      var r = await rest("rpc/admin_progress_funnel", { method: "POST", body: {} });
      var rows = r.data || [];
      if (!rows.length) {
        $("funnelList").innerHTML =
          '<div class="empty">ยังไม่มีใครเปิดเซฟข้ามเครื่อง — ตัวเลขจะขึ้นเมื่อมีผู้เล่นเปิดใช้</div>';
        return;
      }

      var max = 0;
      for (var i = 0; i < rows.length; i++) max = Math.max(max, Number(rows[i].players));

      $("funnelList").innerHTML =
        "<table><thead><tr><th>ไปถึงด่าน</th><th>ผู้เล่น</th>" +
        '<th style="width:45%">สัดส่วน</th></tr></thead><tbody>' +
        rows.map(function (f) {
          var n = Number(f.players);
          var pct = max > 0 ? Math.round(n / max * 100) : 0;
          return "<tr><td>" + esc(f.furthest_stage) + "</td>" +
            '<td class="num">' + n + "</td>" +
            '<td><div style="background:var(--mint);height:14px;border-radius:7px;width:' +
              Math.max(pct, 3) + '%"></div></td></tr>';
        }).join("") + "</tbody></table>";
    } catch (e) {
      $("funnelList").innerHTML = '<div class="empty">' + esc(e.message) + "</div>";
    }
  }

  // ------------------------------------------------------------------
  // ประกาศ
  // ------------------------------------------------------------------

  async function loadNews() {
    try {
      var r = await rest("announcements?select=*&order=sort.desc,created_at.desc&limit=100");
      var rows = r.data || [];
      if (!rows.length) { $("newsList").innerHTML = '<div class="empty">ยังไม่มีประกาศ</div>'; return; }

      $("newsList").innerHTML =
        "<table><thead><tr><th>สถานะ</th><th>ป้าย</th><th>หัวข้อ</th>" +
        '<th class="num">ลำดับ</th><th>สร้างเมื่อ</th><th class="num">จัดการ</th></tr></thead><tbody>' +
        rows.map(function (a) {
          var expired = a.ends_at && new Date(a.ends_at) <= new Date();
          var live = a.active && !expired;
          return "<tr>" +
            '<td><span class="tag ' + (live ? "on" : "off") + '">' +
              (live ? "แสดงอยู่" : (expired ? "หมดอายุ" : "ปิดไว้")) + "</span></td>" +
            "<td>" + esc(a.tag) + "</td>" +
            "<td>" + esc(a.title) + "</td>" +
            '<td class="num">' + esc(a.sort) + "</td>" +
            "<td>" + esc(thaiDate(a.created_at)) + "</td>" +
            '<td class="num">' +
              '<button class="btn ghost small" data-edit="' + a.id + '">แก้ไข</button> ' +
              '<button class="btn ghost small" data-toggle="' + a.id + '">' + (a.active ? "ปิด" : "เปิด") + "</button> " +
              '<button class="btn warn small" data-del="' + a.id + '">ลบ</button>' +
            "</td></tr>";
        }).join("") + "</tbody></table>";

      wire("[data-edit]", "data-edit", function (id) { editNews(rows, id); });
      wire("[data-toggle]", "data-toggle", function (id) { toggleNews(rows, id); });
      wire("[data-del]", "data-del", function (id) { deleteNews(rows, id); });
    } catch (e) {
      $("newsList").innerHTML = '<div class="empty">' + esc(e.message) + "</div>";
    }
  }

  function wire(selector, attr, fn) {
    var els = document.querySelectorAll(selector);
    for (var i = 0; i < els.length; i++) {
      els[i].addEventListener("click", function () { fn(this.getAttribute(attr)); });
    }
  }

  function findById(rows, id) {
    for (var i = 0; i < rows.length; i++) if (String(rows[i].id) === String(id)) return rows[i];
    return null;
  }

  function editNews(rows, id) {
    var a = findById(rows, id);
    if (!a) return;
    $("newsId").value = a.id;
    $("newsTag").value = a.tag || "";
    $("newsColor").value = a.color || "sun";
    $("newsSort").value = a.sort || 0;
    $("newsTitle").value = a.title || "";
    $("newsBody").value = a.body || "";
    $("newsActive").checked = !!a.active;
    $("newsEnds").value = a.ends_at ? new Date(a.ends_at).toISOString().slice(0, 16) : "";
    $("newsFormTitle").textContent = "แก้ไขประกาศ #" + a.id;
    $("newsCancelBtn").hidden = false;
    say($("newsMsg"), "", "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function clearNewsForm() {
    $("newsId").value = "";
    $("newsTag").value = "ประกาศ";
    $("newsColor").value = "sun";
    $("newsSort").value = 0;
    $("newsTitle").value = "";
    $("newsBody").value = "";
    $("newsActive").checked = true;
    $("newsEnds").value = "";
    $("newsFormTitle").textContent = "เขียนประกาศใหม่";
    $("newsCancelBtn").hidden = true;
  }

  async function saveNews() {
    var title = $("newsTitle").value.trim();
    if (!title) { say($("newsMsg"), "ใส่หัวข้อด้วย", "err"); return; }

    var payload = {
      tag: $("newsTag").value.trim() || "ประกาศ",
      title: title,
      body: $("newsBody").value,
      color: $("newsColor").value,
      sort: parseInt($("newsSort").value, 10) || 0,
      active: $("newsActive").checked,
      ends_at: $("newsEnds").value ? new Date($("newsEnds").value).toISOString() : null
    };

    var id = $("newsId").value;
    $("newsSaveBtn").disabled = true;
    say($("newsMsg"), "กำลังบันทึก…", "wait");
    try {
      if (id) {
        await rest("announcements?id=eq." + encodeURIComponent(id), { method: "PATCH", body: payload });
        await logAction("แก้ประกาศ", "announcement:" + id, title);
      } else {
        await rest("announcements", {
          method: "POST",
          headers: { "Prefer": "return=representation" },
          body: payload
        });
        await logAction("เพิ่มประกาศ", "announcement", title);
      }
      say($("newsMsg"), "บันทึกแล้ว", "ok");
      clearNewsForm();
      loadNews();
      loadDashboard();
      loadLog();
    } catch (e) {
      say($("newsMsg"), friendly(e.message), "err");
    } finally {
      $("newsSaveBtn").disabled = false;
    }
  }

  async function toggleNews(rows, id) {
    var a = findById(rows, id);
    if (!a) return;
    try {
      await rest("announcements?id=eq." + encodeURIComponent(id), {
        method: "PATCH", body: { active: !a.active }
      });
      await logAction(a.active ? "ปิดประกาศ" : "เปิดประกาศ", "announcement:" + id, a.title);
      loadNews();
      loadDashboard();
      loadLog();
    } catch (e) {
      say($("newsMsg"), friendly(e.message), "err");
    }
  }

  async function deleteNews(rows, id) {
    var a = findById(rows, id);
    if (!a) return;
    if (!confirm('ลบประกาศ "' + a.title + '" ถาวร?\n\nกู้คืนไม่ได้ ถ้าแค่อยากซ่อนให้กดปุ่ม "ปิด" แทน')) return;
    try {
      await rest("announcements?id=eq." + encodeURIComponent(id), { method: "DELETE" });
      await logAction("ลบประกาศ", "announcement:" + id, a.title);
      loadNews();
      loadDashboard();
      loadLog();
    } catch (e) {
      say($("newsMsg"), friendly(e.message), "err");
    }
  }

  // ------------------------------------------------------------------
  // ผู้เล่น
  // ------------------------------------------------------------------

  function n0(v) { return Number(v || 0).toLocaleString("th-TH"); }

  // ตารางบนแดชบอร์ด (ไม่มีปุ่ม) ยังใช้รูปแบบเดิมที่มีแค่ชื่อกับวันสมัคร
  function playerTable(rows, withActions) {
    if (!rows || !rows.length) return '<div class="empty">ไม่พบผู้เล่น</div>';
    return "<table><thead><tr><th>ชื่อในเกม</th><th>สมัครเมื่อ</th>" +
      (withActions ? '<th class="num">จัดการ</th>' : "") +
      "</tr></thead><tbody>" +
      rows.map(function (p) {
        return "<tr><td>" + esc(p.username) + "</td>" +
          "<td>" + esc(thaiDate(p.created_at)) + "</td>" +
          (withActions
            ? '<td class="num"><button class="btn ghost small" data-rename="' + esc(p.id) +
              '" data-name="' + esc(p.username) + '">เปลี่ยนชื่อ</button></td>'
            : "") +
          "</tr>";
      }).join("") + "</tbody></table>";
  }

  // ตารางในแท็บผู้เล่น — เห็นตัวเลขจริงทั้งหมด
  function playerFullTable(rows) {
    if (!rows || !rows.length) return '<div class="empty">ไม่พบผู้เล่น</div>';
    return "<table><thead><tr>" +
      "<th>ชื่อในเกม</th><th class='num'>เลเวล</th><th class='num'>เหรียญ</th>" +
      "<th class='num'>คริสตัล</th><th class='num'>ตัวละคร</th><th class='num'>ด่าน</th>" +
      "<th class='num'>พลัง</th><th>ข้อมูลล่าสุด</th><th class='num'>จัดการ</th>" +
      "</tr></thead><tbody>" +
      rows.map(function (p) {
        var noSave = !p.has_save;
        return "<tr>" +
          "<td>" + esc(p.username) +
            '<div class="note">' + esc(String(p.user_id).slice(0, 8)) + "…</div></td>" +
          (noSave
            ? '<td colspan="7" class="note">ยังไม่ได้เปิดเซฟข้ามเครื่อง — แก้ไม่ได้ ใช้จดหมายแทน</td>'
            : '<td class="num">' + n0(p.level) + "</td>" +
              '<td class="num">' + n0(p.coins) + "</td>" +
              '<td class="num">' + n0(p.crystals) + "</td>" +
              '<td class="num">' + n0(p.characters_owned) + "</td>" +
              '<td class="num">' + n0(p.stages_cleared) + "</td>" +
              '<td class="num">' + n0(p.power) + "</td>" +
              "<td>" + esc(thaiDate(p.updated_at)) + "</td>") +
          '<td class="num">' +
            (noSave ? "" : '<button class="btn ghost small" data-edit="' + esc(p.user_id) + '">แก้ไข</button> ') +
            '<button class="btn ghost small" data-rename="' + esc(p.user_id) +
              '" data-name="' + esc(p.username) + '">เปลี่ยนชื่อ</button>' +
          "</td></tr>";
      }).join("") + "</tbody></table>";
  }

  async function loadPlayers(term) {
    try {
      var r = await rest("rpc/admin_player_list", {
        method: "POST",
        body: { p_search: term || "", p_limit: 50 }
      });
      var rows = r.data || [];

      // กล่องเลือกผู้เล่นตอนส่งจดหมายใช้รูปแบบเดิม {id, username}
      playerCache = rows.map(function (p) { return { id: p.user_id, username: p.username }; });
      fillPlayerList();

      $("playerList").innerHTML = playerFullTable(rows);
      wire("[data-rename]", "data-rename", function (id) {
        $("renameId").value = id;
        var btn = document.querySelector('[data-rename="' + id + '"]');
        $("renameTo").value = btn ? btn.getAttribute("data-name") : "";
        $("renameTo").focus();
      });
      wire("[data-edit]", "data-edit", function (id) { openEditor(id); });

      say($("playerMsg"), rows.length ? "พบ " + rows.length + " คน" : "ไม่พบผู้เล่นที่ตรงกับคำค้น", "wait");
    } catch (e) {
      $("playerList").innerHTML = '<div class="empty">' + esc(friendly(e.message)) + "</div>";
    }
  }

  // ------------------------------------------------------------------
  // แก้ข้อมูลผู้เล่น
  //
  // ดึงค่าปัจจุบันมาใส่เป็น placeholder ไม่ใช่ value
  // เพื่อให้ "ช่องว่าง = ไม่แตะ" เป็นจริง แอดมินจะได้ไม่เผลอเขียนทับค่าที่ไม่ได้ตั้งใจแก้
  // ------------------------------------------------------------------

  var editing = null;
  var EDIT_FIELDS = [
    { el: "editLevel",    key: "level",     arg: "p_level",     max: 9999,      name: "เลเวล",   min: 1 },
    { el: "editExp",      key: "exp",       arg: "p_exp",       max: 999999999, name: "EXP" },
    { el: "editCoins",    key: "coins",     arg: "p_coins",     max: 999999999, name: "เหรียญ" },
    { el: "editCrystals", key: "crystals",  arg: "p_crystals",  max: 9999999,   name: "คริสตัล" },
    { el: "editChips",    key: "exp_chips", arg: "p_exp_chips", max: 999999999, name: "ชิป EXP" },
    { el: "editStamina",  key: "stamina",   arg: "p_stamina",   max: 9999,      name: "สแตมิน่า" }
  ];

  async function openEditor(userId) {
    say($("editMsg"), "กำลังดึงข้อมูล…", "wait");
    try {
      var r = await rest("rpc/admin_player_detail", { method: "POST", body: { p_user: userId } });
      var d = r.data;
      if (!d) { say($("editMsg"), "ไม่พบผู้เล่นคนนี้", "err"); return; }
      if (!d.has_save) {
        $("editForm").style.display = "none";
        $("editWho").textContent = d.username + " ยังไม่ได้เปิดเซฟข้ามเครื่อง — ส่งของให้ทางจดหมายแทนได้";
        say($("editMsg"), "", "");
        return;
      }

      editing = d;
      $("editId").value = d.user_id;
      $("editName").value = d.username + (d.in_game_name ? "  (ในเกม: " + d.in_game_name + ")" : "");
      $("editWho").innerHTML =
        "<b>" + esc(d.username) + "</b> · ตัวละคร " + n0(d.characters_owned) +
        " · ผ่าน " + n0(d.stages_cleared) + " ด่าน · ดาว " + n0(d.total_stars) +
        " · พลัง " + n0(d.power) +
        '<div class="note">อัปเดตล่าสุด ' + esc(thaiDate(d.updated_at)) +
        " · เครื่อง " + esc(d.device || "ไม่ทราบ") +
        " · แอดมินเคยแก้ " + n0(d.admin_rev) + " ครั้ง</div>";

      EDIT_FIELDS.forEach(function (f) {
        var el = $(f.el);
        el.value = "";
        el.placeholder = "ตอนนี้ " + n0(d[f.key]) + " (เว้นว่าง = ไม่แก้)";
      });
      $("editReason").value = "";
      $("editForm").style.display = "";
      say($("editMsg"), "ดึงค่าปัจจุบันแล้ว แก้เฉพาะช่องที่ต้องการ", "ok");
    } catch (e) {
      say($("editMsg"), friendly(e.message), "err");
    }
  }

  async function saveEditor() {
    if (!editing) { say($("editMsg"), "ยังไม่ได้เลือกผู้เล่น", "err"); return; }

    var body = { p_user: editing.user_id, p_reason: $("editReason").value.trim() };
    var summary = [];

    for (var i = 0; i < EDIT_FIELDS.length; i++) {
      var f = EDIT_FIELDS[i];
      var raw = $(f.el).value.trim();
      if (raw === "") continue;

      var v = Number(raw);
      if (!isFinite(v)) { say($("editMsg"), f.name + ": ใส่ได้เฉพาะตัวเลข", "err"); return; }
      var lo = f.min === undefined ? 0 : f.min;
      if (v < lo || v > f.max) {
        say($("editMsg"), f.name + " ใส่ได้ " + n0(lo) + "–" + n0(f.max), "err");
        return;
      }
      body[f.arg] = v;
      summary.push(f.name + " → " + n0(v));
    }

    if (!summary.length) { say($("editMsg"), "ยังไม่ได้กรอกช่องไหนเลย", "err"); return; }
    if (!confirm("แก้ข้อมูลของ " + editing.username + " ?\n\n" + summary.join("\n"))) return;

    say($("editMsg"), "กำลังบันทึก…", "wait");
    try {
      var r = await rest("rpc/admin_update_player", { method: "POST", body: body });
      var res = r.data || {};
      if (!res.ok) { say($("editMsg"), res.error || "บันทึกไม่สำเร็จ", "err"); return; }
      say($("editMsg"), "บันทึกแล้ว: " + res.changed + " — " + res.note, "ok");
      await openEditor(editing.user_id);
      loadPlayers($("playerSearch").value.trim());
    } catch (e) {
      say($("editMsg"), friendly(e.message), "err");
    }
  }

  async function renamePlayer() {
    var id = $("renameId").value.trim();
    var name = $("renameTo").value.trim();
    if (!id) { say($("renameMsg"), "ยังไม่ได้เลือกผู้เล่น", "err"); return; }
    if (name.length < 3 || name.length > 16) { say($("renameMsg"), "ชื่อต้องยาว 3-16 ตัวอักษร", "err"); return; }
    if (!confirm('เปลี่ยนชื่อผู้เล่นคนนี้เป็น "' + name + '" ?')) return;

    say($("renameMsg"), "กำลังเปลี่ยน…", "wait");
    try {
      await rest("profiles?id=eq." + encodeURIComponent(id), {
        method: "PATCH", body: { username: name, updated_at: new Date().toISOString() }
      });
      await logAction("เปลี่ยนชื่อผู้เล่น", "profile:" + id, "เป็น " + name);
      say($("renameMsg"), "เปลี่ยนชื่อแล้ว", "ok");
      $("renameId").value = "";
      $("renameTo").value = "";
      loadPlayers($("playerSearch").value.trim());
      loadLog();
    } catch (e) {
      say($("renameMsg"), friendly(e.message), "err");
    }
  }

  // ------------------------------------------------------------------
  // จดหมาย
  // ------------------------------------------------------------------

  function fillUnitList() {
    var dl = $("unitIds");
    if (!dl) return;
    dl.innerHTML = UNIT_IDS.map(function (id) { return '<option value="' + id + '">'; }).join("");
  }

  function fillPlayerList() {
    var dl = $("playerNames");
    if (!dl) return;
    dl.innerHTML = playerCache.map(function (p) {
      return '<option value="' + esc(p.username) + '">';
    }).join("");
  }

  function clearMailForm() {
    ["mailTitle", "mailBody", "mailUnit", "mailShardUnit", "mailTarget"].forEach(function (id) {
      if ($(id)) $(id).value = "";
    });
    ["mailCoins", "mailCrystals", "mailChips", "mailStamina", "mailShardCount",
     "mailPlayerExp"].forEach(function (id) {
      if ($(id)) $(id).value = 0;
    });
    $("mailExpires").value = "";
    $("mailAudience").value = "all";
    $("mailTargetWrap").hidden = true;
    say($("mailMsg"), "", "");
  }

  async function sendMail() {
    var title = $("mailTitle").value.trim();
    if (!title) { say($("mailMsg"), "ใส่หัวข้อด้วย", "err"); return; }

    var audience = $("mailAudience").value;
    var targetUser = null;

    if (audience === "user") {
      var name = $("mailTarget").value.trim();
      if (!name) { say($("mailMsg"), "ใส่ชื่อผู้รับด้วย", "err"); return; }
      var found = null;
      for (var i = 0; i < playerCache.length; i++) {
        if (playerCache[i].username.toLowerCase() === name.toLowerCase()) { found = playerCache[i]; break; }
      }
      if (!found) {
        say($("mailMsg"), 'ไม่พบผู้เล่นชื่อ "' + name + '" — ลองค้นในแท็บผู้เล่นก่อน', "err");
        return;
      }
      targetUser = found.id;
    }

    var num = function (id) { return Math.max(0, parseInt($(id).value, 10) || 0); };

    // ขีดจำกัดต้องตรงกับ check constraint ใน supabase/005_mail.sql เป๊ะ ๆ
    // ตรวจที่นี่ก่อน จะได้ไม่ต้องให้ผู้ใช้ไปเจอข้อความดิบของ Postgres
    var LIMITS = [
      { id: "mailCoins",      max: 99999999, name: "เหรียญ" },
      { id: "mailCrystals",   max: 9999999,  name: "คริสตัล" },
      { id: "mailChips",      max: 9999999,  name: "ชิป EXP" },
      { id: "mailStamina",    max: 9999,     name: "สแตมิน่า" },
      { id: "mailShardCount", max: 99999,    name: "จำนวนเศษ" },
      { id: "mailPlayerExp",  max: 999999999, name: "EXP ผู้เล่น" }
    ];
    for (var L = 0; L < LIMITS.length; L++) {
      var raw = $(LIMITS[L].id).value.trim();
      var v = parseInt(raw, 10);
      if (raw !== "" && (isNaN(v) || v < 0)) {
        say($("mailMsg"), LIMITS[L].name + " ต้องเป็นตัวเลขไม่ติดลบ", "err");
        $(LIMITS[L].id).focus();
        return;
      }
      if (v > LIMITS[L].max) {
        say($("mailMsg"),
            LIMITS[L].name + " ใส่ได้มากสุด " + LIMITS[L].max.toLocaleString() +
            " (ใส่มา " + v.toLocaleString() + ")", "err");
        $(LIMITS[L].id).focus();
        return;
      }
    }

    var payload = {
      audience: audience,
      target_user: targetUser,
      title: title,
      body: $("mailBody").value,
      coins: num("mailCoins"),
      crystals: num("mailCrystals"),
      exp_chips: num("mailChips"),
      stamina: num("mailStamina"),
      player_exp: num("mailPlayerExp"),
      unit_id: $("mailUnit").value.trim(),
      shard_unit_id: $("mailShardUnit").value.trim(),
      shard_count: num("mailShardCount"),
      expires_at: $("mailExpires").value ? new Date($("mailExpires").value).toISOString() : null,
      created_by: session ? session.user_id : null
    };

    if (payload.unit_id && UNIT_IDS.indexOf(payload.unit_id) < 0) {
      say($("mailMsg"), 'ไม่รู้จักตัวละครรหัส "' + payload.unit_id + '"', "err");
      return;
    }
    if (payload.shard_unit_id && UNIT_IDS.indexOf(payload.shard_unit_id) < 0) {
      say($("mailMsg"), 'ไม่รู้จักตัวละครรหัส "' + payload.shard_unit_id + '"', "err");
      return;
    }
    if (payload.shard_count > 0 && !payload.shard_unit_id) {
      say($("mailMsg"), "ใส่จำนวนเศษแล้วต้องเลือกตัวละครด้วย", "err");
      return;
    }

    var who = audience === "all" ? "ผู้เล่นทุกคน" : $("mailTarget").value.trim();
    if (!confirm('ส่งจดหมาย "' + title + '" ถึง ' + who + " ?\n\nส่งแล้วแก้ของที่แนบไม่ได้ ทำได้แค่ลบทั้งฉบับ")) return;

    $("mailSendBtn").disabled = true;
    say($("mailMsg"), "กำลังส่ง…", "wait");
    try {
      await rest("mails", { method: "POST", headers: { "Prefer": "return=representation" }, body: payload });
      await logAction("ส่งจดหมาย", audience === "all" ? "ทุกคน" : "profile:" + targetUser, title);
      say($("mailMsg"), "ส่งแล้ว", "ok");
      clearMailForm();
      loadMail();
      loadLog();
    } catch (e) {
      say($("mailMsg"), friendly(e.message), "err");
    } finally {
      $("mailSendBtn").disabled = false;
    }
  }

  function giftSummary(m) {
    var parts = [];
    if (m.coins > 0) parts.push("เหรียญ " + m.coins.toLocaleString());
    if (m.crystals > 0) parts.push("คริสตัล " + m.crystals.toLocaleString());
    if (m.exp_chips > 0) parts.push("ชิป " + m.exp_chips.toLocaleString());
    if (m.stamina > 0) parts.push("สแตมิน่า " + m.stamina);
    if (m.player_exp > 0) parts.push("EXP ผู้เล่น " + Number(m.player_exp).toLocaleString());
    if (m.unit_id) parts.push("ตัวละคร " + m.unit_id);
    if (m.shard_count > 0 && m.shard_unit_id) parts.push("เศษ " + m.shard_unit_id + " x" + m.shard_count);
    return parts.length ? parts.join(" · ") : "—";
  }

  async function loadMail() {
    try {
      var r = await rest("rpc/admin_mail_list", { method: "POST", body: {} });
      var rows = r.data || [];
      if (!rows.length) { $("mailList").innerHTML = '<div class="empty">ยังไม่เคยส่งจดหมาย</div>'; return; }

      $("mailList").innerHTML =
        "<table><thead><tr><th>ส่งถึง</th><th>หัวข้อ</th><th>ของที่แนบ</th>" +
        '<th class="num">รับแล้ว</th><th>ส่งเมื่อ</th><th class="num">จัดการ</th></tr></thead><tbody>' +
        rows.map(function (m) {
          var to = m.audience === "all" ? "ทุกคน" : (m.target_name || "—");
          var expired = m.expires_at && new Date(m.expires_at) <= new Date();
          return "<tr>" +
            "<td>" + esc(to) + (expired ? ' <span class="tag off">หมดอายุ</span>' : "") + "</td>" +
            "<td>" + esc(m.title) + "</td>" +
            "<td>" + esc(giftSummary(m)) + "</td>" +
            '<td class="num">' + esc(m.claim_count) + "</td>" +
            "<td>" + esc(thaiDate(m.created_at)) + "</td>" +
            '<td class="num"><button class="btn warn small" data-maildel="' + m.id + '">ลบ</button></td>' +
            "</tr>";
        }).join("") + "</tbody></table>";

      wire("[data-maildel]", "data-maildel", function (id) { deleteMail(rows, id); });
    } catch (e) {
      $("mailList").innerHTML = '<div class="empty">' + esc(e.message) + "</div>";
    }
  }

  async function deleteMail(rows, id) {
    var m = findById(rows, id);
    if (!m) return;
    var warn = m.claim_count > 0
      ? "\n\nมีคนรับของไปแล้ว " + m.claim_count + " คน — ของที่เขารับไปจะไม่ถูกเรียกคืน"
      : "";
    if (!confirm('ลบจดหมาย "' + m.title + '" ถาวร?' + warn)) return;
    try {
      await rest("mails?id=eq." + encodeURIComponent(id), { method: "DELETE" });
      await logAction("ลบจดหมาย", "mail:" + id, m.title);
      loadMail();
      loadLog();
    } catch (e) {
      say($("mailMsg"), friendly(e.message), "err");
    }
  }

  // ------------------------------------------------------------------
  // บันทึกการทำงาน
  // ------------------------------------------------------------------

  async function loadLog() {
    try {
      var r = await rest("admin_log?select=*&order=created_at.desc&limit=100");
      var rows = r.data || [];
      if (!rows.length) { $("logList").innerHTML = '<div class="empty">ยังไม่มีบันทึก</div>'; return; }
      $("logList").innerHTML =
        "<table><thead><tr><th>เมื่อไร</th><th>ทำอะไร</th><th>กับอะไร</th><th>รายละเอียด</th></tr></thead><tbody>" +
        rows.map(function (l) {
          return "<tr><td>" + esc(thaiDate(l.created_at)) + "</td>" +
            "<td>" + esc(l.action) + "</td>" +
            "<td>" + esc(l.target) + "</td>" +
            "<td>" + esc(l.detail) + "</td></tr>";
        }).join("") + "</tbody></table>";
    } catch (e) {
      $("logList").innerHTML = '<div class="empty">' + esc(e.message) + "</div>";
    }
  }

  // ------------------------------------------------------------------

  function friendly(message) {
    var m = (message || "").toLowerCase();

    // ฐานข้อมูลปฏิเสธเพราะค่าเกินขีด — แปลชื่อ constraint เป็นภาษาคน
    if (m.indexOf("check constraint") >= 0) {
      if (m.indexOf("stamina") >= 0)     return "สแตมิน่าใส่ได้ 0–9,999";
      if (m.indexOf("crystals") >= 0)    return "คริสตัลใส่ได้ 0–9,999,999";
      if (m.indexOf("coins") >= 0)       return "เหรียญใส่ได้ 0–99,999,999";
      if (m.indexOf("exp_chips") >= 0)   return "ชิป EXP ใส่ได้ 0–9,999,999";
      if (m.indexOf("shard_count") >= 0) return "จำนวนเศษใส่ได้ 0–99,999";
      if (m.indexOf("player_exp") >= 0)  return "EXP ผู้เล่นใส่ได้ 0–999,999,999";
      if (m.indexOf("target_matches_audience") >= 0)
        return "ส่งถึงคนเดียวต้องเลือกผู้รับ / ส่งถึงทุกคนต้องไม่เลือกผู้รับ";
      return "มีค่าที่ใส่เกินขีดที่กำหนด ลองลดตัวเลขลง";
    }
    if (m.indexOf("foreign key") >= 0)
      return "ไม่พบผู้รับคนนี้ในระบบ";

    if (m.indexOf("row-level security") >= 0 || m.indexOf("violates row-level") >= 0)
      return "ไม่มีสิทธิ์ทำรายการนี้ — บัญชีนี้ไม่ได้อยู่ในตาราง admins";
    if (m.indexOf("duplicate key") >= 0 || m.indexOf("unique") >= 0)
      return "ชื่อนี้มีคนใช้แล้ว";
    if (m.indexOf("jwt") >= 0 || m.indexOf("expired") >= 0)
      return "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่";
    if (m.indexOf("failed to fetch") >= 0)
      return "ต่อเซิร์ฟเวอร์ไม่ได้ ตรวจอินเทอร์เน็ตและค่าใน config.js";
    return message;
  }

  // ------------------------------------------------------------------
  // เริ่มทำงาน
  // ------------------------------------------------------------------

  async function boot() {
    setupTabs();

    $("loginBtn").addEventListener("click", doLogin);
    $("loginPassword").addEventListener("keydown", function (e) { if (e.key === "Enter") doLogin(); });
    $("logoutBtn").addEventListener("click", signOut);

    $("newsSaveBtn").addEventListener("click", saveNews);
    $("newsCancelBtn").addEventListener("click", clearNewsForm);

    $("playerSearchBtn").addEventListener("click", function () { loadPlayers($("playerSearch").value.trim()); });
    $("playerSearch").addEventListener("keydown", function (e) {
      if (e.key === "Enter") loadPlayers($("playerSearch").value.trim());
    });
    $("renameBtn").addEventListener("click", renamePlayer);
    $("editSaveBtn").addEventListener("click", saveEditor);
    $("editReloadBtn").addEventListener("click", function () {
      if (editing) openEditor(editing.user_id);
    });

    $("mailSendBtn").addEventListener("click", sendMail);
    $("mailClearBtn").addEventListener("click", clearMailForm);
    $("mailAudience").addEventListener("change", function () {
      $("mailTargetWrap").hidden = this.value !== "user";
    });

    if (!configured()) {
      showLogin("ยังไม่ได้ตั้งค่า — เปิดไฟล์ admin/config.js แล้วใส่ URL กับ publishable key", "err");
      $("loginBtn").disabled = true;
      return;
    }

    loadSession();
    if (session && await refreshIfNeeded()) {
      try {
        if (await isAdmin()) { showApp(); return; }
        showLogin("บัญชีนี้ไม่ใช่แอดมิน", "err");
        session = null;
        saveSession();
        return;
      } catch (e) { /* ตกไปหน้าเข้าสู่ระบบ */ }
    }
    showLogin("", "");
  }

  async function doLogin() {
    var email = $("loginEmail").value.trim();
    var password = $("loginPassword").value;
    if (!email || !password) { say($("loginMsg"), "กรอกอีเมลและรหัสผ่าน", "err"); return; }

    $("loginBtn").disabled = true;
    say($("loginMsg"), "กำลังเข้าสู่ระบบ…", "wait");
    try {
      await signIn(email, password);

      if (!(await isAdmin())) {
        session = null;
        saveSession();
        say($("loginMsg"),
            "เข้าสู่ระบบได้ แต่บัญชีนี้ไม่ใช่แอดมิน\nต้องเพิ่มลงตาราง admins ก่อน (ดู supabase/003_admin.sql)",
            "err");
        return;
      }

      $("loginPassword").value = "";
      say($("loginMsg"), "", "");
      showApp();
    } catch (e) {
      var m = (e.message || "").toLowerCase();
      if (m.indexOf("invalid login") >= 0 || m.indexOf("invalid_credentials") >= 0)
        say($("loginMsg"), "อีเมลหรือรหัสผ่านไม่ถูกต้อง", "err");
      else if (m.indexOf("email not confirmed") >= 0)
        say($("loginMsg"), "ยังไม่ได้ยืนยันอีเมล กดลิงก์ในอีเมลก่อน", "err");
      else
        say($("loginMsg"), friendly(e.message), "err");
    } finally {
      $("loginBtn").disabled = false;
    }
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
