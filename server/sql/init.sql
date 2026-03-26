-- 创建数据库
CREATE DATABASE IF NOT EXISTS blood_routine_monitor DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE blood_routine_monitor;

-- 用户表
CREATE TABLE IF NOT EXISTS user (
  user_id VARCHAR(64) PRIMARY KEY,
  phone VARCHAR(11) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL COMMENT 'BCrypt加密',
  nickname VARCHAR(50),
  avatar VARCHAR(255),
  wechat_openid VARCHAR(64),
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_deleted TINYINT DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 患者表
CREATE TABLE IF NOT EXISTS patient (
  patient_id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  name VARCHAR(50) NOT NULL,
  gender VARCHAR(10),
  birthday DATE,
  tumor_type VARCHAR(50),
  treatment_plan VARCHAR(100),
  chemotherapy_cycles INT,
  last_chemo_end_date DATE,
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_deleted TINYINT DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES user(user_id),
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 报告表
CREATE TABLE IF NOT EXISTS report (
  report_id VARCHAR(64) PRIMARY KEY,
  patient_id VARCHAR(64) NOT NULL,
  report_type VARCHAR(20) DEFAULT '血常规',
  test_time DATETIME NOT NULL,
  test_hospital VARCHAR(100),
  raw_image_url VARCHAR(255),
  is_edited TINYINT DEFAULT 0,
  source VARCHAR(20),
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_deleted TINYINT DEFAULT 0,
  FOREIGN KEY (patient_id) REFERENCES patient(patient_id),
  INDEX idx_patient_id (patient_id),
  INDEX idx_test_time (test_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 指标表
CREATE TABLE IF NOT EXISTS indicator (
  indicator_id VARCHAR(64) PRIMARY KEY,
  report_id VARCHAR(64) NOT NULL,
  indicator_code VARCHAR(20) NOT NULL,
  indicator_name VARCHAR(50),
  test_value DECIMAL(10,2),
  reference_min DECIMAL(10,2),
  reference_max DECIMAL(10,2),
  unit VARCHAR(20),
  is_abnormal TINYINT DEFAULT 0,
  abnormal_level VARCHAR(10) COMMENT 'Ⅰ/Ⅱ/Ⅲ/Ⅳ',
  trend VARCHAR(20),
  remark VARCHAR(255),
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (report_id) REFERENCES report(report_id),
  INDEX idx_report_id (report_id),
  INDEX idx_indicator_code (indicator_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 提醒设置表
CREATE TABLE IF NOT EXISTS reminder (
  reminder_id VARCHAR(64) PRIMARY KEY,
  patient_id VARCHAR(64) NOT NULL,
  reminder_date DATE NOT NULL,
  reminder_time TIME NOT NULL,
  is_enabled TINYINT DEFAULT 1,
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_deleted TINYINT DEFAULT 0,
  FOREIGN KEY (patient_id) REFERENCES patient(patient_id),
  INDEX idx_patient_id (patient_id),
  INDEX idx_reminder_date (reminder_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 分级速查表
CREATE TABLE IF NOT EXISTS reference (
  reference_id VARCHAR(64) PRIMARY KEY,
  indicator_code VARCHAR(20) NOT NULL,
  indicator_name VARCHAR(50),
  grade_level VARCHAR(10) COMMENT 'Ⅰ/Ⅱ/Ⅲ/Ⅳ',
  grade_range VARCHAR(100),
  suggestion TEXT,
  note TEXT,
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_indicator_code (indicator_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 插入WHO骨髓抑制分级标准数据
INSERT INTO reference (reference_id, indicator_code, indicator_name, grade_level, grade_range, suggestion, note, create_time) VALUES
-- WBC 白细胞计数
('ref_wbc_normal', 'WBC', '白细胞计数', 'normal', '≥4.0×10⁹/L', '指标正常，按常规监测', '白细胞是免疫系统的重要组成部分', NOW()),
('ref_wbc_1', 'WBC', '白细胞计数', 'I', '(3.0-4.0)×10⁹/L', '居家监测，定期复查', '化疗期间白细胞减少会增加感染风险', NOW()),
('ref_wbc_2', 'WBC', '白细胞计数', 'II', '(2.0-3.0)×10⁹/L', '建议咨询医生，遵医嘱干预', NULL, NOW()),
('ref_wbc_3', 'WBC', '白细胞计数', 'III', '(1.0-2.0)×10⁹/L', '及时就医，遵医嘱治疗', NULL, NOW()),
('ref_wbc_4', 'WBC', '白细胞计数', 'IV', '<1.0×10⁹/L', '立即就医，紧急处理', NULL, NOW()),
-- NEUT# 中性粒细胞绝对值
('ref_neut_normal', 'NEUT#', '中性粒细胞绝对值', 'normal', '≥2.0×10⁹/L', '指标正常，按常规监测', '中性粒细胞是抵抗细菌感染的第一道防线', NOW()),
('ref_neut_1', 'NEUT#', '中性粒细胞绝对值', 'I', '(1.5-2.0)×10⁹/L', '居家监测，定期复查', NULL, NOW()),
('ref_neut_2', 'NEUT#', '中性粒细胞绝对值', 'II', '(1.0-1.5)×10⁹/L', '建议咨询医生，遵医嘱干预', NULL, NOW()),
('ref_neut_3', 'NEUT#', '中性粒细胞绝对值', 'III', '(0.5-1.0)×10⁹/L', '及时就医，遵医嘱治疗', NULL, NOW()),
('ref_neut_4', 'NEUT#', '中性粒细胞绝对值', 'IV', '<0.5×10⁹/L', '立即就医，紧急处理', NULL, NOW()),
-- HGB 血红蛋白
('ref_hgb_normal', 'HGB', '血红蛋白', 'normal', '≥120g/L(男)/≥110g/L(女)', '指标正常，按常规监测', '血红蛋白降低会导致贫血', NOW()),
('ref_hgb_1', 'HGB', '血红蛋白', 'I', '(100-正常值)g/L', '居家监测，定期复查', NULL, NOW()),
('ref_hgb_2', 'HGB', '血红蛋白', 'II', '(80-100)g/L', '建议咨询医生，遵医嘱干预', NULL, NOW()),
('ref_hgb_3', 'HGB', '血红蛋白', 'III', '(65-80)g/L', '及时就医，遵医嘱治疗', NULL, NOW()),
('ref_hgb_4', 'HGB', '血红蛋白', 'IV', '<65g/L', '立即就医，紧急处理', NULL, NOW()),
-- PLT 血小板计数
('ref_plt_normal', 'PLT', '血小板计数', 'normal', '≥100×10⁹/L', '指标正常，按常规监测', '血小板减少会增加出血风险', NOW()),
('ref_plt_1', 'PLT', '血小板计数', 'I', '(75-100)×10⁹/L', '居家监测，定期复查', NULL, NOW()),
('ref_plt_2', 'PLT', '血小板计数', 'II', '(50-75)×10⁹/L', '建议咨询医生，遵医嘱干预', NULL, NOW()),
('ref_plt_3', 'PLT', '血小板计数', 'III', '(25-50)×10⁹/L', '及时就医，遵医嘱治疗', NULL, NOW()),
('ref_plt_4', 'PLT', '血小板计数', 'IV', '<25×10⁹/L', '立即就医，紧急处理', NULL, NOW())
ON DUPLICATE KEY UPDATE reference SET suggestion = VALUES(suggestion);
