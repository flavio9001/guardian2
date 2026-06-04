<?php
require_once 'db_config.php';

try {
    $stmt = $pdo->query("SHOW TABLES");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);

    echo "<style>body { font-family: sans-serif; background: #f4f4f4; padding: 20px; } .table-box { background: white; margin-bottom: 20px; padding: 15px; border-radius: 8px; border-left: 5px solid #3498db; } h2 { color: #2c3e50; } table { border-collapse: collapse; width: 100%; margin-top: 10px; } th, td { border: 1px solid #ddd; padding: 8px; text-align: left; } th { background: #f2f2f2; }</style>";

    echo "<h1>Banco de Dados: Listagem de Tabelas</h1>";

    foreach ($tables as $table) {
        echo "<div class='table-box'>";
        echo "<h2>Tabela: " . htmlspecialchars($table) . "</h2>";

        $count = $pdo->query("SELECT COUNT(*) FROM `" . $table . "`")->fetchColumn();
        echo "<p><strong>Total de registros:</strong> " . $count . "</p>";

        $data = $pdo->query("SELECT * FROM `" . $table . "` LIMIT 5")->fetchAll(PDO::FETCH_ASSOC);

        if ($data) {
            echo "<table><tr>";
            foreach (array_keys($data[0]) as $col) echo "<th>" . htmlspecialchars($col) . "</th>";
            echo "</tr>";
            foreach ($data as $row) {
                echo "<tr>";
                foreach ($row as $val) echo "<td>" . htmlspecialchars($val) . "</td>";
                echo "</tr>";
            }
            echo "</table>";
        } else {
            echo "<p>Tabela vazia.</p>";
        }
        echo "</div>";
    }
} catch (PDOException $e) {
    echo "Erro: " . $e->getMessage();
}
?>