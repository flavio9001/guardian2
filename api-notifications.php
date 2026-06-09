<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit;

class NotificationManager {
    private $filePath = 'notifications.json';
    private $maxNotifications = 100;

    public function __construct() {
        if (!file_exists($this->filePath)) file_put_contents($this->filePath, json_encode([]));
    }

    private function load() { return json_decode(file_get_contents($this->filePath), true) ?: []; }
    private function save($data) { file_put_contents($this->filePath, json_encode(array_slice($data, -$this->maxNotifications))); }

    public function getAll() {
        $data = $this->load();
        usort($data, fn($a, $b) => $b['timestamp'] <=> $a['timestamp']);
        return $data;
    }

    public function create($data) {
        $notifications = $this->load();
        $new = [
            'id' => uniqid(),
            'title' => $data['title'] ?? 'New Notification',
            'message' => $data['message'] ?? '',
            'icon' => $data['icon'] ?? 'info',
            'type' => $data['type'] ?? 'info',
            'read' => false,
            'timestamp' => time()
        ];
        $notifications[] = $new;
        $this->save($notifications);
        return $new;
    }

    public function markAsRead($id) {
        $notifications = $this->load();
        foreach ($notifications as &$n) {
            if ($n['id'] === $id) { $n['read'] = true; break; }
        }
        $this->save($notifications);
    }

    public function delete($id) {
        $this->save(array_values(array_filter($this->load(), fn($n) => $n['id'] !== $id)));
    }

    public function getStats() {
        $data = $this->load();
        $unread = count(array_filter($data, fn($n) => !$n['read']));
        return ['total' => count($data), 'read' => count($data) - $unread, 'unread' => $unread];
    }
}

$manager = new NotificationManager();
$method = $_SERVER['REQUEST_METHOD'];
$path = explode('/', trim($_SERVER['PATH_INFO'] ?? '', '/'));

if ($path[0] === 'api' && $path[1] === 'notifications') {
    if ($method === 'GET' && !isset($path[2])) echo json_encode($manager->getAll());
    elseif ($method === 'GET' && ($path[2] ?? '') === 'stats') echo json_encode($manager->getStats());
    elseif ($method === 'POST' && !isset($path[2])) echo json_encode($manager->create(json_decode(file_get_contents('php://input'), true) ?: []));
    elseif ($method === 'POST' && ($path[3] ?? '') === 'read') { $manager->markAsRead($path[2]); echo json_encode(['status' => 'ok']); }
    elseif ($method === 'POST' && ($path[2] ?? '') === 'clear') { file_put_contents('notifications.json', json_encode([])); echo json_encode(['status' => 'cleared']); }
    elseif ($method === 'DELETE' && isset($path[2])) { $manager->delete($path[2]); echo json_encode(['status' => 'deleted']); }
    else { http_response_code(404); }
}