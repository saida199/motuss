<?php
/**
 * MOTUS — score.php
 * Page Wall of Fame — affiche les scores depuis la BDD MySQL
 * Orientée objet, utilise les classes définies dans motus.php
 */

declare(strict_types=1);

// Inclure les classes partagées (Database, ScoreRepository)
require_once __DIR__ . '/motus.php';

// Cette page ne fait que le rendu HTML : on ne re-execute pas le bloc PHP de motus.php
// En production, ces classes seraient dans un fichier classes.php séparé.
// Ici on exploite le fait que motus.php ne produit du HTML que si on n'est pas en mode API.

$scores = ScoreRepository::getTop(50);
?>
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MOTUS — Wall of Fame</title>
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
                <a href="motus.php" class="nav-link">🎮 Jouer</a>
                <a href="score.php" class="nav-link active">🏆 Scores</a>
            </nav>
        </div>
    </header>

    <main class="score-container">

        <div class="score-header">
            <h1 class="score-title">🏆 Wall of Fame</h1>
            <p class="score-subtitle">Les meilleurs joueurs Motus</p>
        </div>

        <div class="score-table-wrapper">
            <?php if (empty($scores)): ?>
                <div class="no-scores">
                    <p>😴 Aucun score enregistré pour l'instant.</p>
                    <a href="motus.php" class="btn-modal-primary"
                       style="display:inline-block;margin-top:1rem;">
                       Jouer maintenant !
                    </a>
                </div>
            <?php else: ?>
                <table class="score-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Joueur</th>
                            <th>Mot trouvé</th>
                            <th>Tentatives</th>
                            <th>Score</th>
                            <th>Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($scores as $i => $entry): ?>
                        <tr>
                            <td>
                                <?php if ($i === 0): ?>
                                    <span class="medal-1">🥇</span>
                                <?php elseif ($i === 1): ?>
                                    <span class="medal-2">🥈</span>
                                <?php elseif ($i === 2): ?>
                                    <span class="medal-3">🥉</span>
                                <?php else: ?>
                                    <span style="color:var(--text-muted)"><?= $i + 1 ?></span>
                                <?php endif; ?>
                            </td>
                            <td><strong><?= htmlspecialchars($entry['name'], ENT_QUOTES, 'UTF-8') ?></strong></td>
                            <td>
                                <span class="word-badge">
                                    <?= strtoupper(htmlspecialchars($entry['word'], ENT_QUOTES, 'UTF-8')) ?>
                                </span>
                            </td>
                            <td style="color:var(--text-muted)">
                                <?= (int)$entry['attempts'] ?> / 6
                            </td>
                            <td>
                                <span class="score-pill">⭐ <?= (int)$entry['score'] ?></span>
                            </td>
                            <td style="color:var(--text-muted);font-size:.85rem">
                                <?= htmlspecialchars(
                                    date('d/m/Y', strtotime($entry['created_at'])),
                                    ENT_QUOTES, 'UTF-8'
                                ) ?>
                            </td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            <?php endif; ?>
        </div>

        <div style="text-align:center;margin-top:2rem;">
            <a href="motus.php" class="btn-restart" style="text-decoration:none;display:inline-block;">
                🎮 Nouvelle partie
            </a>
        </div>

    </main>

    <script src="script.js"></script>
    <script>
        document.addEventListener('DOMContentLoaded', createParticles);
    </script>
</body>
</html>
