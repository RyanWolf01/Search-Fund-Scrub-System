const SPREADSHEET_URL = "https://docs.google.com/spreadsheets/d/1c3qL1FDnm6RgiwMVQ0gpPq36qLFJV9ox8K5Nsy7EMzk/edit#gid=0";

const FORM = {
  URL : "https://docs.google.com/forms/d/1VTIxDvYkyS5CwwbdUKkDlT7bQNRRWLRgZoKlPNv93bU/edit?usp=drive_web",

  ITEM_IDS : {
    OVERALL_SCRUB_STATUS : 1773471687,
    ADD_CONTACT1 : 1305066143
  }
}

const SUBMISSIONS = {
  spreadsheetId : "1c3qL1FDnm6RgiwMVQ0gpPq36qLFJV9ox8K5Nsy7EMzk",
  sheetId : 1587704126,
  sheetName : "Submissions",
  dataRange : "A3:AJ5000",

  // Extra Parameters:
  timestampColumn : 1,
  internEmailColumn : 2,
  formURLColumn : 3,
  companyStatusColumn : 36,
  postalCodeColumn : 8,

  startOffset : 3,
  numColumns : 36, // work to replace
  dataStartRow : 3, // replace
  maxRows : 10, // replace

  // Used to update the Dashboard
  DATA_COLUMNS : {
    CONTACT1_STATUS : 18,
    CONTACT2_STATUS : 26,
    CONTACT3_STATUS : 34,
  },

  COMPANY_STATUS_ID : 49560942,

  // Used to update the Dashboard
  CONTACT_STATUS_OPTIONS : {
    CLEAN_EMAIL : "Clean (Valid Email)",
    CLEAN_LINKEDIN : "Clean (LinkedIn Only)",
    DIRTY : "Dirty",
    ACCEPT_ALL : "Accept All"
  }

  // Max rows and columns can be obtained from the dataRange thing (regex's)
}

// Apologies for the excessively long constant names
SUBMISSIONS.COMPANY_STATUS_DOMINANCE_ORDERING = [SUBMISSIONS.CONTACT_STATUS_OPTIONS.CLEAN_EMAIL,SUBMISSIONS.CONTACT_STATUS_OPTIONS.ACCEPT_ALL,
                                                SUBMISSIONS.CONTACT_STATUS_OPTIONS.CLEAN_LINKEDIN, SUBMISSIONS.CONTACT_STATUS_OPTIONS.DIRTY];

const SCRUBS_STARTED = {
  spreadsheetId : "1c3qL1FDnm6RgiwMVQ0gpPq36qLFJV9ox8K5Nsy7EMzk",
  sheetId : 637765964,
  sheetName : "Scrubs Started",
  companyIdColumn : 8,
  dataRange : "A2:H200",

  // Unique Parameters:
  maxRows : 100,
  dataStartRow : 2
}

const DASHBOARD = {
  spreadsheetId : "1c3qL1FDnm6RgiwMVQ0gpPq36qLFJV9ox8K5Nsy7EMzk",
  sheetId : 1986776618,
  sheetName : "Dashboard",
  dataRange : "A5:N50",

  // Unique Parameters:
  DATA_COLUMNS : {
    INTERN_COLUMN : 1,
    CLEAN_EMAIL_INTERVAL : 2,
    CLEAN_LINKEDIN_INTERVAL : 3,
    ACCEPT_ALL_INTERVAL : 4,
    DIRTY_INTERVAL : 5,
    TOTAL_INTERVAL : 6, 
    CLEAN_EMAIL_TO_DATE : 10, 
    CLEAN_LINKEDIN_TO_DATE : 11, 
    ACCEPT_ALL_TO_DATE : 12,
    DIRTY_TO_DATE : 13,
    TOTAL_TO_DATE : 14,
    NEXT_DATE_CELL : [1, 3],
    PREV_DATE_CELL : [2, 3]
  },

  dataStartRow : 5,
  numCols : 14,
  numRows : 20

  // NUM_COLS_DASHBOARD gotten from dataRange
}

