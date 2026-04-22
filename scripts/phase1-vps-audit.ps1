[CmdletBinding()]
param(
    [string]$HostAlias = "local-executor-gateway-nofwd"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Invoke-Remote {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Script
    )

    $sshArgs = @(
        "-o", "BatchMode=yes",
        "-o", "ConnectTimeout=8",
        $HostAlias,
        "bash -s"
    )

    $Script | & ssh @sshArgs
}

Write-Output "== Phase 1 VPS Audit =="
Write-Output "host_alias: $HostAlias"

Write-Output "`n[containers]"
Invoke-Remote @'
docker ps --format '{{.Names}}\t{{.Status}}\t{{.Ports}}'
'@

Write-Output "`n[sub2api groups]"
Invoke-Remote @'
docker exec origyuan-sub2api-postgres psql -U sub2api -d sub2api -c "select id,name,platform,status from groups order by id;"
'@

Write-Output "`n[sub2api accounts summary]"
Invoke-Remote @'
docker exec origyuan-sub2api-postgres psql -U sub2api -d sub2api -c "select count(*) as total_accounts from accounts where deleted_at is null;"
docker exec origyuan-sub2api-postgres psql -U sub2api -d sub2api -c "select platform,status,count(*) from accounts where deleted_at is null group by platform,status order by platform,status;"
'@

Write-Output "`n[sub2api api keys]"
Invoke-Remote @'
docker exec origyuan-sub2api-postgres psql -U sub2api -d sub2api -c "select id,name,group_id,status,left(key,12)||chr(46)||chr(46)||chr(46) as key_prefix from api_keys where deleted_at is null order by id;"
'@

Write-Output "`n[new-api channels]"
Invoke-Remote @'
python3 -c 'import sqlite3; conn = sqlite3.connect("/opt/origyuan/new-api/data/one-api.db"); conn.row_factory = sqlite3.Row; cur = conn.cursor(); rows = cur.execute("SELECT id,name,type,base_url,`group`,status,models,model_mapping FROM channels ORDER BY id").fetchall(); [print(dict(row)) for row in rows]'
'@

Write-Output "`n[new-api options]"
Invoke-Remote @'
python3 -c 'import sqlite3; conn = sqlite3.connect("/opt/origyuan/new-api/data/one-api.db"); cur = conn.cursor(); row = cur.execute("SELECT value FROM options WHERE key = ?", ("SelfUseModeEnabled",)).fetchone(); print("SelfUseModeEnabled=" + (row[0] if row else "")); print("models_table_count=" + str(cur.execute("SELECT count(*) FROM models").fetchone()[0]))'
'@

Write-Output "`n[new-api status]"
Invoke-Remote @'
python3 -c 'import urllib.request; print(urllib.request.urlopen("http://127.0.0.1:3000/api/status").read().decode())'
'@
