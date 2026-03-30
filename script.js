/**
 * MOTUS — script.js
 * Architecture orientée objet
 * Classes : MotusGame, Keyboard, ScoreManager
 */

"use strict";

/* ============================================================
   DONNÉES — Liste des mots (remplace le JSON côté PHP)
   ============================================================ */
const WORDS_DATA = [
    { mot: "risque" },
    { mot: "actuel" },
    { mot: "cheval" },
    { mot: "paquet" },
    { mot: "examen" },
    { mot: "buveur" },
    { mot: "cabine" }
];

const MAX_ATTEMPTS = 6;

/* ============================================================
   CLASSE : MotusGame — Logique centrale du jeu
   ============================================================ */
class MotusGame {

    constructor() {
        this.secretWord   = "";
        this.currentRow   = 0;
        this.currentInput = [];
        this.gameOver     = false;
        this.won          = false;
        this.keyboardState = {}; // lettre → état (correct/present/absent)
    }

    /** Choisit un mot aléatoire dans la liste */
    _pickWord() {
        const idx = Math.floor(Math.random() * WORDS_DATA.length);
        return WORDS_DATA[idx].mot.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }

    /** Initialise ou réinitialise une partie */
    start() {
        this.secretWord    = this._pickWord();
        this.currentRow    = 0;
        this.currentInput  = [];
        this.gameOver      = false;
        this.won           = false;
        this.keyboardState = {};
        UI.buildGrid(this.secretWord.length);
        UI.buildKeyboard();
        UI.updateAttempts(this.currentRow, MAX_ATTEMPTS);
        UI.setStatus("");
        UI.hideModal();
        UI.hideEndButtons();
        // Révéler la première lettre
        UI.revealFirstLetter(this.secretWord[0]);
        this.currentInput.push(this.secretWord[0]);
    }

    /** Ajoute une lettre à la saisie courante */
    addLetter(letter) {
        if (this.gameOver) return;
        if (this.currentInput.length >= this.secretWord.length) return;
        this.currentInput.push(letter.toLowerCase());
        UI.renderInput(this.currentRow, this.currentInput);
    }

    /** Supprime la dernière lettre (sauf la 1ère révélée) */
    deleteLetter() {
        if (this.gameOver) return;
        if (this.currentInput.length <= 1) return; // garder la 1ère lettre
        this.currentInput.pop();
        UI.renderInput(this.currentRow, this.currentInput);
    }

    /** Valide la proposition courante */
    submit() {
        if (this.gameOver) return;
        const word = this.secretWord;

        if (this.currentInput.length < word.length) {
            UI.shakeRow(this.currentRow);
            UI.setStatus("⚠️ Mot incomplet !");
            setTimeout(() => UI.setStatus(""), 1500);
            return;
        }

        const guess   = this.currentInput.join("");
        const result  = this._evaluate(guess);

        // Affichage avec délai en cascade
        UI.revealRow(this.currentRow, this.currentInput, result);

        // Mise à jour clavier
        result.forEach((state, i) => {
            const letter = this.currentInput[i];
            const priority = { correct: 3, present: 2, absent: 1 };
            const current  = this.keyboardState[letter];
            if (!current || priority[state] > priority[current]) {
                this.keyboardState[letter] = state;
            }
        });

        const delay = word.length * 110 + 200;
        setTimeout(() => {
            UI.updateKeyboard(this.keyboardState);

            if (guess === word) {
                this.won      = true;
                this.gameOver = true;
                const score   = this._calcScore();
                setTimeout(() => UI.showVictory(guess, this.currentRow + 1, score), 300);
                UI.showEndButtons(true, guess, this.currentRow + 1, score);
            } else {
                this.currentRow++;
                UI.updateAttempts(this.currentRow, MAX_ATTEMPTS);

                if (this.currentRow >= MAX_ATTEMPTS) {
                    this.gameOver = true;
                    setTimeout(() => UI.showDefeat(word), 300);
                    UI.showEndButtons(false);
                } else {
                    // Préparer la prochaine ligne avec la 1ère lettre
                    this.currentInput = [word[0]];
                    UI.revealFirstLetter(word[0], this.currentRow);
                    UI.setStatus("");
                }
            }
        }, delay);
    }