const UNSCRUBBED_LIST = {
  spreadsheetId : "1c3qL1FDnm6RgiwMVQ0gpPq36qLFJV9ox8K5Nsy7EMzk",
  sheetId : 0,
  sheetName : "Unscrubbed List",
  companyIdColumn : 6,
  dataRange : "A2:H1000",

  companyIdColumn : 8,
  dataStartRow : 2,
  numColumns : 8
}

// First to execute when deployment link is clicked
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('WebApp');
}

// Executes after deployment link is loaded (redirects intern to next scrub)
function fetchCompany() {
  // Open Unscrubbed List
  var ss = SpreadsheetApp.openByUrl(SPREADSHEET_URL);
  var ws = ss.getSheetByName(UNSCRUBBED_LIST.sheetName);

  // Grab the lock (prevents race condition errors)
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);

  // Obtain next company row
  nextComp = ws.getSheetValues(UNSCRUBBED_LIST.dataStartRow, 1, 1, UNSCRUBBED_LIST.numColumns)[0];
  nextCompFormURL = nextComp[UNSCRUBBED_LIST.companyIdColumn - 1];

  // Add that row to Scrubs Started
  var ss2 = SpreadsheetApp.openByUrl(SPREADSHEET_URL);
  var ws2 = ss.getSheetByName(SCRUBS_STARTED.sheetName);
  addBlankRowAfter(ws2, SCRUBS_STARTED.dataStartRow - 1);
  updateRow(ws2, SCRUBS_STARTED.dataStartRow, nextComp);

  // Delete row from Unscrubbed List
  deleteRow(UNSCRUBBED_LIST.dataStartRow, UNSCRUBBED_LIST);

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
  var res = updateSubmissions(formResponse);
  updateScrubsStarted(res[0]);      // res[0] == companyId
  checkDashboard(res[1][SUBMISSIONS.internEmailColumn - 1]);
  // updateDashboard(res[1], res[2]);  // res[1] == insertRow, res[2] == oldRow
    
  lock.releaseLock();
}

function isBotSubmission(formResponse) {
  var itemResponses = formResponse.getItemResponses();

  for (var itemResponse of itemResponses) {
    item = itemResponse.getItem();
    if (item.getId() === FORM.ITEM_IDS.ADD_CONTACT1 && itemResponse.getResponse() != null) {
      // console.log("human");
      return false;
    }
  }
//   console.log("bot");
  return true;
}

function updateSubmissions(formResponse) {
  var ss = SpreadsheetApp.openByUrl(SPREADSHEET_URL);
  var ws = ss.getSheetByName(SUBMISSIONS.sheetName);
  
  // The row containing form item ids corresponding to columns in SUBMISSIONS
  topRow = ws.getSheetValues(1, 1, 1, SUBMISSIONS.numColumns)[0];
 
  // console.log(topRow);
  // console.log(responses);

  // Get the form response data and set companyId to the submission's edit URL
  var itemResponses = formResponse.getItemResponses();
  var companyId = formResponse.getEditResponseUrl();

  // The array of data to be entered into the SUBMISSIONS sheet
  insertRow = [];

  // Enter meta-data about the form submission
  insertRow[SUBMISSIONS.timestampColumn - 1] = formResponse.getTimestamp();
  insertRow[SUBMISSIONS.internEmailColumn - 1] = formResponse.getRespondentEmail();
  insertRow[SUBMISSIONS.formURLColumn - 1] = companyId;

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
  for (var opt of SUBMISSIONS.COMPANY_STATUS_DOMINANCE_ORDERING) {
    if (aSet.has(opt)) {
      companyStatus = opt;
      break;
    }
  }
  insertRow[SUBMISSIONS.companyStatusColumn - 1] = companyStatus;

  var map = getDashboardMap(insertRow, []);
  console.log("map['0'] == " + map.keys()[0] + " : " + map.get(map.keys()[0]));
  for (var kv of map) {
    
    console.log("k : " + kv[0] + " v : " + kv[1]);
  }

  // Get ids for every company in SUBMISSIONS. Will check if the submitted company already exists in SUBMISSIONS.
  // If it already exists, remove it and add the updated company submission
  companyIds = ws.getSheetValues(SUBMISSIONS.dataStartRow, SUBMISSIONS.formURLColumn, SUBMISSIONS.maxRows, 1);

  // Find submission with same company id in companyIds. If non-existent, prevComp = -1 
  var prevComp = myIndexOf(companyIds, companyId);

  // Check if submitted company exists. If so, store data in oldRow, delete, then add updated row
  oldRow = [];
  if (prevComp != -1) {
    oldRow = ws.getSheetValues(prevComp + SUBMISSIONS.dataStartRow, 1, 1, SUBMISSIONS.numColumns)[0];
    deleteRow(prevComp + SUBMISSIONS.dataStartRow, SUBMISSIONS);
  }
  addBlankRowAfter(ws, SUBMISSIONS.dataStartRow - 1);
  updateRow(ws, SUBMISSIONS.dataStartRow, insertRow);
  postalFormatting(ws, SUBMISSIONS.dataStartRow, SUBMISSIONS.postalCodeColumn);

  return [companyId, insertRow, oldRow];
}

