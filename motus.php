<?php
// motus.php
session_start();

// Classe pour gérer le mot
class Motus {
    private $words;

    public function __construct($jsonFile) {
        // Lire le JSON et transformer en tableau PHP
        $this->words = json_decode(file_get_contents($jsonFile), true);
    }

    // Retourne un mot aléatoire en majuscules
    public function randomWord() {
        $index = array_rand($this->words);
        return strtoupper($this->words[$index]['mot']);
    }
}

// Si aucun mot n'est en session, en choisir un
if (!isset($_SESSION['solution'])) {
    $motus = new Motus('words.json');
    $_SESSION['solution'] = $motus->randomWord();
    $_SESSION['tries'] = 0;
}

$solution = $_SESSION['solution'];
?>

<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Motus</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <h1>Motus</h1>
    <p>Trouvez le mot en 6 essais ! La première lettre est donnée :</p>

    <div id="game-container"></div>

    <input type="text" id="guess-input" maxlength="<?= strlen($solution) ?>" placeholder="Tape ton mot">
    <button id="guess-btn">Valider</button>

    <!-- Passer la solution et le nombre de tentatives au JS -->
    <script>
        const solution = "<?= $solution ?>";
        const maxTries = 6;
    </script>
    <script src="script.js"></script>
</body>
</html>
