function printFormItemIds() {
  var form = FormApp.openByUrl(FORM.URL);
  var items = form.getItems();

  for (var item of items) {
    console.log(item.getTitle() + " : " + item.getId());
  }
}

function deleteRow(rowNumber, SHEET) {
  rowNumber--;

  var deleteDimensionRequest = Sheets.newDeleteDimensionRequest();
  deleteDimensionRequest.range = 
  Sheets.newDimensionRange().setDimension("ROWS").setStartIndex(rowNumber).setEndIndex(rowNumber + 1).setSheetId(SHEET.sheetId);

  var request = Sheets.newRequest();
  request.deleteDimension = deleteDimensionRequest;
  var batchUpdateRequest = Sheets.newBatchUpdateSpreadsheetRequest();
  batchUpdateRequest.requests = [request];

  const result = Sheets.Spreadsheets.batchUpdate(batchUpdateRequest, SHEET.spreadsheetId);
  
  return result;
}

// Currently Unused
function parseStartRowIndex(string) {
  retString = "";
  for (var i = 0; !(string[i] === ":") && i < string.length; i++) {
    if (!isNaN(string[i])){
      retString += string[i];
    }
  }

  return parseInt(retString);
}

function updateRow(ws, rowNumber, row) {
  ws.getRange(rowNumber, 1, 1, row.length).setValues([row]);
}

function addBlankRowAfter(ws, location) {
  ws.insertRowsAfter(location, 1);
}

function postalFormatting(ws, row, col) {
  cellCode = String.fromCharCode(col - 1 + "A".charCodeAt(0)) + row;
  var range = ws.getRange(cellCode);
  range.setNumberFormat("00000");
}

function myIndexOf(companyIds, companyId) {
  for (var i = 0; i < companyIds.length; i++) {
    if (companyIds[i][0] === companyId) {
      return i;
    }
  }
  return -1;
}

function printMap(map) {
  map.forEach((value, key)=>{
    console.log("P:  " + key + " : " + value);
  })
}

function updateDate() {
  var nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + 7);
  nextDate = new Date(nextDate.getFullYear(), nextDate.getMonth(), nextDate.getDate()); // Strips timestamp from the date

  ss = SpreadsheetApp.openByUrl(SPREADSHEET_URL);
  ws = ss.getSheetByName(DASHBOARD.sheetName);
  var prevDate = ws.getSheetValues(DASHBOARD.DATA_COLUMNS.NEXT_DATE_CELL[0], DASHBOARD.DATA_COLUMNS.NEXT_DATE_CELL[1], 1, 1)[0];

  updateCell(ws, DASHBOARD.DATA_COLUMNS.NEXT_DATE_CELL[0], DASHBOARD.DATA_COLUMNS.NEXT_DATE_CELL[1], nextDate);
  updateCell(ws, DASHBOARD.DATA_COLUMNS.PREV_DATE_CELL[0], DASHBOARD.DATA_COLUMNS.PREV_DATE_CELL[1], prevDate);
}

// Updates a single cell
function updateCell(ws, rowNumber, colNumber, data) {
  ws.getRange(rowNumber, colNumber, 1, 1).setValues([[data]]);
}

function myLength(array) {
  var i;
  for (i = 0; i < array.length; i++) { 
    if (array[i] == "") {
      return i;
    }
  }
  return i;
}
