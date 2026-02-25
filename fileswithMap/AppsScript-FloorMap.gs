/**
 * Floor Map Asset Tracker v2 - Google Apps Script Backend
 * 
 * SETUP INSTRUCTIONS:
 * 1. Open Google Sheets → Extensions → Apps Script
 * 2. Paste this code into the editor
 * 3. Create a sheet named "StationMap" with these headers in Row 1:
 *    station | employeeId | employeeName | hostname | position | account | notes
 * 4. Deploy → New deployment → Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 5. Copy the deployment URL into the FloorMap app settings
 */

function doGet(e) {
  const action = e.parameter.action;
  const sheetName = e.parameter.sheet || 'StationMap';
  
  if (action === 'getAll') {
    return getAllData(sheetName);
  }
  
  return ContentService.createTextOutput(JSON.stringify({ error: 'Unknown action' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;
    const sheetName = body.sheet || 'StationMap';
    
    if (action === 'upsert') {
      return upsertRow(sheetName, body.key, body.data);
    }
    
    if (action === 'bulkUpsert') {
      return bulkUpsert(sheetName, body.key, body.rows);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ error: 'Unknown action' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getAllData(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  
  // Auto-create sheet if it doesn't exist
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.getRange(1, 1, 1, 7).setValues([
      ['station', 'employeeId', 'employeeName', 'hostname', 'position', 'account', 'notes']
    ]);
    sheet.getRange(1, 1, 1, 7).setFontWeight('bold');
  }
  
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return ContentService.createTextOutput(JSON.stringify({ data: [] }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  const headers = data[0].map(h => String(h).trim());
  const rows = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = {};
    headers.forEach((h, j) => {
      row[h] = String(data[i][j] || '').trim();
    });
    if (row.station) rows.push(row);
  }
  
  return ContentService.createTextOutput(JSON.stringify({ data: rows }))
    .setMimeType(ContentService.MimeType.JSON);
}

function upsertRow(sheetName, keyField, rowData) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.getRange(1, 1, 1, 7).setValues([
      ['station', 'employeeId', 'employeeName', 'hostname', 'position', 'account', 'notes']
    ]);
    sheet.getRange(1, 1, 1, 7).setFontWeight('bold');
  }
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).trim());
  const keyCol = headers.indexOf(keyField);
  
  if (keyCol === -1) {
    return ContentService.createTextOutput(JSON.stringify({ error: 'Key column not found: ' + keyField }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  const keyValue = rowData[keyField];
  let targetRow = -1;
  
  // Find existing row
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][keyCol]).trim() === String(keyValue).trim()) {
      targetRow = i + 1; // 1-indexed for Sheets API
      break;
    }
  }
  
  // Build row values
  const newRow = headers.map(h => rowData[h] || '');
  
  if (targetRow > 0) {
    // Update existing
    sheet.getRange(targetRow, 1, 1, headers.length).setValues([newRow]);
  } else {
    // Append new
    sheet.appendRow(newRow);
  }
  
  return ContentService.createTextOutput(JSON.stringify({ success: true, station: keyValue }))
    .setMimeType(ContentService.MimeType.JSON);
}

function bulkUpsert(sheetName, keyField, rows) {
  let count = 0;
  rows.forEach(rowData => {
    upsertRow(sheetName, keyField, rowData);
    count++;
  });
  
  return ContentService.createTextOutput(JSON.stringify({ success: true, count }))
    .setMimeType(ContentService.MimeType.JSON);
}
