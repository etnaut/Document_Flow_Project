<?php
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendResponse(['error' => 'Method not allowed'], 405);
}

try {
    // Option 1: Get departments from a departments table
    // $stmt = $pdo->query("SELECT Department_Name FROM departments ORDER BY Department_Name");
    // $departments = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    // Option 2: Get distinct departments from users table
    $stmt = $pdo->query("SELECT DISTINCT Department FROM users WHERE Department IS NOT NULL ORDER BY Department");
    $departments = $stmt->fetchAll(PDO::FETCH_COLUMN);

    sendResponse($departments);

} catch (PDOException $e) {
    sendResponse(['error' => 'Database error: ' . $e->getMessage()], 500);
}
?>