function updateScrubsStarted(companyId) {
  var ss = SpreadsheetApp.openByUrl(SPREADSHEET_URL);
  var ws = ss.getSheetByName(SCRUBS_STARTED.sheetName);

  companyIds = ws.getSheetValues(SCRUBS_STARTED.dataStartRow, SCRUBS_STARTED.companyIdColumn, SCRUBS_STARTED.maxRows, 1);
  var prevComp = myIndexOf(companyIds, companyId);

  if (prevComp != -1) {
    deleteRow(prevComp + SCRUBS_STARTED.dataStartRow, SCRUBS_STARTED);
  }
}

function checkDashboard(internEmail) {
  var ss = SpreadsheetApp.openByUrl(SPREADSHEET_URL);
  var ws = ss.getSheetByName(DASHBOARD.sheetName);

  internEmails = ws.getSheetValues(DASHBOARD.dataStartRow, DASHBOARD.DATA_COLUMNS.INTERN_COLUMN, DASHBOARD.numRows, 1);  

  // If intern's email doesn't exist in the dashboard, add it.
  if (myIndexOf(internEmails, internEmail) == -1) {
    addBlankRowAfter(ws, DASHBOARD.dataStartRow);
    updateCell(ws, myLength(internEmails) + DASHBOARD.dataStartRow, DASHBOARD.DATA_COLUMNS.INTERN_COLUMN, internEmail);
  }
}

