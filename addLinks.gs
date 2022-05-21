/*
addLinks is meant to add the Google Form URLs to the "Unscrubbed List" within the Master List.
These URLs link to google forms with the prefilled data for each company from the "Unscrubbed List" sheet.
These links are used by the intern to scrub each company. However, they also function as unique 
ID codes for each company. Each URL is unique to the company, even for companies that are duplicated
in the spreadsheet. To generate these URLs, the program takes the data corresponding to each company and 
prefills it into the google form. Then, the program actually submits the form, and gathers the resulting
edit submission link, which it adds to the "Unscrubbed List" sheet. Every edit submission link is unique
and leads to forms that have the submitted data prefilled, which is what's necessary for this application. 
Also, when the intern submits the form corresponding to the edit url, the data that the intern enters is
kept within the form. Thus, if the intern wants to modify their submission, they simply re-click the link
and their updated information is there. This would not hold true for prefilled links.
*/

function addLinks() {
 
  // Constants that can be modified /////////////////////////////////////////////////////////////////////////////////////////////////////
  ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  // Below is an array of the names of the form fields to be prefilled. The names below must match verbatim with the titles
  // of the form fields. They must also match the order in which the corresponding data appears in the "Unscrubbed List"
  // sheet within MasterSheet (i.e. if "City" preceeds "State", which preceeds "Postal Code" in the sheet, that relative
  // ordering must be reflected in the array below)
  PREFILL_TITLES = ["Company Name", "Street Address", "City", "State", "Postal Code", "Company Name and Address"];
  
  // Spreadsheet Constants
  const SPREADSHEET_URL = "https://docs.google.com/spreadsheets/d/1c3qL1FDnm6RgiwMVQ0gpPq36qLFJV9ox8K5Nsy7EMzk/edit#gid=0";
  const SHEET_NAME = "Unscrubbed List"; 
  const SHEET_DIMENSIONS = "!A1:H2000"; // Dimensions of the entire spreadsheet (H2000 is arbitrarily large to ensure all rows are 
  // accounted for)
  const URL_COL = 8; // The column corresponding to the Google Form's URL
  const START_ROW = 2;  // The first row for which to generate a URL (not zero-indexed) Make sure this is at least 2, or else you'll
  // overwrite the spreadsheet header.
  const NUM_LINK_ADDS = 50; // The number of companies for which to add a link. It's OK to set this to generate links for a number of 
  // companies greater than the number of companies which exist in the spreadsheet (the code will just stop itself after running out 
  // of companies to generate links for). To save time while testing addLinks(), make this a low number.
  
  // Form Constants
  INTERN_FORM_URL = "https://docs.google.com/forms/d/1VTIxDvYkyS5CwwbdUKkDlT7bQNRRWLRgZoKlPNv93bU/edit?usp=drive_web";

  ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  // Access spreadsheet, then the specific sheet
  var ss = SpreadsheetApp.openByUrl(SPREADSHEET_URL);
  var ws = ss.getSheetByName(SHEET_NAME);
  const SPREADSHEET_ID = ss.getId();

  // Access form
  var FORM = FormApp.openByUrl(INTERN_FORM_URL);

  // Gather all text items from the form (an item refers to question/response field in the form)
  var ITEMS = FORM.getItems(FormApp.ItemType.TEXT); 

  // Obtain Lock (prevents errors occuring from users simeltaneously modifying the spreadsheet)
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);

  // Obtain all values in the spreadsheet
  rangeName = SHEET_NAME + SHEET_DIMENSIONS;
  const values = Sheets.Spreadsheets.Values.get(SPREADSHEET_ID, rangeName).values;

  // Get the data headers in the sheet
  var rowTitles = values[0];

  // Loop through NUM_LINK_ADDS rows within the value array, starting at START_ROW
  // Generate the editLink for the form (submit the form with prefilled data from the spreadsheet,
  // then grab the link to edit the submission). Add the editLink to the spreadsheet
  for (var count = START_ROW - 1; count < NUM_LINK_ADDS + START_ROW - 1 && count < values.length; count++) {
    var editLink = getEditLink(values[count], FORM, ITEMS, PREFILL_TITLES, rowTitles);
    updateCell(ws, count + 1, URL_COL, editLink);
  }

  lock.releaseLock();
}


/*
For a given company row containing company data and an initial google form URL, 
getEditLinks actually submits the form, then returns the edit URL obtained afterwards
*/

function getEditLink(row, FORM, ITEMS, prefillTitles, rowTitles) {

  // Each index in rowTitles corresponds the same index in row (the meta-data in rowTitles describes the type
  // of data present in row). However, only some of that data is desired to be prefilled. Thus, for each 
  // index in rowTitles that exists in prefilled_titles (the data to be prefilled), the corresponding row data
  // is mapped to the prefill_title in a map.
  var sheetMap = new Map();
  var j = 0;
  for (var i = 0; i < rowTitles.length; i++) {
    if (prefillTitles[j] === rowTitles[i]) {
      sheetMap.set(prefillTitles[j], row[i]);
      j++;
    }
  }

// itemMap is meant to map the row contents to their corresponding items in the google form. This
// is done by matching the item title with the titles in prefillTitles in the loop below. The matched
// items and row contents are stored in a hash map, where the item is the key and the corresponding
// piece of data from the spreadsheet row is the value.
  var itemMap = new Map();

  // Loop through ITEMS
  for (var i = 0; i < prefillTitles.length; i++) {
    if (contains(sheetMap.keys(), ITEMS[i].getTitle())) {
      itemMap.set(ITEMS[i], sheetMap.get(ITEMS[i].getTitle()));
    }
  }

  // Create FormResponse object, and add ItemResponse objects to formResponse.
  // Loop through each item that's in itemMap and create a response for that item
  // (remember, itemMap only contains items for which there will be submitted data).
  // The response contains the data that corresponds to each item (the item's value 
  // in itemMap). Each response is then added to the form via the line formResponse.withItemResponse(re).
  var formResponse = FORM.createResponse();
  for (var ITEM of itemMap.keys()) {
    var textItem = ITEM.asTextItem();
    re = textItem.createResponse(itemMap.get(ITEM));
    formResponse.withItemResponse(re);
  }

  // Submit the formResponse, and gather EditResponseUrl from submission
  result = formResponse.submit();
  return result.getEditResponseUrl();

}

// Unused function
function updateRow(ws, rowNumber, row) {
  ws.getRange(rowNumber, 1, 1, row.length).setValues([row]);
}

// Updates a single cell
function updateCell(ws, rowNumber, colNumber, data) {
  ws.getRange(rowNumber, colNumber, 1, 1).setValues([[data]]);
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
