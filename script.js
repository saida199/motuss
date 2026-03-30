document.addEventListener("DOMContentLoaded", function() {
    const container = document.getElementById("game-container");
    const input = document.getElementById("guess-input");
    const button = document.getElementById("guess-btn");

    const wordLength = solution.length;
    let currentTry = 0;

    // Générer la grille
    for (let i = 0; i < maxTries * wordLength; i++) {
        const cell = document.createElement("div");
        cell.className = "cell";
        container.appendChild(cell);
    }

    // Afficher la première lettre du mot
    container.children[0].textContent = solution[0];

    button.addEventListener("click", () => {
        const guess = input.value.toUpperCase();

        if (guess.length !== wordLength) {
            alert(`Le mot doit avoir ${wordLength} lettres !`);
            return;
        }

        const start = currentTry * wordLength;

        let solutionArr = solution.split("");
        let guessArr = guess.split("");

        // Lettres correctes (vert)
        for (let i = 0; i < wordLength; i++) {
            if (guessArr[i] === solutionArr[i]) {
                container.children[start + i].classList.add("correct");
                solutionArr[i] = null;
                guessArr[i] = null;
            }
        }

        // Lettres mal placées (orange)
        for (let i = 0; i < wordLength; i++) {
            if (guessArr[i] && solutionArr.includes(guessArr[i])) {
                container.children[start + i].classList.add("misplaced");
                solutionArr[solutionArr.indexOf(guessArr[i])] = null;
            } else if (guessArr[i]) {
                container.children[start + i].classList.add("absent");
            }
        }

        // Afficher les lettres
        for (let i = 0; i < wordLength; i++) {
            container.children[start + i].textContent = guess[i];
        }

        currentTry++;
        input.value = "";

        if (guess === solution) {
            alert("Bravo, tu as trouvé le mot !");
            input.disabled = true;
            button.disabled = true;
        } else if (currentTry === maxTries) {
            alert(`Game over ! Le mot était : ${solution}`);
            input.disabled = true;
            button.disabled = true;
        }
    });
});
