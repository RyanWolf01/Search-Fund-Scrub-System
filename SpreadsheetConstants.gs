/*
  Spreadsheet and Form constants. Anytime you modify any of the google sheets or form, check this file
  to determine whether a constant (e.g. a column number) in here must be changed.
*/


const SPREADSHEET_URL = "https://docs.google.com/spreadsheets/d/1c3qL1FDnm6RgiwMVQ0gpPq36qLFJV9ox8K5Nsy7EMzk/edit#gid=0";

const FORM = {
  url : "https://docs.google.com/forms/d/1VTIxDvYkyS5CwwbdUKkDlT7bQNRRWLRgZoKlPNv93bU/edit?usp=drive_web",

  // A list of the form's item ids can be found by running 
  // printFormItemIds() in HelperFunctions.gs
  ITEM_IDS : {
    addContact1 : 1305066143  // used to check for bot submissions (from addLinks.gs)
  }
}

const UNSCRUBBED_LIST = {
  // Name and URL
  sheetName : "Unscrubbed List", // Make sure this matches verbatim
  spreadsheetUrl : SPREADSHEET_URL,

  // The number of companies for which to add a link. It's OK to set this to generate links for a number of 
  // companies greater than the number of companies which exist in the spreadsheet (the code will just stop itself after running out 
  // of companies to generate links for). To save time while testing addLinks(), make this a low number.
  NUM_LINK_ADDS : 15,
  dataStartRow : 15, // The column where the program begins generating edit links

  numColumns : 8,
  maxNumRows : 10000, // The maximum number of rows for which edit links can be generated. Arbitrarily high number.

  // Uses numeric, instead of alphabetic notation
  // Must be modified when sheet columns change
  DATA_COLUMNS : {
    companyIdColumn : 8
  },

  // Below is an array of the names of the form fields to be prefilled. The names below must match verbatim with the titles
  // of the form fields. They must also match the order in which the corresponding data appears in the "Unscrubbed List"
  // sheet within MasterSheet (i.e. if "City" preceeds "State", which preceeds "Postal Code" in the sheet, that relative
  // ordering must be reflected in the array below)
  PREFILL_TITLES : ["Company Name", "Street Address", "City", "State", "Postal Code", "Company Name and Address"]
}

const SCRUBS_STARTED = {
  // Name and URL
  sheetName : "Scrubs Started",
  spreadsheetUrl : SPREADSHEET_URL,

  // Data Ranges
  dataStartRow : 2,
  maxNumRows : 1000, // max number of rows that can be included. Arbitrarily high number

  DATA_COLUMNS : {
    companyIdColumn : 8,
    postalCodeColumn : 5
  }
}

const DASHBOARD = {
  // Name and URL
  spreadsheetUrl : SPREADSHEET_URL,
  sheetName : "Dashboard",

  // Data Ranges
  dataStartRow : 5,
  numCols : 14,
  maxNumRows : 20,

  DATA_COLUMNS : {
    internEmailColumn : 1,
    nextDateCell : [1, 3],
    prevDateCell : [2, 3]
  }
}

const SUBMISSIONS = {
  // Name and URL
  sheetName : "Submissions",
  spreadsheetUrl : SPREADSHEET_URL,
  
  // Data Ranges
  dataStartRow : 3, // Row where headers stop, data begins
  numColumns : 36,
  maxNumRows : 12000,  // max number of rows that can be included. Arbitrarily high number
  startOffset : 3,  // first x columns in submissions that aren't matched with form item id numbers 

  // Used to update the Dashboard. If one of these locations changes in the submissions,
  // you must update the values here.
  DATA_COLUMNS : {
    contact1Status : 18,
    contact2Status : 26,
    contact3Status : 34,
    timestampColumn : 1,
    internEmailColumn : 2,
    formURLColumn : 3,
    companyStatusColumn : 36,
    postalCodeColumn : 8,
  },

  // Used to determine overall company scrub status. Text must match form options verbatim.
  CONTACT_STATUS_OPTIONS : {
    cleanEmail : "Clean (Valid Email)",
    cleanLinkedIn : "Clean (LinkedIn Only)",
    dirty : "Dirty",
    acceptAll : "Accept All"
  }
}

// This is the ordering of precedence from which overall company scrub status
// is determined (e.g. if you have a cleanEmail contact and cleanLinkedIn
// contact for one company, the company's scrub status will appear as cleanEmail
// because that option appears first in the array below)
SUBMISSIONS.companyStatusDominanceOrdering = [
  SUBMISSIONS.CONTACT_STATUS_OPTIONS.cleanEmail,
  SUBMISSIONS.CONTACT_STATUS_OPTIONS.acceptAll,
  SUBMISSIONS.CONTACT_STATUS_OPTIONS.cleanLinkedIn,
  SUBMISSIONS.CONTACT_STATUS_OPTIONS.dirty];

