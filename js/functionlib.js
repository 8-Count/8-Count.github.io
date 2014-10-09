var impactHistoryStorageKey = "impactHistoryData";

/**
 * The function called first when a new impact occurs.
 * Logs the impact (for viewing in the 'history' page), 
 * and displays immediately on index page.
 **/
function impactOccurred(rawData) {
    recordImpact(getPercentConcussion(rawData)); 
    updateTimeElapsed(); // updates the time immediately (for UX purposes)
    updateRiskMeter(); // updates the risk meter immediately (for UX purposes)
}

/**
 * Calculates and returns the chance of a concussion.
 * Uses the rawData received from MG1.
 * 
 * @TODO: Implement.
 **/
function getPercentConcussion(rawData) {
    return rawData;
}

/**
 * Record the impact so that the history page can fetch the data later.
 **/
function recordImpact(percentConcussion) {
    var impactHistory = getImpactHistory();
    impactHistory.push(
        { 
            percentConcussion: percentConcussion,
            date: new Date() // record the current time.
        });
    
    setImpactHistory(impactHistory);
}

/**
 * Fetches all recorded impact data from storage.
 * Used by 'history' page.
 **/
function getImpactHistory() {
    var impactHistoryJSON = localStorage.getItem(impactHistoryStorageKey);
    if (impactHistoryJSON === null) {
        return [];   
    }
    
    return JSON.parse(impactHistoryJSON);
}

/**
 * Sets the impact history.
 **/
function setImpactHistory(history) {
    localStorage.setItem(impactHistoryStorageKey, JSON.stringify(history)); 
}

/**
 * Update the "time since last impact occurred" textblock on index.html.
 **/
function updateTimeElapsed() {
    var lastImpact = getLastImpact();
    
    if (lastImpact !== null) {
        var timeElapsedInSeconds = Math.floor((new Date() - Date.parse(lastImpact.date)) / 1000);
        ticker.innerHTML = "Last impact was " + timeElapsedInSeconds + " seconds ago";    
    } 
    else {
        ticker.innerHTML = "No impact has occurred";
    }
}

/**
 * Update the UI to show the latest impact on the concussion risk meter on index.html.
 **/
function updateRiskMeter() {
    var lastImpact = getLastImpact();
    
    var percentConcussion = (lastImpact !== null) 
        ? lastImpact.percentConcussion
        : 0;
    
    $('.riskMeter').delay(800).ClassyLoader({
        percentage: percentConcussion,
        fontFamily: "Segoe UI",
        speed: 10,
        width: 200,
        height: 200,
        fontSize: '3.9em',
        animate: true,
        diameter: 70,
        fontColor: 'rgba(51,51,51,1)',
        lineColor: 'rgba(51,51,51,1)',
        remainingLineColor: 'rgba(0,0,0,0.2)',
        lineWidth: 22
    });
}

/**
 * Returns the last impact that occurred.
 * If no impact occurred, this returns null.
 **/
function getLastImpact() {
    var impactHistory = getImpactHistory();
    
    if (impactHistory.length === 0) {
        return null;
    }
    
    return impactHistory[impactHistory.length - 1];
}

/**
 * Resets the history of impacts.
 * For use in testing.
 */
function resetImpactHistory() {
    setImpactHistory([]);
    updateTimeElapsed();
    updateRiskMeter();
}

/**
 * The event handler for when the 'delete last impact'
 * button is pressed.
 * This removes the most recent impact and refreshes
 * the GUI.
 * This can be called multiple times in a row.
 */
function deleteLastImpactButtonClick() {
    var impactHistory = getImpactHistory();
    impactHistory.pop();
    setImpactHistory(impactHistory);
    updateTimeElapsed();
    updateRiskMeter();
}

/**
 * The event handler for when the 'view impact history'
 * button is pressed.
 * This navigates to the impact history page.
 */
function viewImpactHistoryButtonClick() {
    window.location.href = "historypage.html";
}