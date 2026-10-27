param(
  [Parameter(Mandatory=$true)][string]$InputPath,
  [Parameter(Mandatory=$true)][string]$OutputPath
)

$ErrorActionPreference = 'Stop'
$payload = Get-Content -LiteralPath $InputPath -Raw -Encoding UTF8 | ConvertFrom-Json
$excel = $null
$workbook = $null
$sheet = $null

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

try {
  $excel = New-Object -ComObject Excel.Application
  $excel.Visible = $false
  $excel.DisplayAlerts = $false
  $workbook = $excel.Workbooks.Add()
  $sheet = $workbook.Worksheets.Item(1)
  $sheet.Name = 'Tickets'

  $sheet.Range('A1:Q1').Merge()
  $sheet.Range('A1').Value2 = 'REPORTE DE TICKETS DE SOPORTE TÉCNICO'
  $sheet.Range('A1:Q1').Interior.Color = 6758152
  $sheet.Range('A1:Q1').Font.Color = 16777215
  $sheet.Range('A1:Q1').Font.Bold = $true
  $sheet.Range('A1:Q1').Font.Size = 18
  $sheet.Range('A1:Q1').HorizontalAlignment = -4108

  $sheet.Range('A2').Value2 = 'PERÍODO:'
  $sheet.Range('B2:F2').Merge()
  $sheet.Range('B2').Value2 = $payload.periodo
  $sheet.Range('G2').Value2 = 'FECHA:'
  $sheet.Range('H2:I2').Merge()
  $sheet.Range('H2').Value2 = $payload.fecha
  $sheet.Range('J2').Value2 = 'HORA:'
  $sheet.Range('K2:Q2').Merge()
  $sheet.Range('K2').Value2 = $payload.hora
  $sheet.Range('A3').Value2 = 'GENERADO POR:'
  $sheet.Range('B3:F3').Merge()
  $sheet.Range('B3').Value2 = $payload.generadoPor
  $sheet.Range('G3').Value2 = 'TÉCNICO:'
  $sheet.Range('H3:Q3').Merge()
  $sheet.Range('H3').Value2 = $payload.tecnico
  $sheet.Range('A2:Q3').Borders.LineStyle = 1
  $sheet.Range('A2:Q3').VerticalAlignment = -4108
  $sheet.Range('A2:A3').Font.Bold = $true
  $sheet.Range('G2:G3').Font.Bold = $true
  $sheet.Range('J2').Font.Bold = $true

  Set-Block $sheet 'A5:B5|A6:B6' 'TOTAL TICKETS' $payload.totals.total 6758152
  Set-Block $sheet 'C5:D5|C6:D6' 'TOTAL INDIVIDUALES' $payload.totals.individuales 13998939
  Set-Block $sheet 'E5:F5|E6:F6' 'TOTAL COMPARTIDOS' $payload.totals.compartidos 12611584
  Set-Block $sheet 'G5:H5|G6:H6' 'TOTAL BÁSICO' $payload.totals.basico 4697456
  Set-Block $sheet 'I5:J5|I6:J6' 'TOTAL INTERMEDIO' $payload.totals.intermedio 3243501 0
  Set-Block $sheet 'K5:L5|K6:L6' 'TOTAL COMPLEJO' $payload.totals.complejo 192
  Set-Block $sheet 'M5:N5|M6:N6' 'TOTAL EXTRAORDINARIO' $payload.totals.extraordinario 11685044

  $sheet.Range('A8:Q8').Merge()
  $sheet.Range('A8').Value2 = 'INDIVIDUAL - COMPARTIDOS'
  $sheet.Range('A8:Q8').Interior.Color = 6758152
  $sheet.Range('A8:Q8').Font.Color = 16777215
  $sheet.Range('A8:Q8').Font.Bold = $true
  $sheet.Range('A8:Q8').HorizontalAlignment = -4108

  $headers = @('N. Ticket', 'Técnico', 'Unidad', 'Servicio', 'Solución', 'Complejidad', 'Tipo', 'Compartido con')
  $ranges = @('A9', 'B9', 'C9', 'E9', 'G9', 'O9', 'P9', 'Q9')
  foreach ($merge in @('C9:D9', 'E9:F9', 'G9:N9')) { $sheet.Range($merge).Merge() }
  for ($i = 0; $i -lt $headers.Count; $i++) { $sheet.Range($ranges[$i]).Value2 = $headers[$i] }
  $sheet.Range('A9:Q9').Interior.Color = 6758152
  $sheet.Range('A9:Q9').Font.Color = 16777215
  $sheet.Range('A9:Q9').Font.Bold = $true
  $sheet.Range('A9:Q9').HorizontalAlignment = -4108

  $row = 10
  foreach ($ticket in @($payload.tickets)) {
    $sheet.Cells.Item($row, 1).Value2 = [string]$ticket.numeroTicket
    $sheet.Cells.Item($row, 2).Value2 = [string]$ticket.tecnico
    $sheet.Range("C${row}:D${row}").Merge()
    $sheet.Cells.Item($row, 3).Value2 = [string]$ticket.unidad
    $sheet.Range("E${row}:F${row}").Merge()
    $sheet.Cells.Item($row, 5).Value2 = [string]$ticket.servicio
    $sheet.Range("G${row}:N${row}").Merge()
    $sheet.Cells.Item($row, 7).Value2 = [string]$ticket.solucion
    $sheet.Cells.Item($row, 15).Value2 = [string]$ticket.complejidad

    $complexity = ([string]$ticket.complejidad).Normalize([Text.NormalizationForm]::FormD) -replace '\p{Mn}', ''
    switch ($complexity.ToUpperInvariant()) {
      'BASICO' { $sheet.Cells.Item($row, 15).Interior.Color = 13434828; $sheet.Cells.Item($row, 15).Font.Color = 32438 }
      'INTERMEDIO' { $sheet.Cells.Item($row, 15).Interior.Color = 10284031; $sheet.Cells.Item($row, 15).Font.Color = 33023 }
      'COMPLEJO' { $sheet.Cells.Item($row, 15).Interior.Color = 13551615; $sheet.Cells.Item($row, 15).Font.Color = 255 }
      'EXTRAORDINARIO' { $sheet.Cells.Item($row, 15).Interior.Color = 15716079; $sheet.Cells.Item($row, 15).Font.Color = 11685044 }
    }

    $sheet.Cells.Item($row, 15).Font.Bold = $true
    $sheet.Cells.Item($row, 15).HorizontalAlignment = -4108
    $sheet.Cells.Item($row, 16).Value2 = [string]$ticket.tipo
    $sharedWith = [string]$ticket.compartidoCon
    if ([string]::IsNullOrWhiteSpace($sharedWith)) { $sharedWith = 'N/A' }
    $sheet.Cells.Item($row, 17).Value2 = $sharedWith
    $sheet.Cells.Item($row, 17).HorizontalAlignment = -4108
    $sheet.Range("A${row}:Q${row}").Borders.LineStyle = 1
    $sheet.Rows.Item($row).RowHeight = 28
    $row++
  }

  $firstDataRow = 10
  $lastDataRow = [Math]::Max(10, $row - 1)
  $totalRow = $row
  $visibleRows = "SUBTOTAL(103,OFFSET(`$A`$$firstDataRow,ROW(`$A`$$firstDataRow`:`$A`$$lastDataRow)-ROW(`$A`$$firstDataRow),0,1))"
  $uniqueVisible = "($visibleRows/COUNTIF(`$A`$$firstDataRow`:`$A`$$lastDataRow,`$A`$$firstDataRow`:`$A`$$lastDataRow&`"`"))"
  $allRowsVisible = "SUBTOTAL(103,`$A`$$firstDataRow`:`$A`$$lastDataRow)=COUNTA(`$A`$$firstDataRow`:`$A`$$lastDataRow)"

  if ([string]$payload.totalsMode -eq 'rows') {
    $sheet.Range('A6').Formula = "=SUBTOTAL(103,`$A`$$firstDataRow`:`$A`$$lastDataRow)"
    $sheet.Range('C6').Formula = "=SUMPRODUCT($visibleRows,--(`$P`$$firstDataRow`:`$P`$$lastDataRow=`"Individual`"))"
    $sheet.Range('E6').Formula = "=SUMPRODUCT($visibleRows,--(`$P`$$firstDataRow`:`$P`$$lastDataRow=`"Compartido`"))"
    $sheet.Range('G6').Formula = "=SUMPRODUCT($visibleRows,--(`$O`$$firstDataRow`:`$O`$$lastDataRow=`"BASICO`"))"
    $sheet.Range('I6').Formula = "=SUMPRODUCT($visibleRows,--(`$O`$$firstDataRow`:`$O`$$lastDataRow=`"INTERMEDIO`"))"
    $sheet.Range('K6').Formula = "=SUMPRODUCT($visibleRows,--(`$O`$$firstDataRow`:`$O`$$lastDataRow=`"COMPLEJO`"))"
    $sheet.Range('M6').Formula = "=SUMPRODUCT($visibleRows,--(`$O`$$firstDataRow`:`$O`$$lastDataRow=`"EXTRAORDINARIO`"))"
  } else {
    $sheet.Range('A6').Formula = "=IF($allRowsVisible,SUMPRODUCT($uniqueVisible),SUBTOTAL(103,`$A`$$firstDataRow`:`$A`$$lastDataRow))"
    $sheet.Range('C6').Formula = "=IF($allRowsVisible,SUMPRODUCT($visibleRows,--(`$P`$$firstDataRow`:`$P`$$lastDataRow=`"Individual`")/COUNTIFS(`$A`$$firstDataRow`:`$A`$$lastDataRow,`$A`$$firstDataRow`:`$A`$$lastDataRow&`"`",`$P`$$firstDataRow`:`$P`$$lastDataRow,`$P`$$firstDataRow`:`$P`$$lastDataRow&`"`")),SUMPRODUCT($visibleRows,--(`$P`$$firstDataRow`:`$P`$$lastDataRow=`"Individual`")))"
    $sheet.Range('E6').Formula = "=IF($allRowsVisible,SUMPRODUCT($visibleRows,--(`$P`$$firstDataRow`:`$P`$$lastDataRow=`"Compartido`")/COUNTIFS(`$A`$$firstDataRow`:`$A`$$lastDataRow,`$A`$$firstDataRow`:`$A`$$lastDataRow&`"`",`$P`$$firstDataRow`:`$P`$$lastDataRow,`$P`$$firstDataRow`:`$P`$$lastDataRow&`"`")),SUMPRODUCT($visibleRows,--(`$P`$$firstDataRow`:`$P`$$lastDataRow=`"Compartido`")))"
    $sheet.Range('G6').Formula = "=IF($allRowsVisible,SUMPRODUCT($visibleRows,--(`$O`$$firstDataRow`:`$O`$$lastDataRow=`"BASICO`")/COUNTIFS(`$A`$$firstDataRow`:`$A`$$lastDataRow,`$A`$$firstDataRow`:`$A`$$lastDataRow&`"`",`$O`$$firstDataRow`:`$O`$$lastDataRow,`$O`$$firstDataRow`:`$O`$$lastDataRow&`"`")),SUMPRODUCT($visibleRows,--(`$O`$$firstDataRow`:`$O`$$lastDataRow=`"BASICO`")))"
    $sheet.Range('I6').Formula = "=IF($allRowsVisible,SUMPRODUCT($visibleRows,--(`$O`$$firstDataRow`:`$O`$$lastDataRow=`"INTERMEDIO`")/COUNTIFS(`$A`$$firstDataRow`:`$A`$$lastDataRow,`$A`$$firstDataRow`:`$A`$$lastDataRow&`"`",`$O`$$firstDataRow`:`$O`$$lastDataRow,`$O`$$firstDataRow`:`$O`$$lastDataRow&`"`")),SUMPRODUCT($visibleRows,--(`$O`$$firstDataRow`:`$O`$$lastDataRow=`"INTERMEDIO`")))"
    $sheet.Range('K6').Formula = "=IF($allRowsVisible,SUMPRODUCT($visibleRows,--(`$O`$$firstDataRow`:`$O`$$lastDataRow=`"COMPLEJO`")/COUNTIFS(`$A`$$firstDataRow`:`$A`$$lastDataRow,`$A`$$firstDataRow`:`$A`$$lastDataRow&`"`",`$O`$$firstDataRow`:`$O`$$lastDataRow,`$O`$$firstDataRow`:`$O`$$lastDataRow&`"`")),SUMPRODUCT($visibleRows,--(`$O`$$firstDataRow`:`$O`$$lastDataRow=`"COMPLEJO`")))"
    $sheet.Range('M6').Formula = "=IF($allRowsVisible,SUMPRODUCT($visibleRows,--(`$O`$$firstDataRow`:`$O`$$lastDataRow=`"EXTRAORDINARIO`")/COUNTIFS(`$A`$$firstDataRow`:`$A`$$lastDataRow,`$A`$$firstDataRow`:`$A`$$lastDataRow&`"`",`$O`$$firstDataRow`:`$O`$$lastDataRow,`$O`$$firstDataRow`:`$O`$$lastDataRow&`"`")),SUMPRODUCT($visibleRows,--(`$O`$$firstDataRow`:`$O`$$lastDataRow=`"EXTRAORDINARIO`")))"
  }

  $sheet.Range("A${totalRow}:O${totalRow}").Merge()
  $sheet.Cells.Item($totalRow, 1).Value2 = 'TOTAL:'
  $sheet.Cells.Item($totalRow, 1).HorizontalAlignment = -4152
  $sheet.Cells.Item($totalRow, 1).Font.Bold = $true
  $sheet.Cells.Item($totalRow, 1).Font.Size = 14
  $sheet.Range("P${totalRow}:Q${totalRow}").Merge()
  $totalFormula = if ([string]$payload.totalsMode -eq 'rows') { "=SUBTOTAL(103,`$A`$$firstDataRow`:`$A`$$lastDataRow)" } else { "=IF($allRowsVisible,SUMPRODUCT($uniqueVisible),SUBTOTAL(103,`$A`$$firstDataRow`:`$A`$$lastDataRow))" }
  $sheet.Cells.Item($totalRow, 16).Formula = $totalFormula
  $sheet.Cells.Item($totalRow, 16).Font.Bold = $true
  $sheet.Cells.Item($totalRow, 16).Font.Size = 14
  $sheet.Cells.Item($totalRow, 16).HorizontalAlignment = -4108

  $sheet.Range("A9:Q$lastDataRow").AutoFilter() | Out-Null
  $sheet.Columns('A').ColumnWidth = 12
  $sheet.Columns('B').ColumnWidth = 18
  $sheet.Columns('C:D').ColumnWidth = 14
  $sheet.Columns('E:F').ColumnWidth = 15
  $sheet.Columns('G:N').ColumnWidth = 9
  $sheet.Columns('O').ColumnWidth = 18
  $sheet.Columns('P:Q').ColumnWidth = 15
  $sheet.Rows('1:9').RowHeight = 24
  $sheet.Range("A1:Q$totalRow").VerticalAlignment = -4108
  $sheet.Range("A1:Q$totalRow").WrapText = $true
  $sheet.Activate()
  $sheet.Range('A10').Select()
  $excel.ActiveWindow.FreezePanes = $true
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
  if ($sheet) { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($sheet) }
  if ($workbook) { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($workbook) }
  if ($excel) { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($excel) }
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
}
