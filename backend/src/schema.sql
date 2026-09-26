CREATE DATABASE IF NOT EXISTS codesense;
USE codesense;

CREATE TABLE IF NOT EXISTS repos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  owner VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  full_name VARCHAR(512) NOT NULL,
  status ENUM('ingesting', 'ready', 'failed') NOT NULL DEFAULT 'ingesting',
  file_count INT DEFAULT 0,
  chunk_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_repo (full_name)
);

CREATE TABLE IF NOT EXISTS chunks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  repo_id INT NOT NULL,
  file_path VARCHAR(1024) NOT NULL,
  chunk_index INT NOT NULL,
  content MEDIUMTEXT NOT NULL,
  -- Embedding stored as a JSON array of floats.
  -- TODO(next-steps #2): move this to a dedicated vector DB (Chroma/Qdrant)
  -- once chunk volume makes in-app cosine similarity too slow.
  embedding JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (repo_id) REFERENCES repos(id) ON DELETE CASCADE,
  INDEX idx_repo (repo_id)
);

CREATE TABLE IF NOT EXISTS queries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  repo_id INT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  source_files JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (repo_id) REFERENCES repos(id) ON DELETE CASCADE
);
