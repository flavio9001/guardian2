CREATE TABLE IF NOT EXISTS sol_people (
  id VARCHAR(80) PRIMARY KEY,
  name VARCHAR(180) NOT NULL,
  role VARCHAR(180) NOT NULL,
  group_id VARCHAR(80) NULL,
  manager_id VARCHAR(80) NULL,
  phones_json JSON NOT NULL,
  whatsapp VARCHAR(40) NULL,
  email VARCHAR(180) NULL,
  address TEXT NULL,
  availability_json JSON NOT NULL,
  period VARCHAR(80) NULL,
  summary TEXT NULL,
  photo LONGTEXT NULL,
  username VARCHAR(120) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  user_type ENUM('gestor','colaborador') NOT NULL DEFAULT 'colaborador',
  is_vip TINYINT(1) NOT NULL DEFAULT 0,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at BIGINT NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_people_group (group_id),
  INDEX idx_people_manager (manager_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sol_groups (
  id VARCHAR(80) PRIMARY KEY,
  name VARCHAR(180) NOT NULL,
  vip_id VARCHAR(80) NULL,
  color VARCHAR(20) NOT NULL DEFAULT '#0a3764',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_groups_vip (vip_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sol_chat_rooms (
  id VARCHAR(80) PRIMARY KEY,
  name VARCHAR(180) NOT NULL,
  type ENUM('general','group','custom') NOT NULL DEFAULT 'group',
  group_id VARCHAR(80) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_rooms_group (group_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sol_chat_room_members (
  room_id VARCHAR(80) NOT NULL,
  person_id VARCHAR(80) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (room_id, person_id),
  INDEX idx_room_members_person (person_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sol_chat_messages (
  id VARCHAR(80) PRIMARY KEY,
  room_id VARCHAR(80) NOT NULL,
  author_id VARCHAR(80) NOT NULL,
  author_name VARCHAR(180) NOT NULL,
  message_text TEXT NOT NULL,
  created_at_ms BIGINT NOT NULL,
  created_at DATETIME NOT NULL,
  INDEX idx_messages_room_created (room_id, created_at_ms),
  INDEX idx_messages_author (author_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sol_schedule_days (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  group_id VARCHAR(80) NOT NULL,
  month_ref CHAR(7) NOT NULL,
  work_date DATE NOT NULL,
  assignments_json JSON NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_schedule_day (group_id, work_date),
  INDEX idx_schedule_month (group_id, month_ref)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

