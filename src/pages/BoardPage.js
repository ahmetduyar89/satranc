/**
 * BoardPage.js — "Satranç Tahtası" ekranı.
 *
 * Koordinat okuma, satranç öğrenmenin ilk ve en çok atlanan adımıdır. Bu sayfa
 * konuyu beş etkileşimli derse böler; çocuk her derste tahtaya dokunarak öğrenir:
 *   Kareler → Sütun & Yatay → Merkez → Kare Renkleri → Kurulum
 */

import { el } from "../utils/dom.js";
import { routeParam } from "../utils/router.js";
import { Chess, SQUARE_LIST, toAlgebraic, isLightSquare, toSquare } from "../engine/Chess.js";
import { ChessBoard } from "../components/ChessBoard.js";
import { icon } from "../components/Icon.js";
import { pageShell } from "./pageUtils.js";

const EMPTY = "8/8/8/8/8/8/8/8 w - - 0 1";
const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const FILES = "abcdefgh".split("");

/** Tüm kare adları. */
const ALL = SQUARE_LIST.map(toAlgebraic);

export function BoardPage({ progress, sound }) {
  // Derin bağlantı: #/board?ders=2
  let lessonIndex = Number(routeParam("ders", 0)) || 0;
  let quizTarget = null;
  let quizScore = 0;

  const tabRow = el("div", { className: "stage-row" });
  const status = el("p", { className: "lesson-status", text: "" });
  const infoPanel = el("aside", { className: "lesson-panel" });

  const board = ChessBoard({
    chess: new Chess(EMPTY),
    interactive: false,
    coordinates: true,
    onSquareClick: (square) => lessons[lessonIndex].onClick?.(square)
  });

  /** Durum satırını yazar. */
  function say(text, tone = "") {
    status.className = `lesson-status ${tone}`;
    status.textContent = text;
  }

  /* ---------------------------------------------------------------- *
   * Dersler
   * ---------------------------------------------------------------- */

  const lessons = [
    {
      title: "Kareler",
      heading: "Her karenin bir adı var",
      detail:
        "Kare adı önce SÜTUN harfi (a-h), sonra YATAY sayısı (1-8) ile okunur. Örneğin e4: e sütunu, 4. yatay. Tahtadaki her kareye dokunup adını gör.",
      setup() {
        board.attach(new Chess(EMPTY));
        board.setMarks([]);
        say("Bir kareye dokun ve adını öğren.");
      },
      onClick(square) {
        sound.play("move");
        board.setMarks([square]);
        const file = square[0].toUpperCase();
        const rank = square[1];
        say(`${square.toUpperCase()} — ${file} sütunu, ${rank}. yatay. ${isLightSquare(toSquare(square)) ? "Açık" : "Koyu"} kare.`, "info");
      }
    },

    {
      title: "Sütun & Yatay",
      heading: "Sütunlar dikey, yataylar yatay",
      detail:
        "Sütunlar (a'dan h'ye) aşağıdan yukarıya uzanır. Yataylar (1'den 8'e) soldan sağa uzanır. Bir kareye dokun; o karenin sütununu ve yatayını birlikte göstereyim.",
      setup() {
        board.attach(new Chess(EMPTY));
        board.setMarks([]);
        say("Bir kareye dokun; sütunu ve yatayı parlasın.");
      },
      onClick(square) {
        sound.play("move");
        const file = square[0];
        const rank = square[1];
        // Aynı sütundaki ve aynı yataydaki tüm kareleri işaretle.
        const marks = ALL.filter((name) => name[0] === file || name[1] === rank);
        board.setMarks(marks);
        say(`${file.toUpperCase()} sütunu ve ${rank}. yatay işaretlendi. Bu iki çizgi ${square.toUpperCase()} karesinde kesişiyor — kalenin gittiği yollar!`, "info");
      }
    },

    {
      title: "Merkez",
      heading: "Merkez en değerli bölgedir",
      detail:
        "d4, e4, d5 ve e5 kareleri tahtanın merkezidir. Merkezdeki taşlar daha çok kareye ulaşır: at merkezde 8 kareye gidebilirken köşede sadece 2 kareye gidebilir. Bu yüzden açılışta herkes merkezi ister.",
      setup() {
        board.attach(new Chess(EMPTY));
        board.setMarks(["d4", "e4", "d5", "e5"]);
        say("Parlayan dört kare merkezdir. Bir at koyup farkı görmek için karelere dokun.");
      },
      onClick(square) {
        // Seçilen kareye bir at koyup kaç kareye gidebildiğini gösteririz.
        sound.play("move");
        const index = FILES.indexOf(square[0]);
        const rank = Number(square[1]);
        const jumps = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]]
          .map(([df, dr]) => [index + df, rank + dr])
          .filter(([f, r]) => f >= 0 && f <= 7 && r >= 1 && r <= 8)
          .map(([f, r]) => `${FILES[f]}${r}`);

        board.setMarks([square, ...jumps]);
        const center = ["d4", "e4", "d5", "e5"].includes(square);
        say(
          `${square.toUpperCase()} karesindeki bir at ${jumps.length} kareye gidebilir.` +
            (center ? " Merkez! En yüksek sayı burada." : jumps.length <= 3 ? " Kenarda at çok zayıf kalıyor." : ""),
          center ? "correct" : "info"
        );
      }
    },

    {
      title: "Kare Renkleri",
      heading: "Açık ve koyu kareler",
      detail:
        "Tahtada 32 açık, 32 koyu kare vardır. Fil başladığı karenin rengini asla değiştiremez — bu yüzden herkesin bir açık kare fili, bir koyu kare fili olur. Aşağıdaki oyunu dene!",
      setup() {
        board.attach(new Chess(EMPTY));
        board.setMarks([]);
        newColorQuiz();
      },
      onClick(square) {
        if (!quizTarget) return;
        const light = isLightSquare(toSquare(square));
        const wanted = quizTarget === "light";
        if (light === wanted) {
          quizScore += 1;
          sound.play("success");
          board.setMarks([square]);
          say(`✅ Doğru! ${square.toUpperCase()} ${wanted ? "açık" : "koyu"} bir kare. Puan: ${quizScore}`, "correct");
          setTimeout(newColorQuiz, 900);
        } else {
          sound.play("error");
          board.shake(square);
          say(`${square.toUpperCase()} ${light ? "açık" : "koyu"} kare. ${wanted ? "Açık" : "Koyu"} bir kare arıyoruz!`, "wrong");
        }
      }
    },

    {
      title: "Kurulum",
      heading: "Tahta nasıl kurulur?",
      detail:
        "Altın kural: SAĞ ALT KÖŞE BEYAZ olmalı (h1 açık karedir). Kaleler köşelere, atlar yanlarına, filler onların yanına gelir. Vezir kendi rengindeki kareye oturur, şah da yanına. Piyonlar en öne dizilir.",
      setup() {
        board.attach(new Chess(START));
        board.setMarks(["h1", "d1", "e1"]);
        say("Başlangıç dizilişi. Vezir d1'de (beyaz vezir açık karede), şah e1'de, sağ alt köşe h1 açık renkte.");
      },
      onClick(square) {
        sound.play("move");
        const notes = {
          d1: "d1 — Vezir burada. 'Vezir kendi rengini sever': beyaz vezir açık karede durur.",
          e1: "e1 — Şah burada, vezirin yanında.",
          h1: "h1 — Sağ alt köşe. AÇIK renk olmalı; değilse tahta ters kurulmuştur!",
          a1: "a1 — Kale köşede. Kaleler her zaman dört köşede başlar.",
          b1: "b1 — At. Atlar kalelerin yanında durur.",
          c1: "c1 — Fil. Filler atların yanında durur."
        };
        board.setMarks([square]);
        say(notes[square] || `${square.toUpperCase()} karesi.`, "info");
      }
    }
  ];

  /** Kare rengi oyununda yeni soru üretir. */
  function newColorQuiz() {
    quizTarget = Math.random() < 0.5 ? "light" : "dark";
    board.setMarks([]);
    say(`${quizTarget === "light" ? "AÇIK" : "KOYU"} renkli bir kareye dokun. Puan: ${quizScore}`, "");
  }

  /* ---------------------------------------------------------------- *
   * Görünüm
   * ---------------------------------------------------------------- */

  function renderTabs() {
    tabRow.replaceChildren(
      ...lessons.map((lesson, index) =>
        el("button", {
          className: `stage-chip ${index === lessonIndex ? "active" : ""}`,
          type: "button",
          text: lesson.title,
          onClick: () => {
            sound.play("click");
            lessonIndex = index;
            showLesson();
          }
        })
      )
    );
  }

  function renderInfo() {
    const lesson = lessons[lessonIndex];
    infoPanel.replaceChildren(
      el("h2", { text: lesson.heading }),
      el("p", { className: "lesson-detail", text: lesson.detail }),
      el("div", { className: "panel-buttons" }, [
        el("button", {
          className: "ghost small",
          type: "button",
          html: `${icon("sound")} Sesli Anlat`,
          onClick: () => {
            sound.play("click");
            sound.speak(`${lesson.heading}. ${lesson.detail}`);
          }
        }),
        lessonIndex === lessons.length - 1
          ? el("button", {
              className: "primary small",
              type: "button",
              text: "Bu bölümü tamamladım",
              onClick: () => {
                progress.completeLesson("board-basics", 25, 2);
                sound.play("badge");
                say("🎉 Tahta bölümünü tamamladın! Artık her karenin adını biliyorsun.", "correct");
              }
            })
          : null
      ])
    );
  }

  function showLesson() {
    quizTarget = null;
    renderTabs();
    renderInfo();
    lessons[lessonIndex].setup();
  }

  showLesson();

  return pageShell(
    "Satranç Tahtası",
    "8x8 = 64 kare. Koordinatları öğrenmek satrancın alfabesidir — her karenin adını bilmeden hamle konuşulamaz.",
    [
      el("section", { className: "lesson-layout" }, [
        el("div", { className: "lesson-main" }, [tabRow, board.element, status]),
        infoPanel
      ])
    ],
    // Tahtalı sayfada büyük başlık ~150 piksel yer kaplıyor ve tahtayı
    // ekrandan taşırıyordu; başlık bloğu kompakt tutulur.
    { compact: true }
  );
}
