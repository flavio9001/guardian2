<?php
/**
 * SOL EQUIPES — Diagnóstico Completo do Banco de Dados
 * =====================================================
 * Suba este arquivo na raiz do site (mesma pasta de api.php)
 * e acesse: https://seudominio.com/diagnostico.php
 *
 * SEGURANÇA: remova ou proteja este arquivo após o diagnóstico.
 */
declare(strict_types=1);
set_time_limit(30);
error_reporting(E_ALL);
ini_set('display_errors', '0');

// ── Helpers de resultado ─────────────────────────────────────
$results = [];
function ok(string $section, string $msg, string $detail = ''): void {
    global $results;
    $results[] = ['status' => 'ok', 'section' => $section, 'msg' => $msg, 'detail' => $detail];
}
function warn(string $section, string $msg, string $detail = ''): void {
    global $results;
    $results[] = ['status' => 'warn', 'section' => $section, 'msg' => $msg, 'detail' => $detail];
}
function fail(string $section, string $msg, string $detail = ''): void {
    global $results;
    $results[] = ['status' => 'fail', 'section' => $section, 'msg' => $msg, 'detail' => $detail];
}

// ── 1. Leitura da configuração ────────────────────────────────
$cfgFile = __DIR__ . '/db_config.php';
if (!file_exists($cfgFile)) {
    fail('Config', 'db_config.php não encontrado', 'Verifique se o arquivo está na mesma pasta.');
    goto render;
}
$cfg = require $cfgFile;
ok('Config', 'db_config.php lido com sucesso',
   "Host: {$cfg['host']} | DB: {$cfg['database']} | User: {$cfg['username']}");

// ── 2. Conexão PDO ────────────────────────────────────────────
try {
    $dsn = "mysql:host={$cfg['host']};dbname={$cfg['database']};charset=" . ($cfg['charset'] ?? 'utf8mb4');
    $pdo = new PDO($dsn, $cfg['username'], $cfg['password'], [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ]);
    $row = $pdo->query("SELECT VERSION() AS v, NOW() AS t, @@character_set_database AS cs")->fetch();
    ok('Conexão', 'Conectado ao MySQL com sucesso',
       "Versão: {$row['v']} | Hora DB: {$row['t']} | Charset: {$row['cs']}");
} catch (PDOException $e) {
    fail('Conexão', 'Falha ao conectar ao MySQL', $e->getMessage());
    goto render;
}

// ── 3. Existência e estrutura das tabelas ────────────────────
$expectedTables = [
    'sol_people' => [
        'id','name','role','group_id','manager_id','phones_json','whatsapp',
        'email','address','availability_json','period','summary','photo',
        'username','password_hash','user_type','is_vip','active','created_at','updated_at'
    ],
    'sol_groups' => ['id','name','vip_id','color','created_at','updated_at'],
    'sol_chat_rooms' => ['id','name','type','group_id','created_at','updated_at'],
    'sol_chat_room_members' => ['room_id','person_id','created_at'],
    'sol_chat_messages' => ['id','room_id','author_id','author_name','message_text','created_at_ms','created_at'],
    'sol_schedule_days' => ['id','group_id','month_ref','work_date','assignments_json','updated_at'],
];

$existingTables = $pdo->query(
    "SELECT TABLE_NAME FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() ORDER BY TABLE_NAME"
)->fetchAll(PDO::FETCH_COLUMN);

foreach ($expectedTables as $table => $expectedCols) {
    if (!in_array($table, $existingTables, true)) {
        fail('Tabelas', "Tabela AUSENTE: $table", 'Execute o SQL de criação e acesse /setup_mysql.php');
        continue;
    }
    // Verifica colunas
    $cols = $pdo->query(
        "SELECT COLUMN_NAME FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '$table'
         ORDER BY ORDINAL_POSITION"
    )->fetchAll(PDO::FETCH_COLUMN);

    $missing = array_diff($expectedCols, $cols);
    if ($missing) {
        warn('Tabelas', "Colunas ausentes em $table", implode(', ', $missing));
    } else {
        $count = (int) $pdo->query("SELECT COUNT(*) FROM `$table`")->fetchColumn();
        ok('Tabelas', "Tabela OK: $table", "$count linha(s)");
    }
}

