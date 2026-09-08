/**
 * PlayPage.js — "Bilgisayara Karşı Oyna" ekranı.
 *
 * Gerçek kural motoru (Chess), gerçek yapay zekâ (Ai) ve GameService üzerine kuruludur.
 * Ekranın sunduğu özellikler:
 *  - Üç zorluk seviyesi, renk seçimi, tahtayı çevirme
 *  - Sürükle-bırak ve tıkla-oyna ile yalnızca yasal hamleler
 *  - Hamleyi geri alma, ipucu, anlık değerlendirme
 *  - Her hamleden sonra yapay zekâ öğretmeninin geri bildirimi
 *  - Oyun sonunda doğruluk yüzdesi ve hata dökümü içeren rapor
 */

import { el } from "../utils/dom.js";
import { ChessBoard } from "../components/ChessBoard.js";
import { GameService } from "../services/GameService.js";
import { LEVELS } from "../engine/Ai.js";
import { icon } from "../components/Icon.js";
import { pieceHTML, symbolHTML } from "../components/PieceGlyph.js";
import { burst } from "../animations/effects.js";
import { pageShell, focusToggle } from "./pageUtils.js";
import { sanTr } from "../engine/Chess.js";

export function PlayPage({ progress, sound }) {
  const game = new GameService({ level: "kolay", playerColor: "w" });
  let resultRecorded = false;

  /* ---------------------------------------------------------------- *
   * Arayüz parçaları
   * ---------------------------------------------------------------- */

  const statusLine = el("p", { className: "play-status", text: "Beyaz taşlarla sen başlıyorsun. İyi oyunlar!" });
  const teacherText = el("p", { className: "teacher-text", text: "Merhaba! Ben senin satranç öğretmeninim. Her hamlenden sonra sana ipucu vereceğim." });
  const teacherBubble = el("div", { className: "teacher-bubble" }, [
    el("span", { className: "teacher-avatar", text: "🦉" }),
    teacherText
  ]);
  const moveList = el("ol", { className: "move-list" });
  const capturedByPlayer = el("div", { className: "captured-row" });
  const capturedByEngine = el("div", { className: "captured-row" });
  const thinkingBar = el("div", { className: "thinking-bar", hidden: "" }, [
    el("span", { className: "thinking-dot" }),
    el("span", { className: "thinking-dot" }),
    el("span", { className: "thinking-dot" }),
    el("span", { className: "thinking-label", text: "Bilgisayar düşünüyor" })
  ]);
  const reportHost = el("div", { className: "report-host" });

  const board = ChessBoard({
    chess: game.chess,
    orientation: "w",
    onMove: (move) => {
      handlePlayerMove(move);
      // Hamleyi motora biz uyguluyoruz; bileşen kendi kendine ilerletmesin.
      return false;
    }
  });

  /* ---------------------------------------------------------------- *
   * Oyun akışı
   * ---------------------------------------------------------------- */

  /** Oyuncunun hamlesi: uygula, değerlendir, sonra bilgisayarı oynat. */
  async function handlePlayerMove(move) {
    if (!game.isPlayerTurn()) {
      say("Sıra sende değil, bilgisayarın hamlesini bekle.");
      return;
    }

    const result = await game.playerMove(move);
    if (!result.ok) {
      sound.play("error");
      board.shake(move.from);
      say(result.reason);
      return;
    }

    sound.play(result.move.captured ? "success" : "move");
    board.update(game.lastMove);
    appendMove(result.move, result.report);
    say(result.report.advice);
    refresh();

    if (await checkGameOver()) return;
    await runEngine();
  }

  /** Bilgisayarın hamlesi. */
  async function runEngine() {
    board.setInteractive(false);
    thinkingBar.hidden = false;
    statusLine.textContent = "Bilgisayar düşünüyor...";

    const result = await game.engineMove();

    thinkingBar.hidden = true;
    if (result.ok) {
      sound.play("move");
      board.update(game.lastMove);
      appendMove(result.move, null);
    }

    refresh();
    if (await checkGameOver()) return;
    board.setInteractive(true);
  }

  /** Oyun bittiyse raporu gösterir; bittiğinde true döner. */
  async function checkGameOver() {
    const status = game.status();
    if (!status.over) return false;

    board.setInteractive(false);
    statusLine.textContent = status.reason;
    say(status.reason);

    if (!resultRecorded) {
      resultRecorded = true;
      const outcome = status.winner === null ? "drawn" : status.winner === game.playerColor ? "won" : "lost";
      progress.finishGame(outcome);
      sound.play(outcome === "won" ? "badge" : "success");
      if (outcome === "won") burst(statusLine);
    }

    showReport(status);
    return true;
  }

  /** Oyun sonu raporunu çizer. */
  function showReport(status) {
    const report = game.report();
    const rows = [
      ["brilliant", "Muhteşem", "✨"],
      ["best", "En İyi", "⭐"],
      ["good", "İyi", "👍"],
      ["inaccuracy", "Küçük Hata", "🤔"],
      ["mistake", "Hata", "⚠️"],
      ["blunder", "Büyük Hata", "💥"]
    ].filter(([key]) => report.counts[key] > 0);

    reportHost.replaceChildren(
      el("section", { className: "game-report" }, [
        el("h3", { text: status.reason }),
        el("div", { className: "accuracy-ring", style: `--value:${report.accuracy}` }, [
          el("strong", { text: `%${report.accuracy}` }),
          el("span", { text: "doğruluk" })
        ]),
        el("p", { className: "report-text", text: report.text }),
        el("div", { className: "report-rows" }, rows.map(([key, label, emoji]) =>
          el("div", { className: `report-row ${key}` }, [
            el("span", { className: "report-emoji", text: emoji }),
            el("span", { className: "report-label", text: label }),
            el("strong", { text: String(report.counts[key]) })
          ])
        )),
        report.best?.san ? el("p", { className: "report-note", text: `En iyi hamlen: ${sanTr(report.best.san)} ⭐` }) : null,
        report.worst && report.worst.loss > 120 && report.worst.bestSan
          ? el("p", { className: "report-note", text: `Çalışılacak hamle: ${sanTr(report.worst.san)} — burada ${sanTr(report.worst.bestSan)} daha güçlüydü.` })
          : null,
        el("button", { className: "primary", type: "button", text: "Yeni Oyun", onClick: () => startNewGame() })
      ])
    );
  }

  /** Yeni oyun kurar. */
  async function startNewGame({ level = game.level.id, playerColor = game.playerColor } = {}) {
    game.newGame({ level, playerColor });
    resultRecorded = false;
    reportHost.replaceChildren();
    moveList.replaceChildren();
    // GameService yeni bir Chess örneği ürettiği için tahtayı yeni konuma bağlarız.
    board.attach(game.chess);
    board.setOrientation(playerColor);
    board.update(null);
    board.setInteractive(true);
    say("Yeni oyun başladı. Merkezi kontrol etmeyi ve taşlarını geliştirmeyi unutma!");
    refresh();

    // Oyuncu siyahsa bilgisayar başlar.
    if (playerColor === "b") await runEngine();
  }

  /* ---------------------------------------------------------------- *
   * Yardımcılar
   * ---------------------------------------------------------------- */

  /** Öğretmen balonuna metin yazar ve sesli anlatım açıksa okur. */
  function say(text) {
    if (!text) return;
    teacherText.textContent = text;
    sound.speak(text); // ayar denetimi SoundService.speak içinde
  }

  /** Hamle listesine yeni satır ekler. */
  function appendMove(move, report) {
    const item = el("li", { className: `move-item ${move.color === "w" ? "white" : "black"}` }, [
      el("span", { className: "move-san", text: sanTr(move.san) }),
      report?.classification
        ? el("span", {
            className: "move-tag",
            style: `--tag:${report.classification.color}`,
            title: report.classification.label,
            text: report.classification.emoji
          })
        : null
    ]);
    moveList.append(item);
    moveList.scrollTop = moveList.scrollHeight;
  }

  /** Durum çubuğunu, materyal farkını ve alınan taşları tazeler. */
  function refresh() {
    const summary = game.summary();

    if (!game.finished) {
      statusLine.textContent = summary.check
        ? "Şah! Şahını kurtaracak bir hamle yap."
        : summary.turn === game.playerColor
          ? `Sıra sende — ${summary.material.text}`
          : "Bilgisayar düşünüyor...";
    }

    renderCaptured(capturedByPlayer, summary.captured[game.engineColor], game.engineColor, "Aldığın taşlar");
    renderCaptured(capturedByEngine, summary.captured[game.playerColor], game.playerColor, "Kaybettiğin taşlar");
  }

  /** Alınan taşları sembollerle listeler. */
  function renderCaptured(host, list, color, label) {
    host.replaceChildren(
      el("span", { className: "captured-label", text: label }),
      ...(list.length === 0
        ? [el("span", { className: "captured-empty", text: "—" })]
        : list.map((type) => el("span", { className: "captured-piece", html: pieceHTML(color + type) })))
    );
  }

  /* ---------------------------------------------------------------- *
   * Kontrol paneli
   * ---------------------------------------------------------------- */

  /** Bir segment grubunda tıklanan düğmeyi etkin hale getirir. */
  function activate(event) {
    for (const button of event.currentTarget.parentElement.children) button.classList.remove("active");
    event.currentTarget.classList.add("active");
  }

  const levelButtons = Object.values(LEVELS).map((level) =>
    el("button", {
      className: `seg-button ${level.id === "kolay" ? "active" : ""}`,
      type: "button",
      title: `${level.label} — ${level.elo} · ${level.description}`,
      onClick: (event) => {
        sound.play("click");
        activate(event);
        startNewGame({ level: level.id });
      }
    }, [el("strong", { text: level.label }), el("small", { text: level.elo })])
  );

  const colorButtons = [
    ["w", "Beyaz", "♔"],
    ["b", "Siyah", "♚"]
  ].map(([color, label, symbol]) =>
    el("button", {
      className: `seg-button ${color === "w" ? "active" : ""}`,
      type: "button",
      title: `${label} taşlarla oyna`,
      onClick: (event) => {
        sound.play("click");
        activate(event);
        startNewGame({ playerColor: color });
      }
    }, [el("strong", { html: symbolHTML(symbol) }), el("small", { text: label })])
  );

  /**
   * Sık kullanılan eylemler yalnızca SİMGE düğmesidir; etiket ipucu olarak
   * görünür. Böylece panel dar kalır ve tahtaya daha çok yer kalır.
   */
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

  const controls = el("div", { className: "play-tools" }, [
    toolButton("sparkles", "İpucu", async () => {
      sound.play("click");
      const hint = await game.hint();
      if (!hint) return;
      board.showHint(hint.from, hint.to);
      say(hint.text);
    }),
    toolButton("route", "Hamleyi geri al", () => {
      if (!game.undo()) return;
      sound.play("click");
      resultRecorded = false;
      reportHost.replaceChildren();
      // Hamle listesini motorun geçmişiyle eşitle.
      while (moveList.children.length > game.chess.getHistory().length) moveList.lastChild.remove();
      board.update(game.lastMove);
      board.setInteractive(true);
      say("Hamleyi geri aldık. Bu sefer daha dikkatli bak!");
      refresh();
    }),
    toolButton("target", "Konumu değerlendir", async () => {
      sound.play("click");
      say(await game.evaluationText());
    }),
    toolButton("board", "Tahtayı çevir", () => {
      sound.play("click");
      board.flip();
    }),
    toolButton("game", "Yeni oyun", () => {
      sound.play("click");
      startNewGame();
    })
  ]);

  /* ---------------------------------------------------------------- *
   * Tam ekran (odak) modu
   * ---------------------------------------------------------------- */

  // Tam ekran düğmesi ve Esc kısayolu pageUtils'te ortaktır;
  // iki kişilik oyun ekranı da aynı davranışı kullanır.
  const focusButton = focusToggle(sound);

  /* ---------------------------------------------------------------- *
   * Katlanabilir ayarlar (seviye + renk)
   *
   * Oyun başladıktan sonra bunlara nadiren dokunulur; bu yüzden varsayılan
   * olarak kapalıdır ve panelin yüksekliğini şişirmez.
   * ---------------------------------------------------------------- */

  const settingsBody = el("div", { className: "play-settings-body" }, [
    el("label", { className: "panel-label", text: "Zorluk" }),
    el("div", { className: "segmented" }, levelButtons),
    el("label", { className: "panel-label", text: "Rengin" }),
    el("div", { className: "segmented" }, colorButtons)
  ]);

  const settingsBox = el("details", { className: "play-settings" }, [
    el("summary", { text: "⚙️ Oyun ayarları" }),
    settingsBody
  ]);

  refresh();

  // Oyun ekranında başlık kompakt: dikey alan tahtaya gitsin.
  return pageShell(
    "Bilgisayara Karşı Oyna",
    "Gerçek satranç kurallarıyla oyna.",
    [
      el("section", { className: "play-layout" }, [
        el("div", { className: "play-board" }, [
          capturedByEngine,
          board.element,
          capturedByPlayer,
          thinkingBar
        ]),
        el("aside", { className: "play-panel" }, [
          el("div", { className: "panel-top" }, [controls, focusButton]),
          statusLine,
          teacherBubble,
          settingsBox,
          moveList,
          reportHost
        ])
      ])
    ],
    { compact: true }
  );
}
