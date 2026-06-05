<?php

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

class GuardianAPI {
    private $db;

function ensure_schema(): void {
    static $done = false;
    if ($done) return;
    
    // create_schema();  <-- COLOQUE AS DUAS BARRAS AQUI
    seed_if_empty();
    sync_rooms();
    $done = true;
}

    public function __construct() {
        $this->db = new PDO('sqlite:guardian.db');
        $this->db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $this->initDatabase();
    }

    private function initDatabase() {
        $this->db->exec("CREATE TABLE IF NOT EXISTS logs (id INTEGER PRIMARY KEY, event TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)");
    }

    public function handleRequest() {
        $method = $_SERVER['REQUEST_METHOD'];
        $input = json_decode(file_get_contents('php://input'), true);

        if ($method === 'POST') {
            $event = $input['event'] ?? 'unknown';
            $stmt = $this->db->prepare("INSERT INTO logs (event) VALUES (:event)");
            $stmt->execute([':event' => $event]);
            echo json_encode(['status' => 'success', 'message' => 'Event logged']);
        } else {
            $stmt = $this->db->query("SELECT * FROM logs ORDER BY timestamp DESC LIMIT 50");
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        }
    }
}

$api = new GuardianAPI();
$api->handleRequest();