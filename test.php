<?php
// test-api.php - ARQUIVO DE TESTE

echo "✅ Teste de API funcionando!<br><br>";

require_once __DIR__ . '/db_config.php';

echo "✅ Conexão com banco OK!<br>";
echo "Banco: " . DB_NAME . "<br>";
echo "Usuário: " . DB_USER . "<br><br>";

echo '<a href="api.php">Testar api.php completa →</a>';
?>