// ── 4. Chaves únicas e índices ────────────────────────────────
$idxCheck = [
    ['sol_people',       'uq_people_username'],
    ['sol_schedule_days','uq_schedule_day'],
];
foreach ($idxCheck as [$tbl, $idx]) {
    $found = $pdo->query(
        "SELECT COUNT(*) FROM information_schema.STATISTICS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '$tbl' AND INDEX_NAME = '$idx'"
    )->fetchColumn();
    if ($found) {
        ok('Índices', "Índice presente: $idx em $tbl");
    } else {
        warn('Índices', "Índice ausente: $idx em $tbl",
             'Pode haver risco de duplicatas — verifique o SQL de criação.');
    }
}

// ── 5. Seed: verifica dados iniciais ─────────────────────────
$peopleCount = (int) $pdo->query("SELECT COUNT(*) FROM sol_people")->fetchColumn();
$groupsCount = (int) $pdo->query("SELECT COUNT(*) FROM sol_groups")->fetchColumn();
$roomsCount  = (int) $pdo->query("SELECT COUNT(*) FROM sol_chat_rooms")->fetchColumn();

if ($peopleCount === 0) {
    fail('Seed', 'Nenhuma pessoa cadastrada',
         'Acesse /setup_mysql.php para inserir os dados iniciais.');
} else {
    ok('Seed', "$peopleCount pessoa(s) cadastrada(s)");
}
if ($groupsCount === 0) {
    fail('Seed', 'Nenhum grupo cadastrado');
} else {
    ok('Seed', "$groupsCount grupo(s) cadastrado(s)");
}
if ($roomsCount === 0) {
    warn('Seed', 'Nenhuma sala de chat criada',
         'sync_rooms() será chamado no próximo acesso à API.');
} else {
    ok('Seed', "$roomsCount sala(s) de chat criada(s)");
}

// Sala geral
$general = $pdo->query("SELECT id FROM sol_chat_rooms WHERE type = 'general'")->fetchColumn();
if ($general) {
    ok('Seed', 'Sala geral de chat presente (id=' . $general . ')');
} else {
    warn('Seed', 'Sala geral de chat ausente', 'Será criada automaticamente pela API.');
}

// ── 6. Integridade referencial (FKs lógicas) ─────────────────
// Pessoas com group_id inválido
$orphan = (int) $pdo->query(
    "SELECT COUNT(*) FROM sol_people p
     LEFT JOIN sol_groups g ON g.id = p.group_id
     WHERE p.group_id IS NOT NULL AND p.group_id != '' AND g.id IS NULL"
)->fetchColumn();
if ($orphan > 0) {
    warn('Integridade', "$orphan pessoa(s) com group_id inválido (grupo inexistente)");
} else {
    ok('Integridade', 'Todas as pessoas têm group_id válido (ou nulo)');
}

// Grupos com vip_id inválido
$orphanVip = (int) $pdo->query(
    "SELECT COUNT(*) FROM sol_groups g
     LEFT JOIN sol_people p ON p.id = g.vip_id
     WHERE g.vip_id IS NOT NULL AND p.id IS NULL"
)->fetchColumn();
if ($orphanVip > 0) {
    warn('Integridade', "$orphanVip grupo(s) com vip_id inválido (pessoa inexistente)");
} else {
    ok('Integridade', 'Todos os grupos têm vip_id válido (ou nulo)');
}