    /**
     * Évalue chaque lettre du guess par rapport au mot secret.
     * Retourne un tableau de 'correct' | 'present' | 'absent'
     */
    _evaluate(guess) {
        const secret = this.secretWord.split("");
        const result = Array(guess.length).fill("absent");
        const used   = Array(secret.length).fill(false);

        // Passe 1 : lettres correctes (bonne place)
        for (let i = 0; i < guess.length; i++) {
            if (guess[i] === secret[i]) {
                result[i] = "correct";
                used[i]   = true;
            }
        }

        // Passe 2 : lettres présentes mais mal placées
        for (let i = 0; i < guess.length; i++) {
            if (result[i] === "correct") continue;
            for (let j = 0; j < secret.length; j++) {
                if (!used[j] && guess[i] === secret[j]) {
                    result[i] = "present";
                    used[j]   = true;
                    break;
                }
            }
        }

        return result;
    }

    /** Score basé sur le nombre de tentatives */
    _calcScore() {
        return Math.max(100, 700 - (this.currentRow * 100));
    }

    /** Sauvegarde le score */
    saveScore() {
        const name = document.getElementById("playerName")?.value.trim();
        if (!name) { UI.setStatus("⚠️ Entre ton prénom !"); return; }
        const score = this._calcScore();
        ScoreManager.save(name, this.secretWord, this.currentRow + 1, score);
        UI.setStatus(`✅ Score de ${name} enregistré !`);
        document.getElementById("saveScorePanel").classList.add("hidden");
    }
}

/* ============================================================
   CLASSE : UI — Gestion de l'interface
   ============================================================ */
class UI {

    static buildGrid(wordLen) {
        const grid = document.getElementById("gameGrid");
        if (!grid) return;
        grid.innerHTML = "";
        for (let r = 0; r < MAX_ATTEMPTS; r++) {
            const row = document.createElement("div");
            row.classList.add("grid-row");
            row.id = `row-${r}`;
            for (let c = 0; c < wordLen; c++) {
                const cell = document.createElement("div");
                cell.classList.add("grid-cell");
                cell.id = `cell-${r}-${c}`;
                row.appendChild(cell);
            }
            grid.appendChild(row);
        }
    }

    static buildKeyboard() {
        const kb = document.getElementById("keyboard");
        if (!kb) return;
        const rows = [
            ["a","z","e","r","t","y","u","i","o","p"],
            ["q","s","d","f","g","h","j","k","l","m"],
            ["⌫","w","x","c","v","b","n","↵"]
        ];
        kb.innerHTML = "";
        rows.forEach(row => {
            const rowEl = document.createElement("div");
            rowEl.classList.add("keyboard-row");
            row.forEach(k => {
                const btn = document.createElement("button");
                btn.classList.add("key");
                btn.textContent = k;
                btn.dataset.key = k;
                if (k === "⌫")  { btn.classList.add("key-wide"); btn.onclick = () => game.deleteLetter(); }
                else if (k === "↵") {
                    btn.classList.add("key-wide","key-enter");
                    btn.onclick = () => game.submit();
                } else {
                    btn.onclick = () => game.addLetter(k);
                }
                rowEl.appendChild(btn);
            });
            kb.appendChild(rowEl);
        });
    }

    static updateKeyboard(state) {
        document.querySelectorAll(".key").forEach(btn => {
            const k = btn.dataset.key;
            if (!k || k === "⌫" || k === "↵") return;
            btn.classList.remove("key-correct","key-present","key-absent");
            if (state[k]) btn.classList.add(`key-${state[k]}`);
        });
    }

    static updateAttempts(used, total) {
        const dotsEl = document.getElementById("attemptsDots");
        if (!dotsEl) return;
        dotsEl.innerHTML = "";
        for (let i = 0; i < total; i++) {
            const d = document.createElement("div");
            d.classList.add("dot");
            if (i < used) d.classList.add("used");
            dotsEl.appendChild(d);
        }
    }

    static revealFirstLetter(letter, row = 0) {
        const cell = document.getElementById(`cell-${row}-0`);
        if (!cell) return;
        cell.textContent = letter.toUpperCase();
        cell.classList.add("revealed");
    }

