/*
fetchCompany -- Gather the company from UNSCRUBBED_LIST when deployment link is clicked,
and redirect the intern to the google form corresponding to that company.

onSubmit -- When the intern submits a form, commit some spreadsheet operations. First
ensure the submission is coming from an intern and not editLinks.gs (using isBotSubmission()).

updateSubmissions -- Update the submissions spreadsheet with the recently submitted info.

updateScrubsStarted -- Remove the recently scrubbed company from Scrubs Started, which is
designed to store info on companies that have been started (clicked on) but not finihsed.
Ensures companies don't get deleted if someone clicks on the link, then exits their tab.
Unfortunately it's unfeasible to match an intern with a company in SCRUBS_STARTED.

The Dashboard will automatically update.
*/

// First to execute when deployment link is clicked
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('WebApp');
}

// Executes after deployment link is loaded (redirects intern to next scrub)
function fetchCompany() {
  // Open Unscrubbed List
  var ss = SpreadsheetApp.openByUrl(UNSCRUBBED_LIST.spreadsheetUrl);
  var ws = ss.getSheetByName(UNSCRUBBED_LIST.sheetName);

  // This prevents race condition errors
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);

  // Obtain next company row
  nextComp = ws.getSheetValues(UNSCRUBBED_LIST.dataStartRow, 1, 1, UNSCRUBBED_LIST.numColumns)[0];
  nextCompFormURL = nextComp[UNSCRUBBED_LIST.DATA_COLUMNS.companyIdColumn - 1];

  // Add that row to Scrubs Started
  var ss2 = SpreadsheetApp.openByUrl(SCRUBS_STARTED.spreadsheetUrl);
  var ws2 = ss2.getSheetByName(SCRUBS_STARTED.sheetName);
  addBlankRowAfter(ws2, SCRUBS_STARTED.dataStartRow - 1);
  updateRow(ws2, SCRUBS_STARTED.dataStartRow, nextComp);
  postalFormatting(ws2, SCRUBS_STARTED.dataStartRow, SCRUBS_STARTED.DATA_COLUMNS.postalCodeColumn);

  // Delete row from Unscrubbed List
  ws.deleteRow(UNSCRUBBED_LIST.dataStartRow);

  lock.releaseLock();

  // redirect intern to the next URL
  return nextCompFormURL;
}

// Executes when the intern form is submitted
function onSubmit(e) {
  var formResponse = e.response;

  // Stop executing onSubmit if triggered from addLinks.gs generating editURLs
  if (isBotSubmission(formResponse))
    return;

  // This prevents race condition errors
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);

  // Update the sheets
  var companyId = updateSubmissions(formResponse);
  updateScrubsStarted(companyId);
    
  lock.releaseLock();
}

function isBotSubmission(formResponse) {
  var itemResponses = formResponse.getItemResponses();

  // Check if addContact1 question is answered (required to answer if human). 
  // If unanswered, a human couldn't have completed this submission
  for (var itemResponse of itemResponses) {
    item = itemResponse.getItem();
    if (item.getId() === FORM.ITEM_IDS.addContact1 && itemResponse.getResponse() != null) {
      // console.log("human");
      return false;
    }
  }
  // console.log("bot");
  return true;
}

function updateSubmissions(formResponse) {
  var ss = SpreadsheetApp.openByUrl(SUBMISSIONS.spreadsheetUrl);
  var ws = ss.getSheetByName(SUBMISSIONS.sheetName);
  
  // The row containing form item ids corresponding to columns in SUBMISSIONS
  topRow = ws.getSheetValues(1, 1, 1, SUBMISSIONS.numColumns)[0];

  // Get the form response data and set companyId to the submission's edit URL
  var itemResponses = formResponse.getItemResponses();
  var companyId = formResponse.getEditResponseUrl();

  // The array of data to be entered into the SUBMISSIONS sheet
  insertRow = [];

  // Enter meta-data about the form submission
  insertRow[SUBMISSIONS.DATA_COLUMNS.timestampColumn - 1] = formResponse.getTimestamp();
  insertRow[SUBMISSIONS.DATA_COLUMNS.internEmailColumn - 1] = formResponse.getRespondentEmail();
  insertRow[SUBMISSIONS.DATA_COLUMNS.formURLColumn - 1] = companyId;

  // Match Columns in SUBMISSIONS (indexes in insertRow) with corresponding 
  // entries from the intern form submission via the form's itemIds
  for (var i = SUBMISSIONS.startOffset; i < topRow.length; i++) {
    for (var j = 0; j < itemResponses.length; j++){
      if (topRow[i] === itemResponses[j].getItem().getId()) {
        insertRow[i] = itemResponses[j].getResponse();
        break;
      }
    }
  }

  // Use data in insertRow to determine overall scrub status.
  var companyStatus;
  var aSet = getSubmissionsSet(insertRow);
  for (var opt of SUBMISSIONS.companyStatusDominanceOrdering) {
    if (aSet.has(opt)) {
      companyStatus = opt;
      break;
    }
  }
  insertRow[SUBMISSIONS.DATA_COLUMNS.companyStatusColumn - 1] = companyStatus;

  // Get ids for every company in SUBMISSIONS. Will check if the submitted company already exists in SUBMISSIONS.
  // If it already exists, remove it and add the updated company submission
  companyIds = ws.getSheetValues(SUBMISSIONS.dataStartRow, SUBMISSIONS.DATA_COLUMNS.formURLColumn, SUBMISSIONS.maxNumRows, 1);

  // Find submission with same company id in companyIds. If non-existent, prevComp = -1 
  var prevComp = myIndexOf(companyIds, companyId);

  // Check if submitted company exists. If so, store data in oldRow, delete, then add updated row
  oldRow = [];
  if (prevComp != -1) {
    oldRow = ws.getSheetValues(prevComp + SUBMISSIONS.dataStartRow, 1, 1, SUBMISSIONS.numColumns)[0];
    ws.deleteRow(prevComp + SUBMISSIONS.dataStartRow);
  }
  addBlankRowAfter(ws, SUBMISSIONS.dataStartRow - 1);
  updateRow(ws, SUBMISSIONS.dataStartRow, insertRow);
  postalFormatting(ws, SUBMISSIONS.dataStartRow, SUBMISSIONS.DATA_COLUMNS.postalCodeColumn);

  return companyId;
}

function updateScrubsStarted(companyId) {
  var ss = SpreadsheetApp.openByUrl(SCRUBS_STARTED.spreadsheetUrl);
  var ws = ss.getSheetByName(SCRUBS_STARTED.sheetName);

  // Find index of companyId within the company ids in SRUBS_STARTED, or -1 if it doesn't exist
  companyIds = ws.getSheetValues(SCRUBS_STARTED.dataStartRow, SCRUBS_STARTED.DATA_COLUMNS.companyIdColumn, SCRUBS_STARTED.maxNumRows, 1);
  var prevComp = myIndexOf(companyIds, companyId);

  // Delete company from SCRUBS_STARTED
  if (prevComp != -1) {
    ws.deleteRow(prevComp + SCRUBS_STARTED.dataStartRow);
  }
}
