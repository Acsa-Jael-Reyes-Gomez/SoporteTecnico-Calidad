param(
  [Parameter(Mandatory=$true)][string]$ManifestPath,
  [Parameter(Mandatory=$true)][string]$OutputPath
)

$ErrorActionPreference = 'Stop'
$parsedManifest = Get-Content -LiteralPath $ManifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
$manifest = New-Object System.Collections.ArrayList
foreach ($entry in $parsedManifest) { [void]$manifest.Add($entry) }
$excel = $null
$workbook = $null

function Set-Block($sheetRef, $address, $title, $value, $color, $fontColor = 16777215) {
  $parts = $address.Split('|')
  $head = $sheetRef.Range($parts[0])
  $body = $sheetRef.Range($parts[1])
  $head.Merge()
  $body.Merge()
  $head.Value2 = [string]$title
  $body.Value2 = [double]$value
  $head.Interior.Color = $color
  $head.Font.Color = $fontColor
  $head.Font.Bold = $true
  $head.HorizontalAlignment = -4108
  $body.Font.Bold = $true
  $body.Font.Size = 16
  $body.HorizontalAlignment = -4108
  $head.Borders.LineStyle = 1
  $body.Borders.LineStyle = 1
}

function Set-TicketSheetContent($sheetRef, $payload) {
  $sheetRef.Range('A1:Q1').Merge()
  $sheetRef.Range('A1').Value2 = 'REPORTE DE TICKETS DE SOPORTE TÉCNICO'
  $sheetRef.Range('A1:Q1').Interior.Color = 6758152
  $sheetRef.Range('A1:Q1').Font.Color = 16777215
  $sheetRef.Range('A1:Q1').Font.Bold = $true
  $sheetRef.Range('A1:Q1').Font.Size = 18
  $sheetRef.Range('A1:Q1').HorizontalAlignment = -4108

  $sheetRef.Range('A2').Value2 = 'PERÍODO:'
  $sheetRef.Range('B2:F2').Merge()
  $sheetRef.Range('B2').Value2 = $payload.periodo
  $sheetRef.Range('G2').Value2 = 'FECHA:'
  $sheetRef.Range('H2:I2').Merge()
  $sheetRef.Range('H2').Value2 = $payload.fecha
  $sheetRef.Range('J2').Value2 = 'HORA:'
  $sheetRef.Range('K2:Q2').Merge()
  $sheetRef.Range('K2').Value2 = $payload.hora
  $sheetRef.Range('A3').Value2 = 'GENERADO POR:'
  $sheetRef.Range('B3:F3').Merge()
  $sheetRef.Range('B3').Value2 = $payload.generadoPor
  $sheetRef.Range('G3').Value2 = 'TÉCNICO:'
  $sheetRef.Range('H3:Q3').Merge()
  $sheetRef.Range('H3').Value2 = $payload.tecnico
  $sheetRef.Range('A2:Q3').Borders.LineStyle = 1
  $sheetRef.Range('A2:Q3').VerticalAlignment = -4108
  $sheetRef.Range('A2:A3').Font.Bold = $true
  $sheetRef.Range('G2:G3').Font.Bold = $true
  $sheetRef.Range('J2').Font.Bold = $true

  Set-Block $sheetRef 'A5:B5|A6:B6' 'TOTAL TICKETS' $payload.totals.total 6758152
  Set-Block $sheetRef 'C5:D5|C6:D6' 'TOTAL INDIVIDUALES' $payload.totals.individuales 13998939
  Set-Block $sheetRef 'E5:F5|E6:F6' 'TOTAL COMPARTIDOS' $payload.totals.compartidos 12611584
  Set-Block $sheetRef 'G5:H5|G6:H6' 'TOTAL BÁSICO' $payload.totals.basico 4697456
  Set-Block $sheetRef 'I5:J5|I6:J6' 'TOTAL INTERMEDIO' $payload.totals.intermedio 3243501 0
  Set-Block $sheetRef 'K5:L5|K6:L6' 'TOTAL COMPLEJO' $payload.totals.complejo 192
  Set-Block $sheetRef 'M5:N5|M6:N6' 'TOTAL EXTRAORDINARIO' $payload.totals.extraordinario 11685044

  $sheetRef.Range('A8:Q8').Merge()
  $sheetRef.Range('A8').Value2 = 'INDIVIDUAL - COMPARTIDOS'
  $sheetRef.Range('A8:Q8').Interior.Color = 6758152
  $sheetRef.Range('A8:Q8').Font.Color = 16777215
  $sheetRef.Range('A8:Q8').Font.Bold = $true
  $sheetRef.Range('A8:Q8').HorizontalAlignment = -4108

  $headers = @('N. Ticket', 'Técnico', 'Unidad', 'Servicio', 'Solución', 'Complejidad', 'Tipo', 'Compartido con')
  $ranges = @('A9', 'B9', 'C9', 'E9', 'G9', 'O9', 'P9', 'Q9')
  foreach ($merge in @('C9:D9', 'E9:F9', 'G9:N9')) { $sheetRef.Range($merge).Merge() }
  for ($i = 0; $i -lt $headers.Count; $i++) { $sheetRef.Range($ranges[$i]).Value2 = $headers[$i] }
  $sheetRef.Range('A9:Q9').Interior.Color = 6758152
  $sheetRef.Range('A9:Q9').Font.Color = 16777215
  $sheetRef.Range('A9:Q9').Font.Bold = $true
  $sheetRef.Range('A9:Q9').HorizontalAlignment = -4108

  $row = 10
  foreach ($ticket in @($payload.tickets)) {
    $sheetRef.Cells.Item($row, 1).Value2 = [string]$ticket.numeroTicket
    $sheetRef.Cells.Item($row, 2).Value2 = [string]$ticket.tecnico
    $sheetRef.Range("C${row}:D${row}").Merge()
    $sheetRef.Cells.Item($row, 3).Value2 = [string]$ticket.unidad
    $sheetRef.Range("E${row}:F${row}").Merge()
    $sheetRef.Cells.Item($row, 5).Value2 = [string]$ticket.servicio
    $sheetRef.Range("G${row}:N${row}").Merge()
    $sheetRef.Cells.Item($row, 7).Value2 = [string]$ticket.solucion
    $sheetRef.Cells.Item($row, 15).Value2 = [string]$ticket.complejidad

    $complexity = ([string]$ticket.complejidad).Normalize([Text.NormalizationForm]::FormD) -replace '\p{Mn}', ''
    switch ($complexity.ToUpperInvariant()) {
      'BASICO' { $sheetRef.Cells.Item($row, 15).Interior.Color = 13434828; $sheetRef.Cells.Item($row, 15).Font.Color = 32438 }
      'INTERMEDIO' { $sheetRef.Cells.Item($row, 15).Interior.Color = 10284031; $sheetRef.Cells.Item($row, 15).Font.Color = 33023 }
      'COMPLEJO' { $sheetRef.Cells.Item($row, 15).Interior.Color = 13551615; $sheetRef.Cells.Item($row, 15).Font.Color = 255 }
      'EXTRAORDINARIO' { $sheetRef.Cells.Item($row, 15).Interior.Color = 15716079; $sheetRef.Cells.Item($row, 15).Font.Color = 11685044 }
    }

    $sheetRef.Cells.Item($row, 15).Font.Bold = $true
    $sheetRef.Cells.Item($row, 15).HorizontalAlignment = -4108
    $sheetRef.Cells.Item($row, 16).Value2 = [string]$ticket.tipo
    $sharedWith = [string]$ticket.compartidoCon
    if ([string]::IsNullOrWhiteSpace($sharedWith)) { $sharedWith = 'N/A' }
    $sheetRef.Cells.Item($row, 17).Value2 = $sharedWith
    $sheetRef.Cells.Item($row, 17).HorizontalAlignment = -4108
    $sheetRef.Range("A${row}:Q${row}").Borders.LineStyle = 1
    $sheetRef.Rows.Item($row).RowHeight = 28
    $row++
  }

  $firstDataRow = 10
  $lastDataRow = [Math]::Max(10, $row - 1)
  $totalRow = $row
  $visibleRows = "SUBTOTAL(103,OFFSET(`$A`$$firstDataRow,ROW(`$A`$$firstDataRow`:`$A`$$lastDataRow)-ROW(`$A`$$firstDataRow),0,1))"
  $uniqueVisible = "($visibleRows/COUNTIF(`$A`$$firstDataRow`:`$A`$$lastDataRow,`$A`$$firstDataRow`:`$A`$$lastDataRow&`"`"))"
  $allRowsVisible = "SUBTOTAL(103,`$A`$$firstDataRow`:`$A`$$lastDataRow)=COUNTA(`$A`$$firstDataRow`:`$A`$$lastDataRow)"

  if ([string]$payload.totalsMode -eq 'rows') {
    $sheetRef.Range('A6').Formula = "=SUBTOTAL(103,`$A`$$firstDataRow`:`$A`$$lastDataRow)"
    $sheetRef.Range('C6').Formula = "=SUMPRODUCT($visibleRows,--(`$P`$$firstDataRow`:`$P`$$lastDataRow=`"Individual`"))"
    $sheetRef.Range('E6').Formula = "=SUMPRODUCT($visibleRows,--(`$P`$$firstDataRow`:`$P`$$lastDataRow=`"Compartido`"))"
    $sheetRef.Range('G6').Formula = "=SUMPRODUCT($visibleRows,--(`$O`$$firstDataRow`:`$O`$$lastDataRow=`"BASICO`"))"
    $sheetRef.Range('I6').Formula = "=SUMPRODUCT($visibleRows,--(`$O`$$firstDataRow`:`$O`$$lastDataRow=`"INTERMEDIO`"))"
    $sheetRef.Range('K6').Formula = "=SUMPRODUCT($visibleRows,--(`$O`$$firstDataRow`:`$O`$$lastDataRow=`"COMPLEJO`"))"
    $sheetRef.Range('M6').Formula = "=SUMPRODUCT($visibleRows,--(`$O`$$firstDataRow`:`$O`$$lastDataRow=`"EXTRAORDINARIO`"))"
  } else {
    $sheetRef.Range('A6').Formula = "=IF($allRowsVisible,SUMPRODUCT($uniqueVisible),SUBTOTAL(103,`$A`$$firstDataRow`:`$A`$$lastDataRow))"
    $sheetRef.Range('C6').Formula = "=IF($allRowsVisible,SUMPRODUCT($visibleRows,--(`$P`$$firstDataRow`:`$P`$$lastDataRow=`"Individual`")/COUNTIFS(`$A`$$firstDataRow`:`$A`$$lastDataRow,`$A`$$firstDataRow`:`$A`$$lastDataRow&`"`",`$P`$$firstDataRow`:`$P`$$lastDataRow,`$P`$$firstDataRow`:`$P`$$lastDataRow&`"`")),SUMPRODUCT($visibleRows,--(`$P`$$firstDataRow`:`$P`$$lastDataRow=`"Individual`")))"
    $sheetRef.Range('E6').Formula = "=IF($allRowsVisible,SUMPRODUCT($visibleRows,--(`$P`$$firstDataRow`:`$P`$$lastDataRow=`"Compartido`")/COUNTIFS(`$A`$$firstDataRow`:`$A`$$lastDataRow,`$A`$$firstDataRow`:`$A`$$lastDataRow&`"`",`$P`$$firstDataRow`:`$P`$$lastDataRow,`$P`$$firstDataRow`:`$P`$$lastDataRow&`"`")),SUMPRODUCT($visibleRows,--(`$P`$$firstDataRow`:`$P`$$lastDataRow=`"Compartido`")))"
    $sheetRef.Range('G6').Formula = "=IF($allRowsVisible,SUMPRODUCT($visibleRows,--(`$O`$$firstDataRow`:`$O`$$lastDataRow=`"BASICO`")/COUNTIFS(`$A`$$firstDataRow`:`$A`$$lastDataRow,`$A`$$firstDataRow`:`$A`$$lastDataRow&`"`",`$O`$$firstDataRow`:`$O`$$lastDataRow,`$O`$$firstDataRow`:`$O`$$lastDataRow&`"`")),SUMPRODUCT($visibleRows,--(`$O`$$firstDataRow`:`$O`$$lastDataRow=`"BASICO`")))"
    $sheetRef.Range('I6').Formula = "=IF($allRowsVisible,SUMPRODUCT($visibleRows,--(`$O`$$firstDataRow`:`$O`$$lastDataRow=`"INTERMEDIO`")/COUNTIFS(`$A`$$firstDataRow`:`$A`$$lastDataRow,`$A`$$firstDataRow`:`$A`$$lastDataRow&`"`",`$O`$$firstDataRow`:`$O`$$lastDataRow,`$O`$$firstDataRow`:`$O`$$lastDataRow&`"`")),SUMPRODUCT($visibleRows,--(`$O`$$firstDataRow`:`$O`$$lastDataRow=`"INTERMEDIO`")))"
    $sheetRef.Range('K6').Formula = "=IF($allRowsVisible,SUMPRODUCT($visibleRows,--(`$O`$$firstDataRow`:`$O`$$lastDataRow=`"COMPLEJO`")/COUNTIFS(`$A`$$firstDataRow`:`$A`$$lastDataRow,`$A`$$firstDataRow`:`$A`$$lastDataRow&`"`",`$O`$$firstDataRow`:`$O`$$lastDataRow,`$O`$$firstDataRow`:`$O`$$lastDataRow&`"`")),SUMPRODUCT($visibleRows,--(`$O`$$firstDataRow`:`$O`$$lastDataRow=`"COMPLEJO`")))"
    $sheetRef.Range('M6').Formula = "=IF($allRowsVisible,SUMPRODUCT($visibleRows,--(`$O`$$firstDataRow`:`$O`$$lastDataRow=`"EXTRAORDINARIO`")/COUNTIFS(`$A`$$firstDataRow`:`$A`$$lastDataRow,`$A`$$firstDataRow`:`$A`$$lastDataRow&`"`",`$O`$$firstDataRow`:`$O`$$lastDataRow,`$O`$$firstDataRow`:`$O`$$lastDataRow&`"`")),SUMPRODUCT($visibleRows,--(`$O`$$firstDataRow`:`$O`$$lastDataRow=`"EXTRAORDINARIO`")))"
  }

  $sheetRef.Range("A${totalRow}:O${totalRow}").Merge()
  $sheetRef.Cells.Item($totalRow, 1).Value2 = 'TOTAL:'
  $sheetRef.Cells.Item($totalRow, 1).HorizontalAlignment = -4152
  $sheetRef.Cells.Item($totalRow, 1).Font.Bold = $true
  $sheetRef.Cells.Item($totalRow, 1).Font.Size = 14
  $sheetRef.Range("P${totalRow}:Q${totalRow}").Merge()
  $totalFormula = if ([string]$payload.totalsMode -eq 'rows') { "=SUBTOTAL(103,`$A`$$firstDataRow`:`$A`$$lastDataRow)" } else { "=IF($allRowsVisible,SUMPRODUCT($uniqueVisible),SUBTOTAL(103,`$A`$$firstDataRow`:`$A`$$lastDataRow))" }
  $sheetRef.Cells.Item($totalRow, 16).Formula = $totalFormula
  $sheetRef.Cells.Item($totalRow, 16).Font.Bold = $true
  $sheetRef.Cells.Item($totalRow, 16).Font.Size = 14
  $sheetRef.Cells.Item($totalRow, 16).HorizontalAlignment = -4108

  $sheetRef.Range("A9:Q$lastDataRow").AutoFilter() | Out-Null
  $sheetRef.Columns('A').ColumnWidth = 12
  $sheetRef.Columns('B').ColumnWidth = 18
  $sheetRef.Columns('C:D').ColumnWidth = 14
  $sheetRef.Columns('E:F').ColumnWidth = 15
  $sheetRef.Columns('G:N').ColumnWidth = 9
  $sheetRef.Columns('O').ColumnWidth = 18
  $sheetRef.Columns('P:Q').ColumnWidth = 15
  $sheetRef.Rows('1:9').RowHeight = 24
  $sheetRef.Range("A1:Q$totalRow").VerticalAlignment = -4108
  $sheetRef.Range("A1:Q$totalRow").WrapText = $true
}

