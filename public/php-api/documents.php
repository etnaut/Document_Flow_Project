<?php
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        getDocuments();
        break;
    case 'POST':
        createDocument();
        break;
    case 'PUT':
        updateDocument();
        break;
    default:
        sendResponse(['error' => 'Method not allowed'], 405);
}

function getDocuments() {
    global $pdo;
    
    $userId = isset($_GET['userId']) ? (int)$_GET['userId'] : null;
    $role = isset($_GET['role']) ? $_GET['role'] : null;
    $department = isset($_GET['department']) ? $_GET['department'] : null;
    $status = isset($_GET['status']) ? $_GET['status'] : null;

    try {
        $sql = "SELECT * FROM documents WHERE 1=1";
        $params = [];

        // Filter by status if provided
        if ($status) {
            $sql .= " AND Status = ?";
            $params[] = $status;
        }

        // If Admin, show only documents sent TO their department
        if ($role === 'Admin' && $department) {
            $sql .= " AND target_department = ?";
            $params[] = $department;
        }
        // If Employee, show only their own documents
        else if ($role === 'Employee' && $userId) {
            $sql .= " AND User_Id = ?";
            $params[] = $userId;
        }

        $sql .= " ORDER BY created_at DESC";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $documents = $stmt->fetchAll();

        sendResponse($documents);

    } catch (PDOException $e) {
        sendResponse(['error' => 'Database error: ' . $e->getMessage()], 500);
    }
}

function createDocument() {
    global $pdo;
    
    $input = getJsonInput();

    $required = ['Type', 'User_Id', 'Priority', 'target_department'];
    foreach ($required as $field) {
        if (!isset($input[$field])) {
            sendResponse(['error' => "Missing required field: $field"], 400);
        }
    }

    try {
        $stmt = $pdo->prepare("
            INSERT INTO documents (Type, User_Id, Status, Priority, sender_name, sender_department, target_department, created_at)
            VALUES (?, ?, 'Pending', ?, ?, ?, ?, NOW())
        ");
        $stmt->execute([
            $input['Type'],
            $input['User_Id'],
            $input['Priority'],
            $input['sender_name'] ?? null,
            $input['sender_department'] ?? null,
            $input['target_department']
        ]);

        $documentId = $pdo->lastInsertId();
        
        // Fetch the created document
        $stmt = $pdo->prepare("SELECT * FROM documents WHERE Document_Id = ?");
        $stmt->execute([$documentId]);
        $document = $stmt->fetch();

        sendResponse($document, 201);

    } catch (PDOException $e) {
        sendResponse(['error' => 'Database error: ' . $e->getMessage()], 500);
    }
}

function updateDocument() {
    global $pdo;
    
    $input = getJsonInput();

    if (!isset($input['Document_Id'])) {
        sendResponse(['error' => 'Document_Id is required'], 400);
    }

    try {
        $updates = [];
        $params = [];

        // Build dynamic update query
        $allowedFields = ['Status', 'Priority', 'comments', 'target_department', 'Type'];
        foreach ($allowedFields as $field) {
            if (isset($input[$field])) {
                $updates[] = "$field = ?";
                $params[] = $input[$field];
            }
        }

        if (empty($updates)) {
            sendResponse(['error' => 'No fields to update'], 400);
        }

        $params[] = $input['Document_Id'];
        $sql = "UPDATE documents SET " . implode(', ', $updates) . " WHERE Document_Id = ?";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        // Fetch updated document
        $stmt = $pdo->prepare("SELECT * FROM documents WHERE Document_Id = ?");
        $stmt->execute([$input['Document_Id']]);
        $document = $stmt->fetch();

        sendResponse($document);

    } catch (PDOException $e) {
        sendResponse(['error' => 'Database error: ' . $e->getMessage()], 500);
    }
}
?>