function updateDashboard(currComp, prevComp) {
  var COLS = DASHBOARD.DATA_COLUMNS;

  var ss = SpreadsheetApp.openByUrl(SPREADSHEET_URL);
  var ws = ss.getSheetByName(DASHBOARD.sheetName);

  // Returns a mapping of how to increment counters in the dashboard
  var options = getDashboardMap(currComp, prevComp);
  printMap(options);

  // Get interns emails from current and previous companies. These will be the same 99% of the time
  // Get intern emails from dashboard
  currInternEmail = currComp[SUBMISSIONS.internEmailColumn - 1];
  prevInternEmail = prevComp[SUBMISSIONS.internEmailColumn - 1];
  internEmails = ws.getSheetValues(DASHBOARD.dataStartRow, COLS.INTERN_COLUMN, DASHBOARD.numRows, 1);  

  // Get index of interns in internEmails. Get -1 if they don't exist
  var currInternRowIndex = myIndexOf(internEmails, currInternEmail);
  var prevInternRowIndex = myIndexOf(internEmails, prevInternEmail);

  // For now, don't make modifications if one intern is editing another's responses
  console.log(currInternEmail + "  " + prevInternEmail);
  if (prevInternEmail != null && currInternEmail != prevInternEmail) {
    console.log("returning");
    return;
  }
  
  // now, for an old intern, get that intern's row. 
  // Conditional... if currEmail = prevEmail, Then modify values that should be modified, and push changes
  // else, then for old intern, add the negatives, and for new intern, add the positives

  // For now, let's assume that the emails are the same (99% case)

  newRow = [];
  // prevRow = [];
  if (currInternRowIndex == -1) {
    for (var key in DASHBOARD.DATA_COLUMNS) {
      newRow[DASHBOARD.DATA_COLUMNS[key] - 1] = 0;
    }
  } else {
    newRow = ws.getSheetValues(currInternRowIndex + DASHBOARD.dataStartRow, 1, 1, DASHBOARD.numCols)[0];
    // if (currInternRowIndex != prevInternRowIndex) {
    //   prevRow = ws.getSheetValues(prevInternRowIndex + DASHBOARD.dataStartRow, 1, 1, DASHBOARD.numCols)[0];
    // }
  }
  
  // if (currInternRowIndex == prevInternRowIndex) {
  newRow = updateNewRowArray(newRow, options, prevComp, currInternEmail);
  console.log("newRow");
  console.log(newRow);
  // } else {
  //   res = updateNewRowArray2(newRow, prevRow, options, prevComp, currInternEmail);
  //   prevRow = res[0];
  //   newRow = res[1];
  // }
  // console.log(newRow);
  
  if (currInternRowIndex == -1) {
    addBlankRowAfter(ws, DASHBOARD.dataStartRow - 1);
    updateRow(ws, DASHBOARD.dataStartRow, newRow);
  } else {
    updateRow(ws, currInternRowIndex + DASHBOARD.dataStartRow, newRow);
  }
 
}

function updateNewRowArray(newRow, options, prevComp, internEmail) {
  var COLS = DASHBOARD.DATA_COLUMNS;
  var STATUSES = SUBMISSIONS.CONTACT_STATUS_OPTIONS

  newRow[COLS.INTERN_COLUMN - 1] = internEmail;
  newRow[COLS.CLEAN_EMAIL_INTERVAL - 1] += options.get(STATUSES.CLEAN_EMAIL);
  newRow[COLS.CLEAN_LINKEDIN_INTERVAL - 1] += options.get(STATUSES.CLEAN_LINKEDIN);
  newRow[COLS.ACCEPT_ALL_INTERVAL - 1] += options.get(STATUSES.ACCEPT_ALL);
  newRow[COLS.DIRTY_INTERVAL - 1] += options.get(STATUSES.DIRTY);

  newRow[COLS.CLEAN_EMAIL_TO_DATE - 1] += options.get(STATUSES.CLEAN_EMAIL);
  newRow[COLS.CLEAN_LINKEDIN_TO_DATE- 1] += options.get(STATUSES.CLEAN_LINKEDIN);
  newRow[COLS.ACCEPT_ALL_TO_DATE - 1] += options.get(STATUSES.ACCEPT_ALL);
  newRow[COLS.DIRTY_TO_DATE - 1] += options.get(STATUSES.DIRTY);

  if (prevComp.length === 0) {
    newRow[COLS.TOTAL_INTERVAL - 1] += 1;
    newRow[COLS.TOTAL_TO_DATE - 1] += 1;
  }

  return newRow;
}

function getSubmissionsSet(currComp) {
  var newSet = new Set();
  if (currComp[SUBMISSIONS.DATA_COLUMNS.CONTACT1_STATUS - 1] != undefined) newSet.add(currComp[SUBMISSIONS.DATA_COLUMNS.CONTACT1_STATUS - 1]);
  if (currComp[SUBMISSIONS.DATA_COLUMNS.CONTACT2_STATUS - 1] != undefined) newSet.add(currComp[SUBMISSIONS.DATA_COLUMNS.CONTACT2_STATUS - 1]);
  if (currComp[SUBMISSIONS.DATA_COLUMNS.CONTACT3_STATUS - 1] != undefined) newSet.add(currComp[SUBMISSIONS.DATA_COLUMNS.CONTACT3_STATUS - 1]);

  if (isDirty(newSet)) {
    newSet.add(SUBMISSIONS.CONTACT_STATUS_OPTIONS.DIRTY);
  }

  return newSet;
}


