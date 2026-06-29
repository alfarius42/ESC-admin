$ErrorActionPreference = "Stop"

Write-Host "== Smoke: GET /status =="
Invoke-RestMethod -Uri "http://localhost:4000/status" -Method Get | ConvertTo-Json -Depth 5

Write-Host "`n== Smoke: GET /status/health =="
Invoke-RestMethod -Uri "http://localhost:4000/status/health" -Method Get | ConvertTo-Json -Depth 5

$token = if ($env:INTEGRATION_INSTANCE_TOKEN_PLAIN) {
  $env:INTEGRATION_INSTANCE_TOKEN_PLAIN
} else {
  "replace-with-plain-token"
}

$runtimeId = if ($env:INTEGRATION_TEST_RUNTIME_INSTANCE_ID) {
  $env:INTEGRATION_TEST_RUNTIME_INSTANCE_ID
} else {
  "a1b2c3d4e5f6g7h8i9j0k1l2"
}

$body = @{
  runtimeInstanceId = $runtimeId
  productVersion    = "0.1.0"
  licenseStatus     = "active"
  validUntil        = "2027-06-14T23:59:59.000Z"
  reportedAt        = (Get-Date).ToUniversalTime().ToString("o")
} | ConvertTo-Json

Write-Host "`n== Smoke: POST /api/v1/integrations/verify-instance-token =="
Invoke-RestMethod `
  -Uri "http://localhost:4000/api/v1/integrations/verify-instance-token" `
  -Method Post `
  -Headers @{ "X-Instance-Token" = $token } `
  -ContentType "application/json" `
  -Body $body | ConvertTo-Json -Depth 5

Write-Host "`nSmoke OK"
