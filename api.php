<?php
declare(strict_types=1);

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, X-User-Id');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

const DEFAULT_PASSWORD = 'Sol@1234';
const CHAT_VISIBLE_DAYS = 30;

$weekdays = ['Domingo', 'Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado'];

function config(): array {
    static $config = null;
    if ($config === null) $config = require __DIR__ . '/db_config.php';
    return $config;
}

function pdo(): PDO {
    static $pdo = null;
    if ($pdo instanceof PDO) return $pdo;
    $config = config();
    $dsn = sprintf('mysql:host=%s;dbname=%s;charset=%s', $config['host'], $config['database'], $config['charset'] ?? 'utf8mb4');
    $pdo = new PDO($dsn, $config['username'], $config['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    return $pdo;
}

function uid(string $prefix): string {
    return $prefix . '-' . bin2hex(random_bytes(8));
}

function now_ms(): int {
    return (int) floor(microtime(true) * 1000);
}

function json_encode_safe(mixed $value): string {
    return json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

function decode_json(?string $value, mixed $fallback = []): mixed {
    if ($value === null || $value === '') return $fallback;
    $decoded = json_decode($value, true);
    return $decoded === null && json_last_error() !== JSON_ERROR_NONE ? $fallback : $decoded;
}

function body_json(): array {
    $raw = file_get_contents('php://input') ?: '';
    $data = $raw ? json_decode($raw, true) : [];
    if (!is_array($data)) fail(400, 'JSON inválido.');
    return $data;
}

function json_response(mixed $data, int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function fail(int $status, string $message): void {
    http_response_code($status);
    header('Content-Type: text/plain; charset=utf-8');
    echo $message;
    exit;
}

function path_value(): string {
    $path = $_GET['path'] ?? trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?: '', '/');
    return preg_replace('#^api/#', '', $path);
}

function slug_user(string $name): string {
    $text = iconv('UTF-8', 'ASCII//TRANSLIT', $name);
    $text = strtolower(preg_replace('/[^a-zA-Z0-9]+/', '.', $text ?: $name));
    return trim($text, '.');
}

function create_schema(): void {
    $sql = file_get_contents(__DIR__ . '/database.sql');
    if (!$sql) fail(500, 'Arquivo database.sql não encontrado.');
    pdo()->exec($sql);
}

function ensure_schema(): void {
    static $done = false;
    if ($done) return;
    create_schema();
    seed_if_empty();
    sync_rooms();
    $done = true;
}

function person_seed(string $id, string $name, string $role, string $groupId, string $managerId, bool $vip, string $type, int $createdAt): array {
    return [
        'id' => $id,
        'name' => $name,
        'role' => $role,
        'groupId' => $groupId,
        'managerId' => $managerId,
        'phones' => ['11990001111'],
        'whatsapp' => '11990001111',
        'email' => slug_user($name) . '@empresa.com',
        'address' => 'Endereço a cadastrar',
        'availability' => ['Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta'],
        'period' => '08:00-17:00',
        'summary' => 'Resumo operacional do colaborador.',
        'photo' => '',
        'username' => slug_user($name),
        'password' => DEFAULT_PASSWORD,
        'userType' => $type,
        'isVip' => $vip,
        'active' => true,
        'createdAt' => $createdAt,
    ];
}

function seed_if_empty(): void {
    $count = (int) pdo()->query('SELECT COUNT(*) FROM sol_people')->fetchColumn();
    if ($count > 0) return;
    $now = now_ms();
    $people = [
        person_seed('person-ceo', 'Marina Costa', 'CEO / VIP', 'group-executivo', '', true, 'gestor', $now - 8000),
        person_seed('person-ops', 'Rafael Nunes', 'Diretor de Operações', 'group-operacao', 'person-ceo', false, 'gestor', $now - 7000),
        person_seed('person-field', 'Bianca Lima', 'Líder de Campo', 'group-campo', 'person-ceo', false, 'colaborador', $now - 6000),
        person_seed('person-support', 'Carlos Almeida', 'Analista de Suporte', 'group-operacao', 'person-ops', false, 'colaborador', $now - 5000),
    ];
    $groups = [
        ['id' => 'group-executivo', 'name' => 'Executivo', 'vipId' => 'person-ceo', 'color' => '#0a3764'],
        ['id' => 'group-operacao', 'name' => 'Operação', 'vipId' => 'person-ceo', 'color' => '#f4b400'],
        ['id' => 'group-campo', 'name' => 'Campo', 'vipId' => 'person-ceo', 'color' => '#266f55'],
    ];
    foreach ($groups as $group) save_group($group);
    foreach ($people as $person) save_person($person);
    pdo()->prepare('INSERT INTO sol_chat_rooms (id, name, type, group_id) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name), type=VALUES(type), group_id=VALUES(group_id)')
        ->execute(['general', 'Geral', 'general', null]);
    insert_message('general', 'system', 'Sistema', 'Chat geral pronto para comunicados.', $now - 4000);
}

function row_to_person(array $row, bool $includePassword = false): array {
    $person = [
        'id' => $row['id'],
        'name' => $row['name'],
        'role' => $row['role'],
        'groupId' => $row['group_id'] ?? '',
        'managerId' => $row['manager_id'] ?? '',
        'phones' => decode_json($row['phones_json'] ?? '', []),
        'whatsapp' => $row['whatsapp'] ?? '',
        'email' => $row['email'] ?? '',
        'address' => $row['address'] ?? '',
        'availability' => decode_json($row['availability_json'] ?? '', []),
        'period' => $row['period'] ?? '',
        'summary' => $row['summary'] ?? '',
        'photo' => $row['photo'] ?? '',
        'username' => $row['username'],
        'userType' => $row['user_type'],
        'isVip' => (bool) $row['is_vip'],
        'active' => (bool) $row['active'],
        'createdAt' => (int) $row['created_at'],
    ];
    if ($includePassword) $person['passwordHash'] = $row['password_hash'];
    return $person;
}

function all_people(bool $includePassword = false): array {
    $rows = pdo()->query('SELECT * FROM sol_people ORDER BY name')->fetchAll();
    return array_map(fn($row) => row_to_person($row, $includePassword), $rows);
}

function person_by_id(string $id, bool $includePassword = false): ?array {
    $stmt = pdo()->prepare('SELECT * FROM sol_people WHERE id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    return $row ? row_to_person($row, $includePassword) : null;
}

function current_user(): ?array {
    $id = $_SERVER['HTTP_X_USER_ID'] ?? '';
    return $id ? person_by_id($id) : null;
}

function is_gestor(?array $user): bool {
    return ($user['userType'] ?? '') === 'gestor';
}

function save_person(array $person): void {
    $existing = person_by_id($person['id'] ?? '', true);
    $passwordInput = (string) ($person['password'] ?? '');
    if ($passwordInput !== '') {
        $passwordHash = password_hash($passwordInput, PASSWORD_DEFAULT);
    } elseif ($existing) {
        $passwordHash = $existing['passwordHash'];
    } else {
        $passwordHash = password_hash(DEFAULT_PASSWORD, PASSWORD_DEFAULT);
    }
    $stmt = pdo()->prepare(
        'INSERT INTO sol_people
        (id, name, role, group_id, manager_id, phones_json, whatsapp, email, address, availability_json, period, summary, photo, username, password_hash, user_type, is_vip, active, created_at)
        VALUES
        (:id, :name, :role, :group_id, :manager_id, :phones_json, :whatsapp, :email, :address, :availability_json, :period, :summary, :photo, :username, :password_hash, :user_type, :is_vip, :active, :created_at)
        ON DUPLICATE KEY UPDATE
        name=VALUES(name), role=VALUES(role), group_id=VALUES(group_id), manager_id=VALUES(manager_id), phones_json=VALUES(phones_json),
        whatsapp=VALUES(whatsapp), email=VALUES(email), address=VALUES(address), availability_json=VALUES(availability_json), period=VALUES(period),
        summary=VALUES(summary), photo=VALUES(photo), username=VALUES(username), password_hash=VALUES(password_hash),
        user_type=VALUES(user_type), is_vip=VALUES(is_vip), active=VALUES(active)'
    );
    $stmt->execute([
        ':id' => $person['id'],
        ':name' => $person['name'],
        ':role' => $person['role'],
        ':group_id' => $person['groupId'] ?? null,
        ':manager_id' => $person['managerId'] ?: null,
        ':phones_json' => json_encode_safe($person['phones'] ?? []),
        ':whatsapp' => $person['whatsapp'] ?? '',
        ':email' => $person['email'] ?? '',
        ':address' => $person['address'] ?? '',
        ':availability_json' => json_encode_safe($person['availability'] ?? []),
        ':period' => $person['period'] ?? '',
        ':summary' => $person['summary'] ?? '',
        ':photo' => $person['photo'] ?? '',
        ':username' => $person['username'] ?: slug_user($person['name']),
        ':password_hash' => $passwordHash,
        ':user_type' => $person['userType'] ?? 'colaborador',
        ':is_vip' => !empty($person['isVip']) ? 1 : 0,
        ':active' => !empty($person['active']) ? 1 : 0,
        ':created_at' => (int) ($person['createdAt'] ?? now_ms()),
    ]);
}

function all_groups(): array {
    $rows = pdo()->query('SELECT id, name, vip_id AS vipId, color FROM sol_groups ORDER BY name')->fetchAll();
    return array_map(fn($row) => ['id' => $row['id'], 'name' => $row['name'], 'vipId' => $row['vipId'] ?? '', 'color' => $row['color']], $rows);
}

function save_group(array $group): void {
    $stmt = pdo()->prepare('INSERT INTO sol_groups (id, name, vip_id, color) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name), vip_id=VALUES(vip_id), color=VALUES(color)');
    $stmt->execute([$group['id'], $group['name'], $group['vipId'] ?: null, $group['color'] ?? '#0a3764']);
}

function sync_rooms(): void {
    pdo()->prepare('INSERT INTO sol_chat_rooms (id, name, type, group_id) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name), type=VALUES(type), group_id=VALUES(group_id)')
        ->execute(['general', 'Geral', 'general', null]);
    foreach (all_groups() as $group) {
        pdo()->prepare('INSERT INTO sol_chat_rooms (id, name, type, group_id) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name), type=VALUES(type), group_id=VALUES(group_id)')
            ->execute([$group['id'], $group['name'], 'group', $group['id']]);
    }
}

function visible_rooms(array $user): array {
    if (is_gestor($user)) {
        $stmt = pdo()->query('SELECT id, name, type, group_id AS groupId FROM sol_chat_rooms ORDER BY type, name');
        return $stmt->fetchAll();
    }
    $stmt = pdo()->prepare(
        "SELECT DISTINCT r.id, r.name, r.type, r.group_id AS groupId
         FROM sol_chat_rooms r
         LEFT JOIN sol_chat_room_members m ON m.room_id = r.id
         WHERE r.type = 'general' OR r.group_id = ? OR m.person_id = ?
         ORDER BY r.type, r.name"
    );
    $stmt->execute([$user['groupId'], $user['id']]);
    return $stmt->fetchAll();
}

function messages_for_rooms(array $rooms): array {
    if (!$rooms) return [];
    $ids = array_column($rooms, 'id');
    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $cutoff = now_ms() - (CHAT_VISIBLE_DAYS * 24 * 60 * 60 * 1000);
    $stmt = pdo()->prepare("SELECT * FROM sol_chat_messages WHERE room_id IN ($placeholders) AND created_at_ms >= ? ORDER BY created_at_ms ASC");
    $stmt->execute([...$ids, $cutoff]);
    $chats = [];
    foreach ($stmt->fetchAll() as $row) {
        $chats[$row['room_id']][] = [
            'id' => $row['id'],
            'authorId' => $row['author_id'],
            'author' => $row['author_name'],
            'text' => $row['message_text'],
            'at' => (int) $row['created_at_ms'],
        ];
    }
    return $chats;
}

function schedules_state(): array {
    $rows = pdo()->query('SELECT group_id, month_ref, work_date, assignments_json FROM sol_schedule_days ORDER BY work_date')->fetchAll();
    $result = [];
    foreach ($rows as $row) {
        $result[$row['group_id']][$row['month_ref']][] = [
            'date' => $row['work_date'],
            'assignments' => decode_json($row['assignments_json'], []),
        ];
    }
    return $result;
}

function state_for(array $user): array {
    $rooms = visible_rooms($user);
    return [
        'people' => all_people(),
        'groups' => all_groups(),
        'chatRooms' => $rooms,
        'chats' => messages_for_rooms($rooms),
        'schedules' => schedules_state(),
    ];
}

function insert_message(string $roomId, string $authorId, string $author, string $text, ?int $at = null): void {
    $at ??= now_ms();
    $stmt = pdo()->prepare('INSERT INTO sol_chat_messages (id, room_id, author_id, author_name, message_text, created_at_ms, created_at) VALUES (?, ?, ?, ?, ?, ?, FROM_UNIXTIME(? / 1000))');
    $stmt->execute([uid('msg'), $roomId, $authorId, $author, $text, $at, $at]);
}

function month_entries(string $month): array {
    $date = new DateTime($month . '-01 12:00:00');
    $monthNum = $date->format('m');
    $entries = [];
    while ($date->format('m') === $monthNum) {
        $entries[] = ['date' => $date->format('Y-m-d'), 'assignments' => []];
        $date->modify('+1 day');
    }
    return $entries;
}

function generate_schedule(string $groupId, string $month): array {
    global $weekdays;
    $team = array_values(array_filter(all_people(), fn($p) => $p['groupId'] === $groupId && $p['active']));
    $counts = [];
    foreach (schedules_state()[$groupId] ?? [] as $entries) {
        foreach ($entries as $entry) foreach ($entry['assignments'] ?? [] as $id) $counts[$id] = ($counts[$id] ?? 0) + 1;
    }
    $result = [];
    foreach (month_entries($month) as $entry) {
        $day = $weekdays[(int)(new DateTime($entry['date'] . ' 12:00:00'))->format('w')];
        $available = array_values(array_filter($team, fn($p) => in_array($day, $p['availability'] ?? [], true)));
        usort($available, fn($a, $b) => ($counts[$a['id']] ?? 0) <=> ($counts[$b['id']] ?? 0));
        $picked = array_slice(array_map(fn($p) => $p['id'], $available), 0, min(2, count($available)));
        foreach ($picked as $id) $counts[$id] = ($counts[$id] ?? 0) + 1;
        $entry['assignments'] = $picked;
        $result[] = $entry;
    }
    return $result;
}

function save_schedule(string $groupId, string $month, array $entries): void {
    $stmt = pdo()->prepare('INSERT INTO sol_schedule_days (group_id, month_ref, work_date, assignments_json) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE month_ref=VALUES(month_ref), assignments_json=VALUES(assignments_json)');
    foreach ($entries as $entry) {
        $stmt->execute([$groupId, $month, $entry['date'], json_encode_safe($entry['assignments'] ?? [])]);
    }
}

function export_db(): array {
    return state_for(['id' => 'export', 'userType' => 'gestor', 'groupId' => '']);
}

ensure_schema();
$path = path_value();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET' && $path === 'people-public') {
    json_response(array_values(array_map(fn($p) => ['id' => $p['id'], 'name' => $p['name'], 'username' => $p['username']], array_filter(all_people(), fn($p) => $p['active']))));
}

if ($method === 'POST' && $path === 'login') {
    $body = body_json();
    $stmt = pdo()->prepare('SELECT * FROM sol_people WHERE id = ? AND username = ? AND active = 1');
    $stmt->execute([$body['personId'] ?? '', $body['username'] ?? '']);
    $row = $stmt->fetch();
    if (!$row) fail(401, 'Usuário ou senha inválidos');
    $hash = $row['password_hash'];
    $password = (string) ($body['password'] ?? '');
    if (!password_verify($password, $hash) && $password !== $hash) fail(401, 'Usuário ou senha inválidos');
    json_response(row_to_person($row));
}

$user = current_user();
if (!$user) fail(401, 'Login obrigatório');

if ($method === 'GET' && $path === 'state') json_response(state_for($user));

if ($method === 'GET' && $path === 'export') {
    if (!is_gestor($user)) fail(403, 'Acesso restrito a gestores');
    json_response(export_db());
}

if ($method === 'POST' && $path === 'import') {
    if (!is_gestor($user)) fail(403, 'Acesso restrito a gestores');
    $data = body_json();
    foreach ($data['groups'] ?? [] as $group) save_group($group);
    foreach ($data['people'] ?? [] as $person) save_person($person);
    sync_rooms();
    json_response(['ok' => true]);
}

if ($method === 'POST' && $path === 'password') {
    $body = body_json();
    $password = (string) ($body['password'] ?? '');
    if (strlen($password) < 4) fail(400, 'Senha muito curta');
    $stmt = pdo()->prepare('UPDATE sol_people SET password_hash = ? WHERE id = ?');
    $stmt->execute([password_hash($password, PASSWORD_DEFAULT), $user['id']]);
    json_response(['ok' => true]);
}

if ($method === 'PUT' && $path === 'people') {
    if (!is_gestor($user)) fail(403, 'Acesso restrito a gestores');
    $person = body_json();
    save_person($person);
    if (!empty($person['isVip']) && !empty($person['groupId'])) {
        pdo()->prepare('UPDATE sol_groups SET vip_id = ? WHERE id = ?')->execute([$person['id'], $person['groupId']]);
    }
    sync_rooms();
    json_response(['ok' => true]);
}

if ($method === 'DELETE' && str_starts_with($path, 'people/')) {
    if (!is_gestor($user)) fail(403, 'Acesso restrito a gestores');
    $id = substr($path, 7);
    pdo()->prepare('DELETE FROM sol_people WHERE id = ?')->execute([$id]);
    pdo()->prepare('UPDATE sol_people SET manager_id = NULL WHERE manager_id = ?')->execute([$id]);
    json_response(['ok' => true]);
}

if ($method === 'PUT' && $path === 'groups') {
    if (!is_gestor($user)) fail(403, 'Acesso restrito a gestores');
    save_group(body_json());
    sync_rooms();
    json_response(['ok' => true]);
}

if ($method === 'DELETE' && str_starts_with($path, 'groups/')) {
    if (!is_gestor($user)) fail(403, 'Acesso restrito a gestores');
    $id = substr($path, 7);
    pdo()->prepare('DELETE FROM sol_groups WHERE id = ?')->execute([$id]);
    pdo()->prepare('DELETE FROM sol_chat_rooms WHERE id = ?')->execute([$id]);
    pdo()->prepare('DELETE FROM sol_schedule_days WHERE group_id = ?')->execute([$id]);
    json_response(['ok' => true]);
}

if ($method === 'POST' && $path === 'schedules/generate') {
    $body = body_json();
    $entries = generate_schedule($body['groupId'], $body['month']);
    save_schedule($body['groupId'], $body['month'], $entries);
    json_response(['ok' => true]);
}

if ($method === 'PUT' && $path === 'schedules') {
    $body = body_json();
    save_schedule($body['groupId'], $body['month'], $body['entries']);
    json_response(['ok' => true]);
}

if ($method === 'POST' && $path === 'chats/message') {
    $body = body_json();
    $rooms = visible_rooms($user);
    if (!in_array($body['roomId'], array_column($rooms, 'id'), true)) fail(403, 'Acesso negado ao chat');
    insert_message($body['roomId'], $user['id'], $user['name'], (string) $body['text']);
    json_response(['ok' => true]);
}

fail(404, 'Rota não encontrada');

