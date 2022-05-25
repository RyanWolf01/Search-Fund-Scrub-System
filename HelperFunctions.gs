// Executes every week to change the dates in the dashboard
function updateDate() {
  var nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + 7);
  nextDate = new Date(nextDate.getFullYear(), nextDate.getMonth(), nextDate.getDate()); // Strips timestamp from the date

  ss = SpreadsheetApp.openByUrl(SPREADSHEET_URL);
  ws = ss.getSheetByName(DASHBOARD.sheetName);
  var prevDate = ws.getSheetValues(DASHBOARD.DATA_COLUMNS.nextDateCell[0], DASHBOARD.DATA_COLUMNS.nextDateCell[1], 1, 1)[0];

  updateCell(ws, DASHBOARD.DATA_COLUMNS.nextDateCell[0], DASHBOARD.DATA_COLUMNS.nextDateCell[1], nextDate);
  updateCell(ws, DASHBOARD.DATA_COLUMNS.prevDateCell[0], DASHBOARD.DATA_COLUMNS.prevDateCell[1], prevDate);
}

// Get Intern Form's item titles and corresponding item ids
function printFormItemIds() {
  var form = FormApp.openByUrl(FORM.url);
  var items = form.getItems();

  for (var item of items) {
    console.log(item.getTitle() + " : " + item.getId());
  }
}

// update entire row
function updateRow(ws, rowNumber, row) {
  ws.getRange(rowNumber, 1, 1, row.length).setValues([row]);
}

// update one cell
function updateCell(ws, rowNumber, colNumber, data) {
  ws.getRange(rowNumber, colNumber, 1, 1).setValues([[data]]);
}

// add a blank row
function addBlankRowAfter(ws, location) {
  ws.insertRowsAfter(location, 1);
}

// format cell for postal codes
function postalFormatting(ws, row, col) {
  console.log("AHHHHHHAHCKCFUCK");
  cellCode = String.fromCharCode(col - 1 + "A".charCodeAt(0)) + row;
  console.log(cellCode);
  var range = ws.getRange(cellCode);
  range.setNumberFormat("00000");
}

// Helper
function myIndexOf(companyIds, companyId) {
  for (var i = 0; i < companyIds.length; i++) {
    if (companyIds[i][0] === companyId) {
      return i;
    }
  }
  return -1;
}

// Helper
function myLength(array) {
  var i;
  for (i = 0; i < array.length; i++) { 
    if (array[i] == "") {
      return i;
    }
  }
  return i;
}

// Used for debugging purposes
function printMap(map) {
  map.forEach((value, key)=>{
    console.log("P:  " + key + " : " + value);
  })
}

function getSubmissionsSet(currComp) {
  var newSet = new Set();
  if (currComp[SUBMISSIONS.DATA_COLUMNS.contact1Status - 1] != undefined) newSet.add(currComp[SUBMISSIONS.DATA_COLUMNS.contact1Status - 1]);
  if (currComp[SUBMISSIONS.DATA_COLUMNS.contact2Status - 1] != undefined) newSet.add(currComp[SUBMISSIONS.DATA_COLUMNS.contact2Status - 1]);
  if (currComp[SUBMISSIONS.DATA_COLUMNS.contact3Status - 1] != undefined) newSet.add(currComp[SUBMISSIONS.DATA_COLUMNS.contact3Status - 1]);

  if (isDirty(newSet)) {
    newSet.add(SUBMISSIONS.CONTACT_STATUS_OPTIONS.dirty);
  }

  return newSet;
}

// Helper
function isDirty(aSet) {
  return (aSet.size === 0 || containsOnly(aSet, SUBMISSIONS.CONTACT_STATUS_OPTIONS.dirty));
}

// isDirty's helper
function containsOnly(aSet, target) {
  for (var it of aSet) {
    if (it != target)
      return false;
  }
  return true;
}

// Generic contains function. Checks if the iterable object, iter, contains the value
function contains(iter, val){
  for (thing of iter) {
    if (thing === val){
      return true;
    }
  }
  return false;
}

