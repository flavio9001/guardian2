<?php
require_once 'db_config.php';

header('Content-Type: application/json');

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8mb4", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    echo json_encode(['error' => 'Connection failed: ' . $e->getMessage()]);
    exit;
}

$request_uri = explode('/', trim($_SERVER['PATH_INFO'] ?? '', '/'));
$method = $_SERVER['REQUEST_METHOD'];

if ($request_uri[0] === 'state' && $method === 'GET') {
    $stmt = $pdo->query("SELECT * FROM states");
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
} elseif ($request_uri[0] === 'people' && ($request_uri[1] ?? '') === 'public' && $method === 'GET') {
    $stmt = $pdo->query("SELECT id, name, email, address FROM people");
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
} else {
    http_response_code(404);
    echo json_encode(['error' => 'Route not found']);
}