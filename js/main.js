/********************************************/
/*THE CODE EXECUTED AT LOADING OF INDEX PAGE*/
/********************************************/

$(document).ready(function() {
    updateTimeElapsed();
    setInterval(updateTimeElapsed, 999);
    setConnectionStatus("not connected");
    window.setTimeout(bluetoothle.initialize(initializeSuccess, initializeError); 999);
});