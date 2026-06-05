<?php
header('Content-Type: application/json');

// Carrega as configurações do seu arquivo db_config.php
$config = require 'db_config.php';

try {
    $dsn = "mysql:host={$config['host']};dbname={$config['database']};charset={$config['charset']}";
    $pdo = new PDO($dsn, $config['username'], $config['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);

    // Pega o caminho solicitado pelo app.js (ex: state ou people/public)
    $path = $_GET['path'] ?? '';

    if ($path === 'people/public') {
        $stmt = $pdo->query("SELECT id, name, username FROM sol_people WHERE active = 1");
        echo json_encode($stmt->fetchAll());
    } elseif ($path === 'state') {
        // Retorna o estado completo para o Dashboard
        $people = $pdo->query("SELECT * FROM sol_people ORDER BY name")->fetchAll();
        $groups = $pdo->query("SELECT * FROM sol_groups")->fetchAll();
        echo json_encode(['people' => $people, 'groups' => $groups]);
    } else {
        http_response_code(404);
        echo json_encode(['error' => 'Rota não encontrada']);
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Falha na conexão', 'details' => $e->getMessage()]);
}