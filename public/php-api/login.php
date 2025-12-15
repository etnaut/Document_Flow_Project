<?php
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(['error' => 'Method not allowed'], 405);
}

$input = getJsonInput();

if (!isset($input['username']) || !isset($input['password'])) {
    sendResponse(['error' => 'Username and password are required'], 400);
}

$username = $input['username'];
$password = $input['password'];

try {
    // Query user from database
    $stmt = $pdo->prepare("
        SELECT 
            User_Id,
            ID_Number,
            Full_Name,
            Gender,
            Email,
            Department,
            Division,
            User_Role,
            User_Name,
            Status,
            Password
        FROM users 
        WHERE User_Name = ? AND Status = 1
    ");
    $stmt->execute([$username]);
    $user = $stmt->fetch();

    if (!$user) {
        sendResponse(['error' => 'Invalid credentials'], 401);
    }

    // Verify password - adjust based on how you store passwords
    // Option 1: Plain text (not recommended for production)
    // if ($password !== $user['Password']) {
    
    // Option 2: Using password_hash (recommended)
    if (!password_verify($password, $user['Password'])) {
        sendResponse(['error' => 'Invalid credentials'], 401);
    }

    // Remove password from response
    unset($user['Password']);

    // Convert Status to boolean
    $user['Status'] = (bool)$user['Status'];

    sendResponse($user);

} catch (PDOException $e) {
    sendResponse(['error' => 'Database error: ' . $e->getMessage()], 500);
}
?>
