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

  // Access spreadsheet, then the specific sheet
  var ss = SpreadsheetApp.openByUrl(UNSCRUBBED_LIST.spreadsheetUrl);
  var ws = ss.getSheetByName(UNSCRUBBED_LIST.sheetName);
  const SPREADSHEET_ID = ss.getId();

  // Access form
  var form = FormApp.openByUrl(FORM.url);

  // Gather all text items from the form (an item refers to question/response field in the form)
  var ITEMS = form.getItems(FormApp.ItemType.TEXT); 

  // Obtain Lock (prevents errors occuring from users simeltaneously modifying the spreadsheet)
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);

  // Obtain all values in the spreadsheet
  const values = ws.getSheetValues(1, 1, UNSCRUBBED_LIST.maxNumRows, UNSCRUBBED_LIST.numColumns);

  // Get the data headers in the sheet
  var rowTitles = values[0];

  // Loop through NUM_LINK_ADDS rows within the value array, starting at UNSCRUBBED_LIST.dataStartRow
  // Generate the editLink for the form (submit the form with prefilled data from the spreadsheet,
  // then grab the link to edit the submission). Add the editLink to the spreadsheet
  for (var count = UNSCRUBBED_LIST.dataStartRow - 1; count < UNSCRUBBED_LIST.NUM_LINK_ADDS + UNSCRUBBED_LIST.dataStartRow - 1 && count < values.length; count++) {
    var editLink = getEditLink(values[count], form, ITEMS, UNSCRUBBED_LIST.PREFILL_TITLES, rowTitles);
    updateCell(ws, count + 1, UNSCRUBBED_LIST.DATA_COLUMNS.companyIdColumn, editLink);
  }

  lock.releaseLock();
}

/*
For a given company row containing company data and an initial google form URL, 
getEditLinks actually submits the form, then returns the edit URL obtained afterwards
*/

function getEditLink(row, form, ITEMS, prefillTitles, rowTitles) {

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
  var formResponse = form.createResponse();
  for (var ITEM of itemMap.keys()) {
    var textItem = ITEM.asTextItem();
    re = textItem.createResponse(itemMap.get(ITEM));
    formResponse.withItemResponse(re);
  }

  // Submit the formResponse, and gather EditResponseUrl from submission
  result = formResponse.submit();
  return result.getEditResponseUrl();

}
