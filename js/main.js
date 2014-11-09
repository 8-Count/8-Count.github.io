/********************************************/
/*THE CODE EXECUTED AT LOADING OF INDEX PAGE*/
/********************************************/

$(document).ready(function() {
    updateTimeElapsed();
    setInterval(updateTimeElapsed, 999);
    setConnectionStatus("not connected");
    bluetoothle.initialize(initializeSuccess, initializeError);
});