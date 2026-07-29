<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);
 
$dbHost     = 'mydb';
$dbUsername = 'dummy';
$dbPassword = 'c3322b';
$dbName     = 'db3322';
 
$conn = new mysqli($dbHost, $dbUsername, $dbPassword, $dbName);
 
if ($conn->connect_error) {
    error_log("Connection failed: " . $conn->connect_error);
    die("Connection failed: " . $conn->connect_error);
}
 
removeExpiredRecords($conn);
 
function createNewUserId($conn) {
    $newUid = uniqid('idd');
    $timestamp = time() + 300;
    $stmt = $conn->prepare("INSERT INTO user_preferences (uid, timestamp) VALUES (?, ?)");
    $stmt->bind_param("si", $newUid, $timestamp);
    $stmt->execute();
    $stmt->close();
    return $newUid;
}
 
function getUserPreferences($conn, $uid) {
    $stmt = $conn->prepare("SELECT * FROM user_preferences WHERE uid = ?");
    $stmt->bind_param("s", $uid);
    $stmt->execute();
    $result = $stmt->get_result();
    $userPrefs = $result->fetch_assoc();
    $stmt->close();
    return $userPrefs;
} 
 
function outputDashboard($visibleBlocks, $hiddenBlocks) {
    $dashboardHtml = file_get_contents('dashboard.txt');
    $dashboardDom = new DOMDocument();
    libxml_use_internal_errors(true);
    $dashboardDom->loadHTML($dashboardHtml);
    libxml_clear_errors();
 
    $container = $dashboardDom->getElementById('container');
 
    foreach ($container->getElementsByTagName('div') as $index => $div) {
        $blockId = "block" . ($index + 1);
        $div->setAttribute('id', $blockId);
 
        $eyeIcon = $dashboardDom->createElement('img');
        $eyeIcon->setAttribute('class', 'eye-icon');
        $eyeIcon->setAttribute('src', in_array($blockId, $hiddenBlocks) ? 'images/eye-close.png' : 'images/eye-open.png');
        $eyeIcon->setAttribute('style', 'display: none;');
 
        $h2Element = $div->getElementsByTagName('h2')[0];
        $h2Element->parentNode->insertBefore($eyeIcon, $h2Element->nextSibling);
    }
 
    echo $dashboardDom->saveHTML();
}
 
function removeExpiredRecords($conn) {
    $conn->query("DELETE FROM user_preferences WHERE timestamp < " . time());
}
 
$method = $_SERVER['REQUEST_METHOD'];
$uid = $_COOKIE['user_id'] ?? '';
 
if ($method == 'GET') {
    if (!$uid || !($userPrefs = getUserPreferences($conn, $uid))) {
        $uid = createNewUserId($conn);
        setcookie('user_id', $uid, time() + 300);
        outputDashboard([], []);
    } else {
        outputDashboard(explode(',', $userPrefs['visible']), explode(',', $userPrefs['hidden']));
    }
} elseif ($method == 'PUT') {
    parse_str(file_get_contents("php://input"), $put_vars);
 
    if (!isset($put_vars['visible']) || !isset($put_vars['hidden'])) {
        http_response_code(400);
        die("Missing parameters.");
    }
 
    $visible = $put_vars['visible'];
    $hidden = $put_vars['hidden'];
 
    $timestamp = time() + 300;
 
    if (getUserPreferences($conn, $uid)) {
        $stmt = $conn->prepare("UPDATE user_preferences SET visible=?, hidden=?, timestamp=? WHERE uid = ?");
        $stmt->bind_param("ssis", $visible, $hidden, $timestamp, $uid);
        $stmt->execute();
        $stmt->close();
        http_response_code(200);
        echo "Preferences updated successfully";
    } else {
        $uid = uniqid('idd');
        $stmt = $conn->prepare("INSERT INTO user_preferences (uid, visible, hidden, timestamp) VALUES (?, ?, ?, ?)");
        $stmt->bind_param("sssi", $uid, $visible, $hidden, $timestamp);
        $stmt->execute();
        $stmt->close();
        setcookie('user_id', $uid, time() + 300, "/");
        http_response_code(200);
        echo "New user preferences saved";
    }
}
$conn->close();
?>