// ── 7. Operações CRUD simuladas (dados temporários) ──────────
$tempId = 'diag-tmp-' . bin2hex(random_bytes(4));
try {
    // INSERT pessoa
    $pdo->prepare(
        "INSERT INTO sol_people
         (id, name, role, group_id, manager_id, phones_json, whatsapp, email, address,
          availability_json, period, summary, photo, username, password_hash,
          user_type, is_vip, active, created_at)
         VALUES (?, 'Diagnóstico Temp', 'Teste', NULL, NULL, '[]', '', '', '',
                 '[]', '', '', '', ?, '$2y$10$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA.',
                 'colaborador', 0, 1, ?)"
    )->execute([$tempId, $tempId, time() * 1000]);
    ok('CRUD', 'INSERT em sol_people OK');

    // SELECT
    $row = $pdo->prepare("SELECT id, name FROM sol_people WHERE id = ?")->execute([$tempId]) ?
        $pdo->prepare("SELECT id, name FROM sol_people WHERE id = ?") : null;
    $stmt2 = $pdo->prepare("SELECT id, name FROM sol_people WHERE id = ?");
    $stmt2->execute([$tempId]);
    $fetched = $stmt2->fetch();
    if ($fetched && $fetched['id'] === $tempId) {
        ok('CRUD', 'SELECT em sol_people OK', "Nome: {$fetched['name']}");
    } else {
        fail('CRUD', 'SELECT retornou registro incorreto');
    }

    // UPDATE
    $pdo->prepare("UPDATE sol_people SET name = 'Diagnóstico Atualizado' WHERE id = ?")->execute([$tempId]);
    ok('CRUD', 'UPDATE em sol_people OK');

    // INSERT mensagem de chat (sala geral)
    if ($general) {
        $msgId = 'diag-msg-' . bin2hex(random_bytes(4));
        $ms = (int) floor(microtime(true) * 1000);
        $pdo->prepare(
            "INSERT INTO sol_chat_messages (id, room_id, author_id, author_name, message_text, created_at_ms, created_at)
             VALUES (?, ?, 'system', 'Diagnóstico', 'Teste de mensagem', ?, FROM_UNIXTIME(? / 1000))"
        )->execute([$msgId, $general, $ms, $ms]);
        ok('CRUD', 'INSERT em sol_chat_messages OK');
        $pdo->prepare("DELETE FROM sol_chat_messages WHERE id = ?")->execute([$msgId]);
    }

    // DELETE temporário
    $pdo->prepare("DELETE FROM sol_people WHERE id = ?")->execute([$tempId]);
    ok('CRUD', 'DELETE em sol_people OK');

} catch (PDOException $e) {
    fail('CRUD', 'Falha em operação CRUD', $e->getMessage());
    // Limpeza emergencial
    try { $pdo->prepare("DELETE FROM sol_people WHERE id = ?")->execute([$tempId]); } catch (Exception $_) {}
}

// ── 8. Suporte a JSON (colunas JSON nativas) ─────────────────
try {
    $json = $pdo->query("SELECT JSON_ARRAY('a','b','c') AS j")->fetchColumn();
    ok('JSON', 'Funções JSON suportadas pelo MySQL', "Resultado: $json");
} catch (PDOException $e) {
    warn('JSON', 'Funções JSON não suportadas', 'Requer MySQL 5.7.8+ ou MariaDB 10.2+');
}

// ── 9. Charset / Collation ────────────────────────────────────
$charset = $pdo->query(
    "SELECT CCSA.character_set_name, CCSA.collation_name
     FROM information_schema.`SCHEMATA` S
     INNER JOIN information_schema.COLLATION_CHARACTER_SET_APPLICABILITY CCSA
       ON CCSA.collation_name = S.default_collation_name
     WHERE S.schema_name = DATABASE()"
)->fetch();
if ($charset) {
    $cs = $charset['character_set_name'];
    $co = $charset['collation_name'];
    if ($cs === 'utf8mb4') {
        ok('Charset', "Charset correto: $cs / $co");
    } else {
        warn('Charset', "Charset inesperado: $cs / $co", 'O ideal é utf8mb4 / utf8mb4_unicode_ci');
    }
}

// ── 10. Autenticação: testa password_verify ──────────────────
$hashTest = $pdo->query("SELECT password_hash FROM sol_people LIMIT 1")->fetchColumn();
if ($hashTest) {
    // Não sabemos a senha real, mas verificamos que o hash é bcrypt
    if (str_starts_with($hashTest, '$2y$')) {
        ok('Auth', 'Hash bcrypt detectado corretamente nas senhas');
    } else {
        warn('Auth', 'Hash de senha não parece ser bcrypt', "Valor: " . substr($hashTest, 0, 20) . '…');
    }
}

