<?php
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(['error' => 'Method not allowed'], 405);
}

$input = getJsonInput();

if (!isset($input['documentId']) || !isset($input['targetDepartment'])) {
    sendResponse(['error' => 'documentId and targetDepartment are required'], 400);
}

$documentId = (int)$input['documentId'];
$targetDepartment = $input['targetDepartment'];
$notes = $input['notes'] ?? null;

try {
    // Update the document's target department and reset status to Pending
    $stmt = $pdo->prepare("
        UPDATE documents 
        SET target_department = ?, Status = 'Pending', comments = ?
        WHERE Document_Id = ?
    ");
    $stmt->execute([$targetDepartment, $notes, $documentId]);

    // Fetch updated document
    $stmt = $pdo->prepare("SELECT * FROM documents WHERE Document_Id = ?");
    $stmt->execute([$documentId]);
    $document = $stmt->fetch();

    if (!$document) {
        sendResponse(['error' => 'Document not found'], 404);
    }

    sendResponse($document);

} catch (PDOException $e) {
    sendResponse(['error' => 'Database error: ' . $e->getMessage()], 500);
}
?>