function getDashboardMap(currComp, prevComp) {

  // if newSet is dirty (has no contacts or contains only dirty contacts),
  // and previous company is non-existent or is not dirty, then
  //    options.set(dirty, 1)

  // if newSet is empty, or !newSet.contains(contents != "Dirty"), and
  // ((prevComp.length > 0) and oldSet !(is empty, or !oldSet.contains(contents != "Dirty"))), then


  var newSet = new Set();
  if (currComp[SUBMISSIONS.DATA_COLUMNS.CONTACT1_STATUS - 1] != undefined) newSet.add(currComp[SUBMISSIONS.DATA_COLUMNS.CONTACT1_STATUS - 1]);
  if (currComp[SUBMISSIONS.DATA_COLUMNS.CONTACT2_STATUS - 1] != undefined) newSet.add(currComp[SUBMISSIONS.DATA_COLUMNS.CONTACT2_STATUS - 1]);
  if (currComp[SUBMISSIONS.DATA_COLUMNS.CONTACT3_STATUS - 1] != undefined) newSet.add(currComp[SUBMISSIONS.DATA_COLUMNS.CONTACT3_STATUS - 1]);

  var oldSet = new Set();
  if (prevComp.length > 0) {
    if (prevComp[SUBMISSIONS.DATA_COLUMNS.CONTACT1_STATUS - 1] != "") oldSet.add(prevComp[SUBMISSIONS.DATA_COLUMNS.CONTACT1_STATUS - 1]);
    if (prevComp[SUBMISSIONS.DATA_COLUMNS.CONTACT2_STATUS - 1] != "") oldSet.add(prevComp[SUBMISSIONS.DATA_COLUMNS.CONTACT2_STATUS - 1]);
    if (prevComp[SUBMISSIONS.DATA_COLUMNS.CONTACT3_STATUS - 1] != "") oldSet.add(prevComp[SUBMISSIONS.DATA_COLUMNS.CONTACT3_STATUS - 1]);
  }

  // Key-value pairs added in order of dominance in Submissions Sheet
  var options = new Map();
  options.set(SUBMISSIONS.CONTACT_STATUS_OPTIONS.CLEAN_EMAIL, 0);
  options.set(SUBMISSIONS.CONTACT_STATUS_OPTIONS.ACCEPT_ALL, 0);
  options.set(SUBMISSIONS.CONTACT_STATUS_OPTIONS.CLEAN_LINKEDIN, 0);
  options.set(SUBMISSIONS.CONTACT_STATUS_OPTIONS.DIRTY, 0);

  var i = 0;
  oldSet.forEach(it=>{
    console.log("oldSetIt" + i + ": " + it);
    options.set(it, options.get(it) - 1);
    i++;
  });

  i = 0;
  newSet.forEach(it=>{
    console.log("newSetIt" + i + ": " + it);
    options.set(it, options.get(it) + 1);
    i++;
  });

  // Change how dirty companies are tracked
  if (isDirty(newSet) && (prevComp.length === 0 || !isDirty(oldSet))) {
    options.set(SUBMISSIONS.CONTACT_STATUS_OPTIONS.DIRTY, 1);
  } else if (!isDirty(newSet) && prevComp.length > 0 && isDirty(oldSet)) {
    options.set(SUBMISSIONS.CONTACT_STATUS_OPTIONS.DIRTY, -1);
  } else {
    options.set(SUBMISSIONS.CONTACT_STATUS_OPTIONS.DIRTY, 0);
  }

  return options;
}

function isDirty(aSet) {
  return (aSet.size === 0 || containsOnly(aSet, SUBMISSIONS.CONTACT_STATUS_OPTIONS.DIRTY));
}

function containsOnly(aSet, target) {
  for (var it of aSet) {
    if (it != target)
      return false;
  }
  return true;
}
