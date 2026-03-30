<?php
/**
 * MOTUS — motus.php
 * Version PHP orientée objet
 * Ce fichier remplace motus.html dans un environnement serveur PHP.
 * Il gère aussi la sauvegarde des scores en base de données MySQL.
 *
 * Configuration BDD : adapter les constantes DB_* ci-dessous.
 */

declare(strict_types=1);

// ─────────────────────────────────────────────
// CONFIGURATION BASE DE DONNÉES
// ─────────────────────────────────────────────
define('DB_HOST', 'localhost');
define('DB_NAME', 'motus');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_CHARSET', 'utf8mb4');

// ─────────────────────────────────────────────
// CLASSE : Database — Connexion PDO Singleton
// ─────────────────────────────────────────────
class Database
{
    private static ?PDO $instance = null;

    public static function getInstance(): ?PDO
    {
        if (self::$instance === null) {
            try {
                $dsn = sprintf(
                    'mysql:host=%s;dbname=%s;charset=%s',
                    DB_HOST, DB_NAME, DB_CHARSET
                );
                self::$instance = new PDO($dsn, DB_USER, DB_PASS, [
                    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES   => false,
                ]);
            } catch (PDOException $e) {
                // En prod, logger l'erreur plutôt que de l'afficher
                error_log('DB Error: ' . $e->getMessage());
                return null;
            }
        }
        return self::$instance;
    }
}

// ─────────────────────────────────────────────
// CLASSE : WordRepository — Gestion des mots
// ─────────────────────────────────────────────
class WordRepository
{
    /** Liste de mots intégrée (fallback si pas de BDD) */
    private static array $words = [
        'risque', 'actuel', 'cheval', 'paquet',
        'examen', 'buveur', 'cabine'
    ];

    /** Retourne un mot aléatoire */
    public static function getRandom(): string
    {
        return self::$words[array_rand(self::$words)];
    }

