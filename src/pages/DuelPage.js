/**
 * DuelPage.js — "İki Kişilik Oyun": iki öğrenci aynı ekranda karşı karşıya.
 *
 * Sınıfta iki çocuk tahtaya kalkar ve birbirleriyle oynar. Ekran iki aşamalıdır:
 *
 *  1) KURULUM — Tahta BOŞ gelir. Çocuklar taşları kendileri dizer: paletten bir
 *     taş seçilir, tahtada konulacak kareye dokunulur. "Standart Diziliş" düğmesi
 *     hazır kuruluşu getirir; öğretmen isterse yalnızca birkaç taşlı bir oyun
 *     sonu konumu da kurdurabilir.
 *
 *  2) OYUN — İki düzen seçeneği vardır:
 *       • Tek Tahta   : iki oyuncu aynı tahtayı paylaşır (istenirse her hamlede
 *                       tahta otomatik çevrilir).
 *       • İki Tahta   : AYNI SAYFADA yan yana iki tahta. Soldaki tahta beyaz
 *                       oyuncuyu, sağdaki siyah oyuncuyu temsil eder ve her biri
 *                       kendi oyuncusunun gözünden çizilir. İki tahta TEK konumu
 *                       paylaşır: birinde yapılan hamle diğerinde anında görünür.
 *
 * Bilgisayar yoktur, yapay zekâ yoktur; kuralları yine kendi motorumuz denetler.
 */

import { el } from "../utils/dom.js";
import { ChessBoard } from "../components/ChessBoard.js";
import { Chess, PIECE_NAMES_TR, sanTr } from "../engine/Chess.js";
import { icon } from "../components/Icon.js";
import { pieceHTML } from "../components/PieceGlyph.js";
import { burst } from "../animations/effects.js";
import { pageShell, focusToggle } from "./pageUtils.js";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const RANKS = [8, 7, 6, 5, 4, 3, 2, 1];

/** Kurulumun başladığı boş tahta. */
const EMPTY_FEN = "8/8/8/8/8/8/8/8 w - - 0 1";

/** Palet sırası: önce güçlü taşlar, sonda piyon — ders kitaplarındaki sıra. */
const PALETTE_TYPES = ["k", "q", "r", "b", "n", "p"];

const COLOR_NAMES = { w: "Beyaz", b: "Siyah" };

/** Standart başlangıç dizilişini kare → taş kodu haritası olarak verir. */
function standardSetup() {
  const setup = new Map();
  for (const [square, piece] of Object.entries(new Chess().pieceMap())) {
    setup.set(square, piece.color + piece.type);
  }
  return setup;
}