    static renderInput(row, input) {
        input.forEach((letter, col) => {
            const cell = document.getElementById(`cell-${row}-${col}`);
            if (!cell) return;
            if (cell.textContent !== letter.toUpperCase()) {
                cell.textContent = letter.toUpperCase();
                if (col > 0) { // ne pas animer la 1ère lettre révélée
                    cell.classList.add("typed");
                    setTimeout(() => cell.classList.remove("typed"), 200);
                }
            }
        });
        // Effacer les cases après le curseur si on a effacé
        const wordLen = document.getElementById("gameGrid")
            ?.querySelector(".grid-row")?.querySelectorAll(".grid-cell").length || 6;
        for (let c = input.length; c < wordLen; c++) {
            const cell = document.getElementById(`cell-${row}-${c}`);
            if (cell && !cell.classList.contains("revealed") &&
                !cell.classList.contains("correct") &&
                !cell.classList.contains("present") &&
                !cell.classList.contains("absent")) {
                cell.textContent = "";
            }
        }
    }

    static revealRow(row, letters, result) {
        letters.forEach((letter, col) => {
            const cell = document.getElementById(`cell-${row}-${col}`);
            if (!cell) return;
            const state = result[col];
            setTimeout(() => {
                cell.classList.remove("revealed","active-cell");
                cell.classList.add(state, `delay-${col}`);
                cell.textContent = letter.toUpperCase();
            }, col * 110);
        });
    }

    static shakeRow(row) {
        const rowEl = document.getElementById(`row-${row}`);
        if (!rowEl) return;
        rowEl.classList.add("shake");
        setTimeout(() => rowEl.classList.remove("shake"), 600);
    }

    static setStatus(msg) {
        const el = document.getElementById("statusMessage");
        if (el) el.textContent = msg;
    }

    static showVictory(word, attempts, score) {
        const messages = [
            "🔥 Incroyable ! Parfait du premier coup !",
            "🎯 Excellent ! Tu es en feu !",
            "⚡ Très bien joué !",
            "👏 Bien trouvé !",
            "😅 Ouf, de justesse !",
            "😮‍💨 Limite… mais ça passe !"
        ];
        const msg = messages[Math.min(attempts - 1, messages.length - 1)];
        document.getElementById("modalIcon").textContent = "🎉";
        document.getElementById("modalTitle").textContent = "Bravo !";
        document.getElementById("modalText").textContent =
            `${msg}\nLe mot était « ${word.toUpperCase()} ».\nTrouvé en ${attempts} tentative${attempts > 1 ? "s" : ""} — Score : ${score} pts`;
        UI._showModal();
    }

    static showDefeat(word) {
        document.getElementById("modalIcon").textContent = "💀";
        document.getElementById("modalTitle").textContent = "Perdu !";
        document.getElementById("modalText").textContent =
            `Le mot secret était « ${word.toUpperCase()} ».\nMeilleure chance la prochaine fois !`;
        UI._showModal();
    }

    static _showModal() {
        document.getElementById("modalOverlay")?.classList.remove("hidden");
    }

    static hideModal() {
        document.getElementById("modalOverlay")?.classList.add("hidden");
    }

    static showEndButtons(won, word, attempts, score) {
        document.getElementById("btnRestart")?.classList.remove("hidden");
        if (won) {
            const panel = document.getElementById("saveScorePanel");
            if (panel) panel.classList.remove("hidden");
            // Pré-remplir le mot & score pour la sauvegarde
            panel.dataset.word     = word;
            panel.dataset.attempts = attempts;
            panel.dataset.score    = score;
        }
    }

    static hideEndButtons() {
        document.getElementById("btnRestart")?.classList.add("hidden");
        document.getElementById("saveScorePanel")?.classList.add("hidden");
    }
}

/* ============================================================
   CLASSE : ScoreManager — Persistance locale (localStorage)
   (Simule la base de données MySQL côté client)
   ============================================================ */
class ScoreManager {

    static KEY = "motus_scores";

    static _load() {
        try {
            return JSON.parse(localStorage.getItem(this.KEY) || "[]");
        } catch { return []; }
    }

    static _persist(data) {
        localStorage.setItem(this.KEY, JSON.stringify(data));
    }

    /** Enregistre un score */
    static save(name, word, attempts, score) {
        const scores = this._load();
        scores.push({
            id:       Date.now(),
            name,
            word,
            attempts,
            score,
            date: new Date().toLocaleDateString("fr-FR")
        });
        // Tri décroissant par score
        scores.sort((a, b) => b.score - a.score);
        this._persist(scores);
    }

    /** Retourne tous les scores triés */
    static getAll() {
        return this._load();
    }

    /** Vide tous les scores */
    static clear() {
        localStorage.removeItem(this.KEY);
    }

    /** Affiche les scores sur score.html */
    static display() {
        const scores = this.getAll();
        const tbody  = document.getElementById("scoreBody");
        const noEl   = document.getElementById("noScores");
        if (!tbody) return;

        tbody.innerHTML = "";

        if (scores.length === 0) {
            noEl?.classList.remove("hidden");
            return;
        }
        noEl?.classList.add("hidden");

        scores.forEach((entry, i) => {
            const tr  = document.createElement("tr");
            const rank = i === 0 ? '<span class="medal-1">🥇</span>'
                        : i === 1 ? '<span class="medal-2">🥈</span>'
                        : i === 2 ? '<span class="medal-3">🥉</span>'
                        : `<span style="color:var(--text-muted)">${i + 1}</span>`;

            tr.innerHTML = `
                <td>${rank}</td>
                <td><strong>${this._escape(entry.name)}</strong></td>
                <td><span class="word-badge">${entry.word.toUpperCase()}</span></td>
                <td style="color:var(--text-muted)">${entry.attempts} / ${MAX_ATTEMPTS}</td>
                <td><span class="score-pill">⭐ ${entry.score}</span></td>
            `;
            tbody.appendChild(tr);
        });
    }

    static _escape(str) {
        return str.replace(/[&<>"']/g, c => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
        })[c]);
    }
}

/* ============================================================
   PARTICULES DE FOND
   ============================================================ */
function createParticles() {
    const container = document.getElementById("bgParticles");
    if (!container) return;
    const colors = ["#ff3b5c","#ffd93d","#06d6a0","#4cc9f0","#b5179e"];
    for (let i = 0; i < 25; i++) {
        const p    = document.createElement("div");
        const size = Math.random() * 8 + 4;
        p.classList.add("particle");
        p.style.cssText = `
            width: ${size}px;
            height: ${size}px;
            background: ${colors[Math.floor(Math.random() * colors.length)]};
            left: ${Math.random() * 100}%;
            animation-duration: ${Math.random() * 15 + 10}s;
            animation-delay: ${Math.random() * 10}s;
        `;
        container.appendChild(p);
    }
}

/* ============================================================
   INSTANCE GLOBALE + CLAVIER PHYSIQUE
   ============================================================ */
const game = new MotusGame();

// Exposer les méthodes pour les boutons HTML
const Game = {
    restart() {
        game.start();
    },
    saveScore() {
        game.saveScore();
    }
};

const Scores = {
    display() { ScoreManager.display(); },
    clearAll() {
        if (confirm("Effacer tous les scores ?")) {
            ScoreManager.clear();
            ScoreManager.display();
        }
    }
};

// Clavier physique
document.addEventListener("keydown", e => {
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    const key = e.key;
    if (key === "Enter")     { game.submit(); }
    else if (key === "Backspace") { game.deleteLetter(); }
    else if (/^[a-zA-ZàâäéèêëîïôöùûüÿçÀÂÄÉÈÊËÎÏÔÖÙÛÜŸÇ]$/.test(key)) {
        // Normaliser les accents
        const normalized = key.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        game.addLetter(normalized);
    }
});

/* ============================================================
   DÉMARRAGE
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
    createParticles();
    // Ne démarrer le jeu que sur la page de jeu
    if (document.getElementById("gameGrid")) {
        game.start();
    }
    // Sur la page scores, afficher les scores
    if (document.getElementById("scoreBody") && !document.getElementById("gameGrid")) {
        ScoreManager.display();
    }
});
