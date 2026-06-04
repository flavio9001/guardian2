<?php
function check($condition, $success, $fail) {
    return $condition ? "<span style='color:green'>&#10004; $success</span>" : "<span style='color:red'>&#10008; $fail</span>";
}

$db_config = ['host' => 'localhost', 'db' => 'test', 'user' => 'root', 'pass' => ''];

header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html>
<head><title>Diagnóstico do Sistema</title></head>
<body>
<h1>Relatório de Diagnóstico</h1>
<ul>
    <li>PHP: <?php echo phpversion(); ?></li>
    <li>PDO: <?php echo check(extension_loaded('pdo'), 'Habilitado', 'Desabilitado'); ?></li>
    <li>MySQLi: <?php echo check(extension_loaded('mysqli'), 'Habilitado', 'Desabilitado'); ?></li>
    <li>
        Conexão DB: 
        <?php
        try {
            $pdo = new PDO("mysql:host={$db_config['host']};dbname={$db_config['db']}", $db_config['user'], $db_config['pass']);
            echo check(true, 'Conectado', '');
        } catch (Exception $e) {
            echo check(false, '', 'Erro: ' . $e->getMessage());
        }
        ?>
    </li>
    <li>Arquivos no diretório: <?php echo count(scandir('.')); ?> encontrados.</li>
    <li>Permissões (./): <?php echo is_writable('.') ? "<span style='color:green'>Escritível</span>" : "<span style='color:red'>Somente Leitura</span>"; ?></li>
    <li>api.php: <?php echo check(file_exists('api.php'), 'Existe', 'Não encontrado'); ?></li>
    <li>check_database.php: <?php echo check(file_exists('check_database.php'), 'Existe', 'Não encontrado'); ?></li>
</ul>
</body>
</html>