export function DuelPage({ sound }) {
  /* ---------------------------------------------------------------- *
   * Durum
   * ---------------------------------------------------------------- */

  /** İki tahta da BU konumu paylaşır; eşitlemenin sırrı budur. */
  const chess = new Chess(EMPTY_FEN);

  /** Kurulum sırasındaki taş yerleşimi: "e1" → "wk". */
  let setup = new Map();

  let layout = "dual"; // "dual" (yan yana iki tahta) | "single" (tek tahta)
  let phase = "setup"; // "setup" (taşları diz) | "play" (oyna)
  let brush = "wp"; // paletten seçili taş, ya da "erase"
  let startTurn = "w"; // kurulum bitince ilk hamleyi kim yapacak
  let singleOrientation = "w"; // tek tahta düzeninde tahtanın yönü
  let autoFlip = false; // tek tahtada her hamleden sonra çevir
  let startFen = ""; // oyunun başladığı konum ("aynı dizilişle yeniden" için)
  let finished = false; // sonuç kartı bir kez gösterilsin

  const names = { w: "Beyaz Oyuncu", b: "Siyah Oyuncu" };

  /** Ekrandaki tahtalar: { side, api, card, turnTag, captured, nameTag }. */
  let seats = [];

  /* ---------------------------------------------------------------- *
   * Sabit arayüz parçaları
   * ---------------------------------------------------------------- */

  const boardsHost = el("div", { className: "duel-boards" });
  const noticeEl = el("p", { className: "duel-notice" });
  const statusEl = el("p", { className: "duel-status" });
  const moveList = el("ol", { className: "move-list" });
  const resultHost = el("div", { className: "duel-result" });
  const paletteHost = el("div", { className: "duel-palette" });

  /* ---------------------------------------------------------------- *
   * Kurulum: taş dizme
   * ---------------------------------------------------------------- */

  /** Kurulumdaki konumu FEN'e çevirir. */
  function setupFen(turn) {
    let placement = "";
    for (const rank of RANKS) {
      let empty = 0;
      for (const file of FILES) {
        const code = setup.get(`${file}${rank}`);
        if (!code) {
          empty += 1;
          continue;
        }
        if (empty > 0) placement += empty;
        empty = 0;
        placement += code[0] === "w" ? code[1].toUpperCase() : code[1];
      }
      if (empty > 0) placement += empty;
      if (rank > 1) placement += "/";
    }
    return `${placement} ${turn} ${castlingRights()} - 0 1`;
  }

  /**
   * Rok hakları konumdan ÇIKARILIR: şah ve kale hiç kıpırdamamış gibi
   * duruyorsa (e1 + a1/h1) o yöne rok hakkı verilir. Çocuk standart dizilişi
   * kurduğunda rok kendiliğinden çalışsın diye böyledir.
   */
  function castlingRights() {
    let rights = "";
    if (setup.get("e1") === "wk") {
      if (setup.get("h1") === "wr") rights += "K";
      if (setup.get("a1") === "wr") rights += "Q";
    }
    if (setup.get("e8") === "bk") {
      if (setup.get("h8") === "br") rights += "k";
      if (setup.get("a8") === "br") rights += "q";
    }
    return rights || "-";
  }

  /** Kurulumu tahtalara yansıtır. */
  function applySetup() {
    chess.load(setupFen(startTurn));
    for (const seat of seats) seat.api.attach(chess);
    updateNotice();
    refresh();
  }

  /** Bir kareye seçili taşı koyar, aynı taş duruyorsa kaldırır. */
  function paint(square) {
    if (phase !== "setup") return;

    const current = setup.get(square) || "";

    if (brush === "erase") {
      if (!current) return;
      setup.delete(square);
    } else if (current === brush) {
      // Aynı taşa ikinci dokunuş taşı kaldırır — silgiye geçmeden düzeltme.
      setup.delete(square);
    } else {
      const rank = square[1];
      if (brush[1] === "p" && (rank === "1" || rank === "8")) {
        warn("Piyon 1. ve 8. yataya konulamaz; orada zaten terfi ederdi.");
        sound.play("error");
        return;
      }
      // Her renkten TEK şah olur: yeni şah konunca eskisi yerinden kalkar.
      if (brush[1] === "k") {
        for (const [name, code] of setup) if (code === brush) setup.delete(name);
      }
      setup.set(square, brush);
    }

    sound.play("click");
    applySetup();
  }

  /** Kurulumun oyuna hazır olup olmadığını söyler; hazırsa null döner. */
  function validateSetup() {
    const kings = { w: 0, b: 0 };
    for (const code of setup.values()) if (code[1] === "k") kings[code[0]] += 1;

    if (kings.w === 0 || kings.b === 0) {
      return "Oyuna başlamak için her iki tarafın da bir şahı olmalı.";
    }

    const test = new Chess(setupFen(startTurn));
    const waiting = startTurn === "w" ? "b" : "w";

    // Sırası GELMEYEN tarafın şahı tehdit altında olamaz: böyle bir konumda
    // sıradaki oyuncu rakip şahı alarak oyunu bitirirdi, bu satrançta olmaz.
    if (test.isKingAttacked(waiting)) {
      return `${COLOR_NAMES[waiting]} tarafın şahı tehdit altında ama sıra ${COLOR_NAMES[startTurn]} tarafında. Konumu düzelt ya da başlayan tarafı değiştir.`;
    }

    if (test.moves().length === 0) {
      return `${COLOR_NAMES[startTurn]} tarafın hiç hamlesi yok — bu konum daha ilk hamlede bitmiş sayılır.`;
    }

    return null;
  }

  /** Kurulum ipucu satırını tazeler. */
  function updateNotice() {
    if (phase !== "setup") return;

    if (setup.size === 0) {
      noticeEl.className = "duel-notice";
      noticeEl.textContent = "Aşağıdan bir taş seç, sonra tahtada koymak istediğin kareye dokun.";
      return;
    }

    const problem = validateSetup();
    if (problem) {
      noticeEl.className = "duel-notice warn";
      noticeEl.textContent = problem;
      return;
    }

    noticeEl.className = "duel-notice ready";
    noticeEl.textContent = `Konum hazır! ${COLOR_NAMES[startTurn]} başlıyor — “Oyunu Başlat”a bas.`;
  }

  /** Kurulum sırasında uyarı gösterir. */
  function warn(text) {
    noticeEl.className = "duel-notice warn";
    noticeEl.textContent = text;
  }

  /* ---------------------------------------------------------------- *
   * Aşama geçişleri
   * ---------------------------------------------------------------- */

  /**
   * Kurulum ekranını açar.
   * @param {Map|null} position Dizilecek konum; null ise tahta boş gelir.
   */
  function openSetup(position = null) {
    setup = position ? new Map(position) : new Map();
    phase = "setup";
    finished = false;
    moveList.replaceChildren();
    resultHost.replaceChildren();
    setupPanel.hidden = false;
    playPanel.hidden = true;
    applySetup();
  }

  /** Kurulumu onaylayıp oyunu başlatır. */
  function startGame() {
    const problem = validateSetup();
    if (problem) {
      warn(problem);
      sound.play("error");
      return;
    }

    startFen = setupFen(startTurn);
    chess.load(startFen);
    phase = "play";
    finished = false;
    moveList.replaceChildren();
    resultHost.replaceChildren();
    for (const seat of seats) seat.api.attach(chess);
    setupPanel.hidden = true;
    playPanel.hidden = false;
    sound.play("success");
    refresh();
  }

  /** Oyunu aynı dizilişle baştan başlatır. */
  function restartGame() {
    if (!startFen) return;
    chess.load(startFen);
    finished = false;
    moveList.replaceChildren();
    resultHost.replaceChildren();
    for (const seat of seats) seat.api.attach(chess);
    sound.play("click");
    refresh();
  }

  /* ---------------------------------------------------------------- *
   * Oyun
   * ---------------------------------------------------------------- */

  /**
   * Bir tahtadan gelen hamle.
   * @param {"w"|"b"|null} side Hamleyi yapan tahtanın rengi; tek tahtada null.
   */
  function handleMove(side, move) {
    if (phase !== "play") return;

    const turn = chess.turnColor();
    if (side !== null && side !== turn) {
      statusEl.textContent = "Sıra rakipte — onun hamlesini bekle.";
      sound.play("error");
      return;
    }

    const played = chess.move(move);
    if (!played) {
      sound.play("error");
      for (const seat of seats) seat.api.shake(move.from);
      return;
    }

    sound.play(played.captured ? "success" : "move");
    appendMove(played);
    // TEK konum, İKİ görüntü: hamle her iki tahtada da aynı anda oynatılır.
    for (const seat of seats) seat.api.update({ from: played.from, to: played.to });
    refresh();
    announceEnd();

    // Tek tahtada çevirme, taş uçuşu bittikten sonra yapılır; yoksa uçan taş
    // dönüşün ortasında kalır ve ters görünürdü.
    if (layout === "single" && autoFlip && !finished) setTimeout(faceTurn, 430);
  }

  /**
   * Tek tahtayı, sırası GELEN oyuncunun gözüne çevirir.
   *
   * "Her hamlede çevir" için `flip()` (ucu ucuna ters çevirme) yeterli DEĞİLDİR:
   * ayar oyunun ortasında açılırsa tahta yanlış tarafa döner. Yönü doğrudan
   * sıradaki renge bağlamak her durumda doğru sonucu verir.
   */
  function faceTurn() {
    if (layout !== "single" || seats.length === 0) return;
    singleOrientation = chess.turnColor();
    seats[0].api.setOrientation(singleOrientation);
  }

  /**
   * Sırası gelmeyen tahtaya dokunan çocuğa neden hiçbir şey olmadığını söyler.
   * Tahta zaten kilitlidir; sessiz kilit çocuğa "bozuk" gibi gelirdi.
   */
  function nudge(side, square) {
    if (side === null || phase !== "play") return;
    if (side === chess.turnColor()) return;
    const piece = chess.get(square);
    if (!piece || piece.color !== side) return;
    statusEl.textContent = `Sıra ${names[chess.turnColor()]} tarafında — onun hamlesini bekle.`;
  }

  /** Son hamleyi geri alır — sınıfta "yanlışlıkla oldu" anları için. */
  function undoMove() {
    if (phase !== "play") return;
    if (!chess.undo()) return;

    sound.play("click");
    finished = false;
    resultHost.replaceChildren();
    if (moveList.lastChild) moveList.lastChild.remove();

    const history = chess.getHistory({ verbose: true });
    const previous = history.length > 0 ? history[history.length - 1] : null;
    for (const seat of seats) {
      seat.api.setLastMove(previous ? { from: previous.from, to: previous.to } : null);
    }
    refresh();
  }

  /** Oyun bittiyse sonuç kartını gösterir. */
  function announceEnd() {
    const status = chess.status();
    if (!status.over || finished) return;

    finished = true;
    sound.play("badge");

    const winnerLine =
      status.winner === null
        ? "Beraberlik — ikiniz de iyi oynadınız."
        : `Kazanan: ${names[status.winner]}`;

    resultHost.replaceChildren(
      el("section", { className: "duel-result-card" }, [
        el("span", { className: "duel-result-emoji", text: status.winner === null ? "🤝" : "🏆" }),
        el("h3", { text: status.reason }),
        el("p", { text: winnerLine }),
        el("div", { className: "duel-result-actions" }, [
          el("button", {
            className: "primary",
            type: "button",
            text: "Aynı Dizilişle Yeniden",
            onClick: () => restartGame()
          }),
          el("button", {
            className: "ghost",
            type: "button",
            text: "Yeni Diziliş",
            onClick: () => openSetup(null)
          })
        ])
      ])
    );
    burst(resultHost);
  }

  /** Hamle listesine yeni satır ekler. */
  function appendMove(move) {
    moveList.append(
      el("li", { className: `move-item ${move.color === "w" ? "white" : "black"}` }, [
        el("span", { className: "move-san", text: sanTr(move.san) })
      ])
    );
    moveList.scrollTop = moveList.scrollHeight;
  }

  /* ---------------------------------------------------------------- *
   * Tahtalar
   * ---------------------------------------------------------------- */

  /**
   * Bir tahta kartı üretir.
   * @param {"w"|"b"|null} side Tahtanın temsil ettiği oyuncu; tek tahtada null.
   */
  function createSeat(side) {
    const api = ChessBoard({
      chess,
      orientation: side || singleOrientation,
      interactive: phase === "play",
      onSquareClick: (square) => {
        if (phase === "setup") paint(square);
        else nudge(side, square);
      },
      onMove: (move) => {
        handleMove(side, move);
        // Hamleyi motora biz uyguluyoruz; bileşen kendi başına ilerletmesin.
        return false;
      }
    });

    const nameTag = el("strong", { className: "seat-name" });
    const roleTag = el("small", { className: "seat-role" });
    const turnTag = el("span", { className: "seat-turn" });
    const captured = el("div", { className: "captured-row" });

    const card = el("article", { className: "duel-seat", "data-side": side || "both" }, [
      el("header", { className: "seat-head" }, [
        el("span", {
          className: "seat-badge",
          html: side ? pieceHTML(`${side}k`) : `${pieceHTML("wk")}${pieceHTML("bk")}`
        }),
        el("div", { className: "seat-id" }, [nameTag, roleTag]),
        turnTag
      ]),
      api.element,
      captured
    ]);

    const seat = { side, api, card, nameTag, roleTag, turnTag, captured };
    seats.push(seat);
    return card;
  }

  /** Düzen değiştiğinde tahtaları yeniden kurar. */
  function buildBoards() {
    seats = [];
    boardsHost.className = `duel-boards ${layout}`;
    boardsHost.replaceChildren(...(layout === "dual" ? ["w", "b"] : [null]).map(createSeat));
    refresh();
  }

  /** Alınan taş şeridini yazar. */
  function renderCaptured(seat) {
    const captured = chess.capturedPieces();

    /** Bir tarafın ALDIĞI taşlar: rakip renkte kaybedilenlerdir. */
    const group = (label, color) => {
      const list = captured[color];
      return el("span", { className: "captured-group" }, [
        el("span", { className: "captured-label", text: label }),
        ...(list.length === 0
          ? [el("span", { className: "captured-empty", text: "—" })]
          : list.map((type) =>
              el("span", { className: "captured-piece", html: pieceHTML(color + type) })
            ))
      ]);
    };

    if (seat.side) {
      seat.captured.replaceChildren(group("Aldıkların", seat.side === "w" ? "b" : "w"));
    } else {
      seat.captured.replaceChildren(group("Beyaz aldı", "b"), group("Siyah aldı", "w"));
    }
  }

  /** Tüm arayüzü konuma göre tazeler. */
  function refresh() {
    const turn = chess.turnColor();
    const status = phase === "play" ? chess.status() : { over: false, reason: "" };

    for (const seat of seats) {
      const myTurn = seat.side === null || seat.side === turn;
      const canPlay = phase === "play" && !status.over && myTurn;

      seat.api.setInteractive(canPlay);
      seat.card.classList.toggle("active", canPlay && seat.side !== null);
      seat.card.classList.toggle("setup", phase === "setup");

      if (seat.side) {
        seat.nameTag.textContent = names[seat.side];
        seat.roleTag.textContent = `${COLOR_NAMES[seat.side]} taşlar`;
        seat.turnTag.textContent =
          phase === "setup" ? "Kurulum" : status.over ? "Oyun bitti" : myTurn ? "Sıra sende" : "Bekliyor";
      } else {
        seat.nameTag.textContent = phase === "setup" ? "Kurulum tahtası" : names[turn];
        seat.roleTag.textContent =
          phase === "setup" ? "Taşları birlikte dizin" : `${COLOR_NAMES[turn]} taşları oynuyor`;
        seat.turnTag.textContent = status.over ? "Oyun bitti" : phase === "setup" ? "" : "Sıra";
      }

      renderCaptured(seat);
    }

    if (phase === "play") {
      statusEl.textContent = status.over
        ? status.reason
        : status.reason || `Sıra: ${names[turn]} — ${COLOR_NAMES[turn].toLowerCase()} taşlar.`;
    }

    flipButton.hidden = layout !== "single";
    autoFlipBox.hidden = layout !== "single";
  }

  /* ---------------------------------------------------------------- *
   * Düzen seçimi (tek tahta / iki tahta)
   * ---------------------------------------------------------------- */

  function layoutButton(id, title, subtitle) {
    return el("button", {
      className: `seg-button ${id === layout ? "active" : ""}`,
      type: "button",
      "data-layout": id,
      title: subtitle,
      onClick: (event) => {
        if (layout === id) return;
        layout = id;
        sound.play("click");
        for (const button of event.currentTarget.parentElement.children) {
          button.classList.toggle("active", button.dataset.layout === id);
        }
        buildBoards();
      }
    }, [el("strong", { text: title }), el("small", { text: subtitle })]);
  }

  const layoutBar = el("div", { className: "duel-modes" }, [
    el("span", { className: "panel-label", text: "Düzen" }),
    el("div", { className: "segmented" }, [
      layoutButton("dual", "İki Tahta", "Yan yana, her oyuncu kendi gözünden"),
      layoutButton("single", "Tek Tahta", "İki oyuncu aynı tahtada")
    ])
  ]);

  /* ---------------------------------------------------------------- *
   * Kurulum paneli
   * ---------------------------------------------------------------- */

  /** Palet düğmelerinin seçili görünümünü tazeler. */
  function markBrush() {
    for (const button of paletteHost.querySelectorAll(".brush")) {
      button.classList.toggle("active", button.dataset.code === brush);
    }
  }

  function selectBrush(code) {
    brush = code;
    sound.play("click");
    markBrush();
  }

  function brushButton(code, label, html) {
    return el("button", {
      className: `brush ${code === brush ? "active" : ""}`,
      type: "button",
      "data-code": code,
      title: label,
      "aria-label": label,
      onClick: () => selectBrush(code),
      html
    });
  }

  paletteHost.replaceChildren(
    ...["w", "b"].map((color) =>
      el("div", { className: "brush-row" }, [
        el("span", { className: "brush-row-label", text: `${COLOR_NAMES[color]} taşlar` }),
        el("div", { className: "brush-set" }, PALETTE_TYPES.map((type) =>
          brushButton(
            color + type,
            `${COLOR_NAMES[color]} ${PIECE_NAMES_TR[type]}`,
            pieceHTML(color + type)
          )
        ))
      ])
    ),
    el("div", { className: "brush-row" }, [
      el("span", { className: "brush-row-label", text: "Düzeltme" }),
      el("div", { className: "brush-set" }, [
        brushButton("erase", "Sil — dokunduğun kareyi boşaltır", "🧽")
      ])
    ])
  );

  const turnButtons = ["w", "b"].map((color) =>
    el("button", {
      className: `seg-button ${color === startTurn ? "active" : ""}`,
      type: "button",
      "data-turn": color,
      title: `${COLOR_NAMES[color]} ilk hamleyi yapar`,
      onClick: (event) => {
        startTurn = color;
        sound.play("click");
        for (const button of event.currentTarget.parentElement.children) {
          button.classList.toggle("active", button.dataset.turn === color);
        }
        applySetup();
      }
    }, [
      el("strong", { html: pieceHTML(`${color}k`) }),
      el("small", { text: COLOR_NAMES[color] })
    ])
  );

  /** Oyuncu adı kutusu — sınıfta "Ali vs Ayşe" yazması oyunu ciddileştirir. */
  function nameInput(color) {
    return el("input", {
      className: "duel-name-input",
      type: "text",
      value: names[color],
      maxlength: "18",
      "aria-label": `${COLOR_NAMES[color]} oyuncunun adı`,
      placeholder: `${COLOR_NAMES[color]} oyuncu`,
      onInput: (event) => {
        names[color] = event.target.value.trim() || `${COLOR_NAMES[color]} Oyuncu`;
        refresh();
      }
    });
  }

  const setupPanel = el("div", { className: "duel-panel-body" }, [
    el("h2", { className: "duel-panel-title", text: "1. Taşları dizin" }),
    noticeEl,
    paletteHost,
    el("div", { className: "duel-quick" }, [
      el("button", {
        className: "ghost",
        type: "button",
        html: `${icon("board")} Standart Diziliş`,
        onClick: () => {
          sound.play("click");
          setup = standardSetup();
          applySetup();
        }
      }),
      el("button", {
        className: "ghost",
        type: "button",
        html: `${icon("edit")} Tahtayı Boşalt`,
        onClick: () => {
          sound.play("click");
          setup = new Map();
          applySetup();
        }
      })
    ]),
    el("label", { className: "panel-label", text: "Kim başlıyor?" }),
    el("div", { className: "segmented" }, turnButtons),
    el("label", { className: "panel-label", text: "Oyuncular" }),
    el("div", { className: "duel-names" }, [nameInput("w"), nameInput("b")]),
    el("button", {
      className: "primary duel-start",
      type: "button",
      text: "Oyunu Başlat",
      onClick: () => startGame()
    })
  ]);

  /* ---------------------------------------------------------------- *
   * Oyun paneli
   * ---------------------------------------------------------------- */

  function toolButton(iconName, label, handler) {
    return el("button", {
      className: "tool-button",
      type: "button",
      title: label,
      "aria-label": label,
      onClick: handler,
      html: icon(iconName)
    });
  }

  const flipButton = toolButton("board", "Tahtayı çevir", () => {
    sound.play("click");
    singleOrientation = seats[0].api.flip();
  });

  const autoFlipBox = el("label", { className: "duel-autoflip" }, [
    el("input", {
      type: "checkbox",
      onChange: (event) => {
        autoFlip = event.target.checked;
        sound.play("click");
        // Ayar açıldığı anda tahtayı doğru tarafa çevir; oyunun ortasında
        // açıldığında bir hamle boyunca ters kalmasın.
        if (autoFlip && phase === "play") faceTurn();
      }
    }),
    el("span", { text: "Her hamlede tahtayı çevir" })
  ]);

  const focusButton = focusToggle(sound);

  const playPanel = el("div", { className: "duel-panel-body", hidden: "" }, [
    el("div", { className: "panel-top" }, [
      el("div", { className: "play-tools" }, [
        toolButton("route", "Son hamleyi geri al", () => undoMove()),
        flipButton,
        toolButton("game", "Aynı dizilişle yeniden başla", () => restartGame()),
        toolButton("edit", "Dizilişi değiştir", () => {
          sound.play("click");
          // Oyunun BAŞLADIĞI konumu düzenletiriz; oyunun ortasındaki konumu
          // değil. Çocuk "şurayı yanlış dizmişiz" dediğinde beklediği budur.
          const position = new Map();
          for (const [square, piece] of Object.entries(new Chess(startFen).pieceMap())) {
            position.set(square, piece.color + piece.type);
          }
          openSetup(position);
        }),
        toolButton("pawn", "Yeni diziliş (boş tahta)", () => {
          sound.play("click");
          openSetup(null);
        })
      ]),
      focusButton
    ]),
    statusEl,
    autoFlipBox,
    moveList,
    resultHost
  ]);

  /* ---------------------------------------------------------------- *
   * Kuruluş
   * ---------------------------------------------------------------- */

  buildBoards();
  openSetup(null);

  return pageShell(
    "İki Kişilik Oyun",
    "İki öğrenci karşı karşıya: taşları kendiniz dizin, sonra oynayın.",
    [
      el("section", { className: "duel-layout" }, [
        el("div", { className: "duel-stage" }, [layoutBar, boardsHost]),
        el("aside", { className: "duel-panel" }, [setupPanel, playPanel])
      ])
    ],
    { compact: true }
  );
}
