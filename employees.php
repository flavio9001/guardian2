<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$host = 'localhost';
$db = 'seu_banco';
$user = 'seu_usuario';
$pass = 'sua_senha';
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

function log_message($message) {
    error_log("[Guardian API] " . $message);
}

function check_rate_limit() {
    $cache_file = 'rate_limit.txt';
    $now = time();
    $data = file_exists($cache_file) ? json_decode(file_get_contents($cache_file), true) : [];
    
    $ip = $_SERVER['REMOTE_ADDR'];
    if (isset($data[$ip]) && ($now - $data[$ip]['time'] < 10)) {
        http_response_code(429);
        echo json_encode(['error' => 'Too many requests']);
        exit;
    }
    $data[$ip] = ['time' => $now];
    file_put_contents($cache_file, json_encode($data));
}

try {
    check_rate_limit();
    
    $cache_file = 'employees_cache.json';
    if (file_exists($cache_file) && (time() - filemtime($cache_file) < 300)) {
        echo file_get_contents($cache_file);
        exit;
    }

    $pdo = new PDO($dsn, $user, $pass, $options);
    $stmt = $pdo->query("SELECT id, nome, cargo, departamento FROM funcionarios");
    $employees = $stmt->fetchAll();

    $response = ['status' => 'success', 'data' => $employees];
    $json_data = json_encode($response);
    
    file_put_contents($cache_file, $json_data);
    echo $json_data;

} catch (PDOException $e) {
    log_message("Database Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Internal Server Error']);
} catch (Exception $e) {
    log_message("General Error: " . $e->getMessage());
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}