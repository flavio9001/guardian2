<?php

/**
 * Configuração de Banco de Dados - Guardian
 * Compatível com Hostinger e ambientes de produção
 */

// Carrega variáveis de ambiente (se usar biblioteca como vlucas/phpdotenv)
// Caso contrário, define valores padrão seguros
define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
define('DB_NAME', getenv('DB_NAME') ?: 'u123456789_db');
define('DB_USER', getenv('DB_USER') ?: 'u123456789_user');
define('DB_PASS', getenv('DB_PASS') ?: 'sua_senha_segura');
define('DB_CHARSET', 'utf8mb4');

class Database {
    private static $instance = null;

    public static function getConnection() {
        if (self::$instance === null) {
            try {
                $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
                
                $options = [
                    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES   => false,
                    PDO::ATTR_TIMEOUT            => 5, // Timeout de 5 segundos
                ];

                self::$instance = new PDO($dsn, DB_USER, DB_PASS, $options);
            } catch (PDOException $e) {
                // Log de erro para arquivo interno
                error_log('Erro de conexão com banco de dados: ' . $e->getMessage());
                
                // Fallback seguro: não expõe credenciais ao usuário final
                die('Erro crítico: Não foi possível conectar ao banco de dados. Tente novamente mais tarde.');
            }
        }
        return self::$instance;
    }
}

// Exemplo de uso seguro contra SQL Injection:
// $stmt = Database::getConnection()->prepare("SELECT * FROM users WHERE email = :email");
// $stmt->execute(['email' => $email]);
// $user = $stmt->fetch();