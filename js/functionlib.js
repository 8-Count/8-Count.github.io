var impactHistoryStorageKey = "impactHistoryData";
var buttonStage = 0;
var dateTimeStartedListening;

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
    var stringToDisplay = "";
    
    if (connection_timer.visibility == "visible") {
        stringToDisplay = getTimeToDislay(dateTimeStartedListening);
    }
    
    connection_timer.innerHTML = stringToDisplay;
}

/**
 * Returns the string representation of the time
 * difference between the current date and the input
 * parameter.
 **/
function getTimeToDislay(myDate) {
    date_future = new Date();
    date_now = myDate;

    seconds = Math.floor((date_future - (date_now))/1000);
    minutes = Math.floor(seconds/60);
    hours = Math.floor(minutes/60);
    days = Math.floor(hours/24);

    hours = hours-(days*24);
    minutes = minutes-(days*24*60)-(hours*60);
    seconds = seconds-(days*24*60*60)-(hours*60*60)-(minutes*60);

    return hours + ":" + minutes + ":" + seconds;
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

function setConnectionStatus(status) {
    var connectionIcon;
    var connectionStatus;
    
    if (status === "connected") {
        connection_timer.visibility = "visible";
        dateTimeStartedListening = new Date();
        updateTimeElapsed();
        connectionIcon = "fa fa-pause fa-5x";
        connectionStatus = "Listening for dangerous impacts...";
        alert("Phone connected with device.");
    }
    else {
        connection_timer.visibility = "hidden";
        updateTimeElapsed();
        if (status === "not connected") {
            connectionIcon = "fa fa-play fa-5x";
            connectionStatus = "Connect to device";
        }
        else if (status === "connecting") {
            connectionIcon = "fa fa-refresh fa-spin fa-5x";
            connectionStatus = "Connecting...";
        }
        else {
            connectionIcon = "fa fa-exclamation-circle fa-5x";
            connectionStatus = "Conection failed. Tap to reconnect";
            alert("Phone disconnected from device.");
        }
    }
    
    connection_icon.className = connectionIcon;
    connection_status.innerHTML = connectionStatus;
}

function connectButtonClicked() {
    buttonStage++;
    
    if (buttonStage % 3 == 0) {
        setConnectionStatus("not connected");   
    }
    else if (buttonStage % 3 == 1) {
        setConnectionStatus("connecting");
    }
    else {
        setConnectionStatus("connected");
    }
}

function backButtonClicked() {
    window.location.href = "index.html";
}

function todayClicked() {
    window.location.href = "historypage.html";
}

function weekClicked() {
    window.location.href = "historypage.html";
}

function allTimeClicked() {
    window.location.href = "historypage.html";
}