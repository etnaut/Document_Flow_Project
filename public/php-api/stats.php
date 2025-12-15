<?php
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendResponse(['error' => 'Method not allowed'], 405);
}

$userId = isset($_GET['userId']) ? (int)$_GET['userId'] : null;
$role = isset($_GET['role']) ? $_GET['role'] : null;
$department = isset($_GET['department']) ? $_GET['department'] : null;

try {
    $baseCondition = "WHERE 1=1";
    $params = [];

    // If Admin, count only documents sent TO their department
    if ($role === 'Admin' && $department) {
        $baseCondition .= " AND target_department = ?";
        $params[] = $department;
    }
    // If Employee, count only their own documents
    else if ($role === 'Employee' && $userId) {
        $baseCondition .= " AND User_Id = ?";
        $params[] = $userId;
    }

    // Get total count
    $stmt = $pdo->prepare("SELECT COUNT(*) as total FROM documents $baseCondition");
    $stmt->execute($params);
    $total = $stmt->fetch()['total'];

    // Get counts by status
    $statuses = ['Pending', 'Approved', 'Revision', 'Released'];
    $stats = ['total' => (int)$total];

    foreach ($statuses as $status) {
        $statusCondition = $baseCondition . " AND Status = ?";
        $statusParams = array_merge($params, [$status]);
        
        $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM documents $statusCondition");
        $stmt->execute($statusParams);
        $stats[strtolower($status)] = (int)$stmt->fetch()['count'];
    }

    sendResponse($stats);

} catch (PDOException $e) {
    sendResponse(['error' => 'Database error: ' . $e->getMessage()], 500);
}
?>
