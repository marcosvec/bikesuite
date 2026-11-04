param([string]$Url, [string]$Destination)
$ErrorActionPreference = 'Stop'
$response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 25
[IO.File]::WriteAllText($Destination, $response.Content)
