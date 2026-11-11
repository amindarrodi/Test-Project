<?php
// Public data is cached briefly to reduce load and preserve the last good response.
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
$cacheFile = sys_get_temp_dir() . '/nerkhnama-rates-v1.json';
$cache = null;
if (is_file($cacheFile)) {
    $decoded = json_decode((string) @file_get_contents($cacheFile), true);
    if (is_array($decoded)) $cache = $decoded;
}
function fetchJson($url) {
    $context = stream_context_create(['http' => ['timeout' => 6, 'header' => "User-Agent: NerkhNama/1.0\r\nAccept: application/json\r\n"], 'ssl' => ['verify_peer' => true, 'verify_peer_name' => true]]);
    $body = @file_get_contents($url, false, $context);
    return $body === false ? null : json_decode($body, true);
}
if (!$cache || !isset($cache['fetched_at']) || time() - $cache['fetched_at'] >= 300) {
    $fx = fetchJson('https://open.er-api.com/v6/latest/USD');
    $gold = fetchJson('https://api.gold-api.com/price/XAU');
    $irr = $fx['rates']['IRR'] ?? null;
    $eur = $fx['rates']['EUR'] ?? null;
    $xau = $gold['price'] ?? null;
    if (is_numeric($irr) && $irr > 0 && is_numeric($eur) && $eur > 0) {
        $usd = (float)$irr / 10; // 10 Iranian rials = 1 toman
        $validGold = is_numeric($xau) && $xau > 0;
        $cache = ['fetched_at' => time(), 'source_updated_at' => $fx['time_last_update_unix'] ?? null,
          'gold_updated_at' => $validGold ? ($gold['updatedAt'] ?? null) : null,
          'rates' => ['USD' => $usd, 'EUR' => $usd / (float)$eur, 'XAU' => $validGold ? (float)$xau : null, 'GOLD' => $validGold ? (float)$xau / 31.1034768 * 0.75 * $usd : null]];
        @file_put_contents($cacheFile, json_encode($cache), LOCK_EX);
    }
}
if (!$cache) {
    http_response_code(503);
    echo json_encode(['error' => 'منبع نرخ در دسترس نیست. لطفاً دوباره تلاش کنید.'], JSON_UNESCAPED_UNICODE);
    exit;
}
$cache['stale'] = time() - $cache['fetched_at'] >= 600;
echo json_encode($cache, JSON_UNESCAPED_UNICODE);