function Get-UniqueSheetName($requestedName, $usedNames) {
  $baseName = ([string]$requestedName -replace '[\x00-\x1F\\/:?*\[\]]', ' ' -replace '\s+', ' ').Trim().Trim("'")
  if ([string]::IsNullOrWhiteSpace($baseName)) { $baseName = 'Reporte' }
  if ($baseName.Length -gt 31) { $baseName = $baseName.Substring(0, 31) }
  $candidate = $baseName
  $sequence = 2
  while ($usedNames.Contains($candidate.ToUpperInvariant())) {
    $suffix = " ($sequence)"
    $limit = 31 - $suffix.Length
    $candidate = $baseName.Substring(0, [Math]::Min($baseName.Length, $limit)).TrimEnd() + $suffix
    $sequence++
  }
  [void]$usedNames.Add($candidate.ToUpperInvariant())
  return $candidate
}

try {
  if (-not $manifest.Count) { throw 'No hay hojas para exportar.' }
  $excel = New-Object -ComObject Excel.Application
  $excel.Visible = $false
  $excel.DisplayAlerts = $false
  $excel.ScreenUpdating = $false
  $excel.EnableEvents = $false
  $workbook = $excel.Workbooks.Add()
  $excel.Calculation = -4135
  $usedSheetNames = New-Object 'System.Collections.Generic.HashSet[string]'
  $missing = [Type]::Missing

  for ($index = 0; $index -lt $manifest.Count; $index++) {
    $item = $manifest[$index]
    $payload = $item.payload
    $sheet = if ($index -eq 0) {
      $workbook.Worksheets.Item(1)
    } else {
      $workbook.Worksheets.Add($missing, $workbook.Worksheets.Item($workbook.Worksheets.Count), $missing, $missing)
    }
    try {
      $sheet.Name = Get-UniqueSheetName ([string]$item.name) $usedSheetNames
      Set-TicketSheetContent $sheet $payload
      $sheet.Activate()
      $sheet.Range('A10').Select()
      $excel.ActiveWindow.FreezePanes = $true
    } finally {
      [void][Runtime.InteropServices.Marshal]::ReleaseComObject($sheet)
    }
  }

  $workbook.Worksheets.Item(1).Activate()
  $workbook.Worksheets.Item(1).Range('A10').Select()
  $excel.Calculation = -4105
  $excel.Calculate()
  $workbook.SaveAs($OutputPath, 51)
  $workbook.Close($true)
  $excel.Quit()
} catch {
  if ($workbook) { try { $workbook.Close($false) } catch {} }
  if ($excel) { try { $excel.Quit() } catch {} }
  throw
} finally {
  if ($workbook) { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($workbook) }
  if ($excel) { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($excel) }
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
}
