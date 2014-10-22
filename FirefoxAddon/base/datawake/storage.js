exports.getDatawakeInfo = getDatawakeInfo;
exports.setDatawakeInfo = setDatawakeInfo;
exports.deleteDatawakeInfo = deleteDatawakeInfo;
exports.hasDatawakeInfoForTab = hasDatawakeInfoForTab;

var datawakeInfoStorage = {};

/**
 * Function for getting the datawake information associated with a tab.
 * @param tabId The tab's Id
 * @returns {*} Datawake Info Object.
 */
function getDatawakeInfo(tabId) {
    if (hasDatawakeInfoForTab(tabId))
        return datawakeInfoStorage[tabId];
    return null;
}

/**
 * Sets the Datawake info for a specific tab.
 * @param tabId The tab's Id to associate the data with.
 * @param datawakeInfo The data to set.
 */
function setDatawakeInfo(tabId, datawakeInfo) {
    deleteDatawakeInfo(tabId);
    datawakeInfoStorage[tabId] = datawakeInfo;
}

/**
 * Destroys the data associated with a tabId.
 * @param tabId The tab id's data to destory.
 */
function deleteDatawakeInfo(tabId) {
    if (hasDatawakeInfoForTab(tabId))
        delete datawakeInfoStorage[tabId];
}

/**
 * Checks to see if a tab has data associated with it.
 * @param tabId The tab id to check.
 * @returns {boolean} True if it has data in storage.
 */
function hasDatawakeInfoForTab(tabId){
    return datawakeInfoStorage.hasOwnProperty(tabId);
}