-- Database Name: cashflow_reporter

CREATE DATABASE IF NOT EXISTS cashflow_reporter;
USE cashflow_reporter;

-- Table: Branches
CREATE TABLE IF NOT EXISTS Branches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

-- Insert Default Branches
INSERT IGNORE INTO Branches (name) VALUES 
('Slave 1'), ('Slave 2'), ('Slave 3'), ('Slave 4'), ('JSB03'), ('JSB05'), ('JSB07');

-- Table: Users
CREATE TABLE IF NOT EXISTS Users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    branch_id INT DEFAULT NULL,
    role ENUM('Admin', 'Branch') NOT NULL,
    FOREIGN KEY (branch_id) REFERENCES Branches(id) ON DELETE SET NULL
);

-- Insert Default Admin User (Password should be hashed in real application, here we assume setup script handles hashing or we use a raw string for demo, but better to use bcrypt hash. We will seed users via backend script).

-- Table: CashReports
CREATE TABLE IF NOT EXISTS CashReports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    branch_id INT NOT NULL,
    report_date DATE NOT NULL,
    system_total DECIMAL(10, 2) DEFAULT 0.00,
    card_total DECIMAL(10, 2) DEFAULT 0.00,
    card_proof_url VARCHAR(255) DEFAULT NULL,
    paytm_total DECIMAL(10, 2) DEFAULT 0.00,
    paytm_proof_url VARCHAR(255) DEFAULT NULL,
    expense DECIMAL(10, 2) DEFAULT 0.00,
    expense_desc TEXT DEFAULT NULL,
    total_cash DECIMAL(10, 2) DEFAULT 0.00,
    grand_total DECIMAL(10, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (branch_id) REFERENCES Branches(id) ON DELETE CASCADE,
    UNIQUE KEY unique_branch_date (branch_id, report_date)
);

-- Table: CurrencyDetails
CREATE TABLE IF NOT EXISTS CurrencyDetails (
    id INT AUTO_INCREMENT PRIMARY KEY,
    report_id INT NOT NULL,
    denomination INT NOT NULL,
    quantity INT DEFAULT 0,
    total DECIMAL(10, 2) DEFAULT 0.00,
    FOREIGN KEY (report_id) REFERENCES CashReports(id) ON DELETE CASCADE
);

-- Table: Cheques
CREATE TABLE IF NOT EXISTS Cheques (
    id INT AUTO_INCREMENT PRIMARY KEY,
    report_id INT NOT NULL,
    cheque_no VARCHAR(50) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    cheque_date DATE NOT NULL,
    FOREIGN KEY (report_id) REFERENCES CashReports(id) ON DELETE CASCADE
);