// ═══════════════════════════════════════════════════════════════
label: render;
// ── Renderização HTML ─────────────────────────────────────────
$counts = array_count_values(array_column($results, 'status'));
$total  = count($results);
$okCnt  = $counts['ok']   ?? 0;
$warnCnt= $counts['warn'] ?? 0;
$failCnt= $counts['fail'] ?? 0;
$allOk  = $failCnt === 0 && $warnCnt === 0;
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sol Equipes — Diagnóstico do Banco</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0 }
  body { font-family: system-ui, sans-serif; background: #f0f4f8; color: #1e293b; padding: 24px }
  h1 { font-size: 1.4rem; color: #0a3764; margin-bottom: 4px }
  .sub { font-size: .85rem; color: #64748b; margin-bottom: 20px }
  .summary {
    display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 24px;
  }
  .badge {
    padding: 8px 18px; border-radius: 20px; font-size: .9rem; font-weight: 600;
  }
  .badge.ok   { background: #dcfce7; color: #166534 }
  .badge.warn { background: #fef9c3; color: #854d0e }
  .badge.fail { background: #fee2e2; color: #991b1b }
  .card {
    background: #fff; border-radius: 10px; box-shadow: 0 1px 4px #0001;
    margin-bottom: 10px; overflow: hidden;
  }
  .card-header {
    display: flex; align-items: center; gap: 10px; padding: 12px 16px;
  }
  .dot {
    width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0;
  }
  .dot.ok   { background: #22c55e }
  .dot.warn { background: #f59e0b }
  .dot.fail { background: #ef4444 }
  .label  { font-size: .75rem; font-weight: 700; color: #64748b; min-width: 90px }
  .msg    { font-size: .9rem; flex: 1 }
  .detail {
    font-size: .8rem; color: #475569; padding: 0 16px 10px 38px;
    border-top: 1px solid #f1f5f9; padding-top: 6px;
    word-break: break-all;
  }
  .final {
    margin-top: 24px; padding: 16px; border-radius: 10px; font-weight: 600; text-align: center;
  }
  .final.ok   { background: #dcfce7; color: #166534 }
  .final.warn { background: #fef9c3; color: #854d0e }
  .final.fail { background: #fee2e2; color: #991b1b }
  .note { margin-top: 16px; font-size: .8rem; color: #94a3b8; text-align: center }
</style>
</head>
<body>
<h1>🔍 Sol Equipes — Diagnóstico do Banco de Dados</h1>
<p class="sub">Gerado em: <?= date('d/m/Y H:i:s') ?> (horário do servidor PHP)</p>

<div class="summary">
  <span class="badge ok">✅ <?= $okCnt ?> OK</span>
  <?php if ($warnCnt > 0): ?>
  <span class="badge warn">⚠️ <?= $warnCnt ?> Aviso(s)</span>
  <?php endif ?>
  <?php if ($failCnt > 0): ?>
  <span class="badge fail">❌ <?= $failCnt ?> Erro(s)</span>
  <?php endif ?>
  <span class="badge" style="background:#e0e7ff;color:#3730a3"><?= $total ?> verificações</span>
</div>

<?php foreach ($results as $r): ?>
<div class="card">
  <div class="card-header">
    <span class="dot <?= $r['status'] ?>"></span>
    <span class="label"><?= htmlspecialchars($r['section']) ?></span>
    <span class="msg"><?= htmlspecialchars($r['msg']) ?></span>
  </div>
  <?php if ($r['detail'] !== ''): ?>
  <div class="detail"><?= htmlspecialchars($r['detail']) ?></div>
  <?php endif ?>
</div>
<?php endforeach ?>

<div class="final <?= $failCnt > 0 ? 'fail' : ($warnCnt > 0 ? 'warn' : 'ok') ?>">
<?php if ($allOk): ?>
  ✅ Banco de dados totalmente funcional e íntegro. Pode remover este arquivo.
<?php elseif ($failCnt > 0): ?>
  ❌ Há erros críticos — veja os itens vermelhos acima e corrija antes de usar o sistema.
<?php else: ?>
  ⚠️ Banco funcional, mas há avisos — revise os itens amarelos.
<?php endif ?>
</div>

<p class="note">
  ⚠️ Remova ou proteja este arquivo após o diagnóstico (<code>diagnostico.php</code>)
  para não expor informações do banco de dados.
</p>
</body>
</html>
