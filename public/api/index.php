<?php
/* Pass-through to the Travel API.

   Browsers won't let the HTTPS site call the API directly: it has no
   certificate they trust (a self-signed development one for "localhost"),
   and before that it spoke plain HTTP ("mixed content"). So on HTTPS the app
   calls /api/<path> on its own domain (see public/.htaccess) and this script
   forwards the request (method, query string, body, Authorization,
   Content-Type, Accept) to the API and sends the answer back unchanged.

   Only the one API below can be reached through here. Keep it in step with
   API_ORIGIN in src/config/AuthContext.jsx. */

const UPSTREAM = 'https://49.206.196.35:8030';

// The API's certificate is self-signed, so it can't be verified. The address
// above is fixed, so the check is skipped; set this to true once the API has
// a real certificate.
const VERIFY_TLS = false;

function fail($status, $message)
{
    http_response_code($status);
    header('Content-Type: application/json');
    echo json_encode(array('detail' => $message));
    exit;
}

function header_in($headers, $name)
{
    foreach ($headers as $k => $v) {
        if (strcasecmp($k, $name) === 0) return $v;
    }
    return null;
}

// FormData fields as curl wants them: nested arrays become key[sub]
function flatten_fields($value, $prefix, &$out)
{
    foreach ($value as $k => $v) {
        $key = $prefix === '' ? $k : $prefix . '[' . $k . ']';
        if (is_array($v)) flatten_fields($v, $key, $out);
        else $out[$key] = $v;
    }
}

if (!function_exists('curl_init')) fail(500, 'The API proxy needs the PHP curl extension.');

/* ---- where to: /api/TripDashboard/?username=… → UPSTREAM/TripDashboard/?username=… */
$uri = isset($_SERVER['REQUEST_URI']) ? $_SERVER['REQUEST_URI'] : '';
$path = (string) parse_url($uri, PHP_URL_PATH);
$at = strpos($path, '/api/');
if ($at === false) fail(404, 'Not an API path.');
$path = substr($path, $at + 4);
if (!preg_match('#^/[A-Za-z0-9_\-./%]*$#', $path) || strpos($path, '..') !== false) {
    fail(400, 'Bad API path.');
}
$query = parse_url($uri, PHP_URL_QUERY);
$url = UPSTREAM . $path . ($query ? '?' . $query : '');

/* ---- request headers */
$in = function_exists('getallheaders') ? getallheaders() : array();

// Apache can hide Authorization from PHP (it does on the live server), so
// the app also sends the token as X-Authorization; .htaccess tries to copy
// Authorization into the env as well.
$auth = header_in($in, 'Authorization');
foreach (array('HTTP_AUTHORIZATION', 'REDIRECT_HTTP_AUTHORIZATION', 'HTTP_X_AUTHORIZATION') as $k) {
    if (!$auth && !empty($_SERVER[$k])) $auth = $_SERVER[$k];
}
if (!$auth) $auth = header_in($in, 'X-Authorization');

$accept = header_in($in, 'Accept');
$out = array(
    'Accept: ' . ($accept ? $accept : 'application/json'),
    'Expect:', // no "100 Continue" round trip
);
if ($auth) $out[] = 'Authorization: ' . $auth;
if (!empty($_SERVER['REMOTE_ADDR'])) $out[] = 'X-Forwarded-For: ' . $_SERVER['REMOTE_ADDR'];

/* ---- body: forwarded as is. api/.user.ini keeps PHP from consuming
   multipart bodies; where that setting isn't honoured the form is rebuilt
   from $_POST / $_FILES (curl then picks its own boundary). */
$method = isset($_SERVER['REQUEST_METHOD']) ? strtoupper($_SERVER['REQUEST_METHOD']) : 'GET';
$type = isset($_SERVER['CONTENT_TYPE']) ? $_SERVER['CONTENT_TYPE'] : header_in($in, 'Content-Type');
$raw = file_get_contents('php://input');
$body = null;

if ($raw !== false && $raw !== '') {
    $body = $raw;
    if ($type) $out[] = 'Content-Type: ' . $type;
} elseif ($type && stripos($type, 'multipart/form-data') === 0 && ($_POST || $_FILES)) {
    $body = array();
    flatten_fields($_POST, '', $body);
    foreach ($_FILES as $field => $f) {
        if (is_array($f['tmp_name'])) {
            foreach ($f['tmp_name'] as $i => $tmp) {
                if ($f['error'][$i] === UPLOAD_ERR_OK) {
                    $body[$field . '[' . $i . ']'] = new CURLFile($tmp, $f['type'][$i], $f['name'][$i]);
                }
            }
        } elseif ($f['error'] === UPLOAD_ERR_OK) {
            $body[$field] = new CURLFile($f['tmp_name'], $f['type'], $f['name']);
        }
    }
}

/* ---- send */
$keep = array('content-type', 'content-disposition');
$back = array();

$ch = curl_init($url);
curl_setopt_array($ch, array(
    CURLOPT_CUSTOMREQUEST => $method,
    CURLOPT_HTTPHEADER => $out,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => false,
    CURLOPT_CONNECTTIMEOUT => 10,
    CURLOPT_TIMEOUT => 120,
    CURLOPT_ENCODING => '', // accept gzip from the API, hand it back decoded
    CURLOPT_SSL_VERIFYPEER => VERIFY_TLS,
    CURLOPT_SSL_VERIFYHOST => VERIFY_TLS ? 2 : 0,
    CURLOPT_HEADERFUNCTION => function ($ch, $line) use (&$back, $keep) {
        $colon = strpos($line, ':');
        if ($colon !== false && in_array(strtolower(trim(substr($line, 0, $colon))), $keep, true)) {
            $back[] = trim($line);
        }
        return strlen($line);
    },
));
if ($method === 'HEAD') curl_setopt($ch, CURLOPT_NOBODY, true);
if ($body !== null) curl_setopt($ch, CURLOPT_POSTFIELDS, $body);

$response = curl_exec($ch);
if ($response === false) {
    fail(502, 'Could not reach the API: ' . curl_error($ch));
}
$status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);

/* ---- answer */
http_response_code($status ? $status : 502);
foreach ($back as $h) header($h);
header('Cache-Control: no-store');
echo $response;
