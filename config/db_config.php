<?php
// config/db_config.php - PROTEGIDO

define('DB_HOST', 'localhost');                    // ou o host do Hostinger
define('DB_NAME', 'u104148794_sol2026');
define('DB_USER', 'u104148794_rochabill');
define('DB_PASS', 'Flafrl@1');                     // ← Mude esta senha urgentemente!

// Conexão (usada pelo api.php)
try {
    $pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4", DB_USER, DB_PASS);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    error_log("Erro de conexão com banco: " . $e->getMessage());
    die("Erro interno do servidor.");
}
?>