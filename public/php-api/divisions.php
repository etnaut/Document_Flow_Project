<?php
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendResponse(['error' => 'Method not allowed'], 405);
}

try {
    // Option 1: Get divisions from a divisions table
    // $stmt = $pdo->query("SELECT Division_Name FROM divisions ORDER BY Division_Name");
    // $divisions = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    // Option 2: Get distinct divisions from users table
    $stmt = $pdo->query("SELECT DISTINCT Division FROM users WHERE Division IS NOT NULL ORDER BY Division");
    $divisions = $stmt->fetchAll(PDO::FETCH_COLUMN);

    sendResponse($divisions);

} catch (PDOException $e) {
    sendResponse(['error' => 'Database error: ' . $e->getMessage()], 500);
}
?>
