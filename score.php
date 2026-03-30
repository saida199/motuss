<?php
// Connexion à la base motus
$pdo = new PDO('mysql:host=localhost;dbname=motus;charset=utf8', 'root', ''); 

if (isset($_POST['player']) && isset($_POST['score'])) {
    $stmt = $pdo->prepare("INSERT INTO word (word) VALUES (?)");
    $stmt->execute([$_POST['player'] . " : " . $_POST['score']]);
}

// Récupération des scores
$scores = $pdo->query("SELECT * FROM word ORDER BY id DESC")->fetchAll(PDO::FETCH_ASSOC);
?>

<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Wall of Fame</title>
</head>
<body>
    <h1>Wall of Fame</h1>
    <ul>
        <?php foreach($scores as $s): ?>
            <li><?= htmlspecialchars($s['word']) ?></li>
        <?php endforeach; ?>
    </ul>
</body>
</html>