    /** Enregistre un mot joué en base (table word) */
    public static function savePlayedWord(string $word): bool
    {
        $db = Database::getInstance();
        if ($db === null) return false;

        try {
            // Créer la table si elle n'existe pas
            $db->exec("
                CREATE TABLE IF NOT EXISTS `word` (
                    `id`   INT AUTO_INCREMENT PRIMARY KEY,
                    `word` VARCHAR(255) NOT NULL
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            ");

            $stmt = $db->prepare("INSERT INTO `word` (`word`) VALUES (:word)");
            $stmt->execute([':word' => $word]);
            return true;
        } catch (PDOException $e) {
            error_log('SaveWord Error: ' . $e->getMessage());
            return false;
        }
    }

    /** Récupère tous les mots joués */
    public static function getAllPlayed(): array
    {
        $db = Database::getInstance();
        if ($db === null) return [];

        try {
            $stmt = $db->query("SELECT * FROM `word` ORDER BY `id` DESC");
            return $stmt->fetchAll();
        } catch (PDOException $e) {
            return [];
        }
    }
}

// ─────────────────────────────────────────────
// CLASSE : ScoreRepository — Gestion des scores
// ─────────────────────────────────────────────
class ScoreRepository
{
    /** Initialise la table scores si besoin */
    public static function init(): void
    {
        $db = Database::getInstance();
        if ($db === null) return;

        try {
            $db->exec("
                CREATE TABLE IF NOT EXISTS `scores` (
                    `id`       INT AUTO_INCREMENT PRIMARY KEY,
                    `name`     VARCHAR(100) NOT NULL,
                    `word`     VARCHAR(255) NOT NULL,
                    `attempts` TINYINT UNSIGNED NOT NULL,
                    `score`    INT UNSIGNED NOT NULL DEFAULT 0,
                    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            ");
        } catch (PDOException $e) {
            error_log('ScoreInit Error: ' . $e->getMessage());
        }
    }

    /** Enregistre un score */
    public static function save(string $name, string $word, int $attempts, int $score): bool
    {
        $db = Database::getInstance();
        if ($db === null) return false;

        self::init();

        try {
            $stmt = $db->prepare("
                INSERT INTO `scores` (`name`, `word`, `attempts`, `score`)
                VALUES (:name, :word, :attempts, :score)
            ");
            return $stmt->execute([
                ':name'     => htmlspecialchars($name, ENT_QUOTES, 'UTF-8'),
                ':word'     => $word,
                ':attempts' => $attempts,
                ':score'    => $score,
            ]);
        } catch (PDOException $e) {
            error_log('SaveScore Error: ' . $e->getMessage());
            return false;
        }
    }

    /** Retourne les scores triés par score décroissant */
    public static function getTop(int $limit = 50): array
    {
        $db = Database::getInstance();
        if ($db === null) return [];

        self::init();

        try {
            $stmt = $db->prepare("
                SELECT * FROM `scores`
                ORDER BY `score` DESC, `attempts` ASC
                LIMIT :limit
            ");
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->execute();
            return $stmt->fetchAll();
        } catch (PDOException $e) {
            return [];
        }
    }
}

// ─────────────────────────────────────────────
// TRAITEMENT DES REQUÊTES AJAX
// ─────────────────────────────────────────────
header('Content-Type: text/html; charset=UTF-8');

// API JSON pour les appels AJAX
if (isset($_GET['api'])) {
    header('Content-Type: application/json; charset=UTF-8');

    switch ($_GET['api']) {

        // GET /motus.php?api=word → retourne un mot aléatoire
        case 'word':
            $word = WordRepository::getRandom();
            WordRepository::savePlayedWord($word);
            echo json_encode(['word' => $word]);
            break;

        // POST /motus.php?api=score → enregistre un score
        case 'score':
            if ($_SERVER['REQUEST_METHOD'] === 'POST') {
                $body     = json_decode(file_get_contents('php://input'), true);
                $name     = trim($body['name']     ?? '');
                $word     = trim($body['word']     ?? '');
                $attempts = (int)($body['attempts'] ?? 0);
                $score    = (int)($body['score']    ?? 0);

                if ($name && $word && $attempts > 0 && $score >= 0) {
                    $ok = ScoreRepository::save($name, $word, $attempts, $score);
                    echo json_encode(['success' => $ok]);
                } else {
                    http_response_code(400);
                    echo json_encode(['error' => 'Données invalides']);
                }
            }
            break;

        // GET /motus.php?api=scores → retourne les scores
        case 'scores':
            echo json_encode(ScoreRepository::getTop(50));
            break;

        default:
            http_response_code(404);
            echo json_encode(['error' => 'Endpoint inconnu']);
    }
    exit;
}

// ─────────────────────────────────────────────
// RENDU HTML (page principale PHP)
// ─────────────────────────────────────────────
$randomWord = WordRepository::getRandom();
WordRepository::savePlayedWord($randomWord);
?>
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MOTUS — Le Jeu de Mots</title>
    <link rel="stylesheet" href="style.css">
    <link href="https://fonts.googleapis.com/css2?family=Black+Han+Sans&family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet">
</head>
<body>

    <div class="bg-particles" id="bgParticles"></div>

    <header class="header">
        <div class="header-inner">
            <div class="logo">
                <span class="logo-m">M</span>
                <span class="logo-o">O</span>
                <span class="logo-t">T</span>
                <span class="logo-u">U</span>
                <span class="logo-s">S</span>
            </div>
            <nav class="nav-links">
                <a href="motus.php" class="nav-link active">🎮 Jouer</a>
                <a href="score.php" class="nav-link">🏆 Scores</a>
            </nav>
        </div>
    </header>

    <main class="game-container">

        <div class="attempts-bar">
            <span class="attempts-label">Tentatives :</span>
            <div class="attempts-dots" id="attemptsDots"></div>
        </div>

        <div class="grid-wrapper">
            <div class="game-grid" id="gameGrid"></div>
        </div>

        <div class="keyboard" id="keyboard"></div>

        <div class="status-message" id="statusMessage"></div>

        <button class="btn-restart hidden" id="btnRestart" onclick="Game.restart()">
            🔄 Nouvelle partie
        </button>

        <div class="save-score-panel hidden" id="saveScorePanel">
            <input type="text" id="playerName" placeholder="Ton prénom..." maxlength="20" class="name-input">
            <button class="btn-save" onclick="Game.saveScore()">💾 Enregistrer mon score</button>
        </div>

    </main>

    <div class="modal-overlay hidden" id="modalOverlay">
        <div class="modal" id="modal">
            <div class="modal-icon" id="modalIcon"></div>
            <h2 class="modal-title" id="modalTitle"></h2>
            <p class="modal-text" id="modalText"></p>
            <div class="modal-buttons">
                <button class="btn-modal-primary" onclick="Game.restart()">🔄 Rejouer</button>
                <a href="score.php" class="btn-modal-secondary">🏆 Voir les scores</a>
            </div>
        </div>
    </div>

    <!-- Mot injecté côté PHP pour éviter un appel AJAX supplémentaire -->
    <script>
        // Le mot est injecté par PHP de manière sécurisée
        window.PHP_WORD = <?= json_encode(strtolower($randomWord)) ?>;
        window.USE_PHP_API = true; // Active l'API PHP pour sauvegarder les scores
    </script>
    <script src="script.js"></script>
</body>
</html>
