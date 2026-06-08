<?php
ini_set('display_errors', '1');
ini_set('display_startup_errors', '1');
error_reporting(E_ALL);

echo "<pre style='font-family:monospace;font-size:14px;padding:20px'>";
echo "=== SOL EQUIPES — DEBUG INICIAL ===\n\n";

// 1. Versão do PHP
echo "PHP versão  : " . PHP_VERSION . "\n";
echo "PHP SAPI    : " . PHP_SAPI . "\n";
echo "Diretório   : " . __DIR__ . "\n\n";

// 2. Extensões necessárias
$exts = ['pdo', 'pdo_mysql', 'json', 'mbstring'];
foreach ($exts as $ext) {
    echo "Extensão $ext : " . (extension_loaded($ext) ? "✅ OK" : "❌ AUSENTE") . "\n";
}
echo "\n";

// 3. Arquivos necessários
$files = ['db_config.php', 'api.php', 'database.sql'];
foreach ($files as $f) {
    $path = __DIR__ . '/' . $f;
    echo "Arquivo $f : " . (file_exists($path) ? "✅ existe" : "❌ NÃO encontrado") . "\n";
}
echo "\n";

// 4. Leitura do db_config
$cfgPath = __DIR__ . '/db_config.php';
if (!file_exists($cfgPath)) {
    echo "❌ db_config.php não encontrado — abortando.\n";
    exit;
}
$cfg = require $cfgPath;
echo "Config host : {$cfg['host']}\n";
echo "Config db   : {$cfg['database']}\n";
echo "Config user : {$cfg['username']}\n\n";

// 5. Teste de conexão PDO
try {
    $dsn = "mysql:host={$cfg['host']};dbname={$cfg['database']};charset=" . ($cfg['charset'] ?? 'utf8mb4');
    $pdo = new PDO($dsn, $cfg['username'], $cfg['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    ]);
    $row = $pdo->query("SELECT VERSION() AS v, NOW() AS t")->fetch(PDO::FETCH_ASSOC);
    echo "✅ CONEXÃO OK\n";
    echo "   MySQL versão : {$row['v']}\n";
    echo "   Hora no DB   : {$row['t']}\n\n";
} catch (PDOException $e) {
    echo "❌ FALHA NA CONEXÃO:\n   " . $e->getMessage() . "\n\n";
    exit;
}

// 6. Tabelas existentes
echo "Tabelas no banco:\n";
$tables = $pdo->query(
    "SELECT TABLE_NAME, TABLE_ROWS
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
     ORDER BY TABLE_NAME"
)->fetchAll(PDO::FETCH_ASSOC);

if (!$tables) {
    echo "   (nenhuma tabela encontrada — banco vazio)\n";
} else {
    foreach ($tables as $t) {
        echo "   • {$t['TABLE_NAME']} (~{$t['TABLE_ROWS']} linhas)\n";
    }
}

echo "\n=== FIM DO DEBUG ===\n";
echo "</pre>";
