<#
.SYNOPSIS
SuperMagic Asset Studio PowerShell CLI for local AI agents.
.DESCRIPTION
Executes JSON commands against the FootballSpriteStudio project format.
Requires Node.js 20 or later. No npm dependencies. All commands are local.
Created by Saeed <saeedmsalehi1990@gmail.com>.
.EXAMPLE
pwsh -NoProfile -File ./SuperMagicAssetStudio.ps1 -Project ./alex.json -CommandFile ./cli-example-commands.json
.EXAMPLE
pwsh -NoProfile -File ./SuperMagicAssetStudio.ps1 -Project ./alex.json -CommandJson '{"commands":[{"op":"review"}]}'
.EXAMPLE
pwsh -NoProfile -File ./SuperMagicAssetStudio.ps1 -Project ./alex.json -Operation summary
#>
[CmdletBinding(DefaultParameterSetName='File')]
param(
    [string]$Project = './player.json',
    [Parameter(ParameterSetName='File')][string]$CommandFile,
    [Parameter(ParameterSetName='JSON')][string]$CommandJson,
    [Parameter(ParameterSetName='Operation')][string]$Operation,
    [string]$Output,
    [switch]$DryRun,
    [switch]$ListOperations,
    [switch]$Help
)
$ErrorActionPreference = 'Stop'
$engine = Join-Path $PSScriptRoot 'agent-cli.mjs'
if (!(Test-Path -LiteralPath $engine)) { throw "CLI engine not found: $engine" }
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCommand) { throw 'Node.js 20+ is required. Install Node.js, then run this PowerShell script again.' }
$argsList = @()
if ($Help) { $argsList += '--help' }
elseif ($ListOperations) { $argsList += '--list-ops' }
else {
    $argsList += @('--project', $Project)
    if ($CommandFile) { $argsList += @('--command-file', $CommandFile) }
    elseif ($CommandJson) { $argsList += @('--commands', $CommandJson) }
    elseif ($Operation) { $argsList += @('--op', $Operation) }
    else { throw 'Provide -CommandFile, -CommandJson, or -Operation. See -Help.' }
    if ($Output) { $argsList += @('--output', $Output) }
    if ($DryRun) { $argsList += '--dry-run' }
}
& $nodeCommand.Source $engine @argsList
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }