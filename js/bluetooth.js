var addressKey = "address";

var humidityServiceUuid = "f000aa20-0451-4000-b000-000000000000";
var humidityReadingCharacteristicUuid = "f000aa21-0451-4000-b000-000000000000";
var humidityEnablingCharacteristicUuid = "f000aa22-0451-4000-b000-000000000000";

var scanTimer = null;
var connectTimer = null;
var reconnectTimer = null;

/** PLATFORMS **/
var Device_iPad = "iPad";
var Device_iPhone = "iPhone";
var Device_Android = "Android";

var scanIteration = -1;
var RESCAN_SLEEP_DURATION = 2000; /* wait 2 seconds */
var MAX_RESCAN_ITERATIONS = 5;

function logData(message)
{
    document.getElementById("connection_log").innerHTML = 
        message + "<br />" + document.getElementById("connection_log").innerHTML;
}

function scanForDevices()
{
    scanIteration++;
    
    if (scanIteration < MAX_RESCAN_ITERATIONS)
    {
        logData("Starting scan for BLE devices: Iteration '" + scanIteration + "'");
        var paramsObj = {"serviceUuids":[]};
        bluetoothle.startScan(startScanSuccess, startScanError, paramsObj);
    }
    else
    {
        logData("Reached maximum rescan iterations. BLE shutting down");
    }
}

function rescanForDevices()
{
    logData("Operation complete. Sleeping for '" + RESCAN_SLEEP_DURATION + "' ms");
    window.setTimeout(scanForDevices(), RESCAN_SLEEP_DURATION);
}

/*------------------*/
/*    INITIALIZE    */
/*------------------*/

function initializeError(obj)
{
    logData("Initialize error: " + obj.error + " - " + obj.message);
}

function initializeSuccess(obj)
{
    if (obj.status == "enabled")
    {
        var address = window.localStorage.getItem(addressKey);
        if (address == null)
        {
            logData("Bluetooth initialized successfully");
            scanForDevices();
        }
        else
        {
            connectDevice(address);
        }   
    }
    else
    {
        logData("Unexpected initialize status: " + obj.status);
    }
}


/*------------------*/
/*    START SCAN    */
/*------------------*/

function startScanError(obj)
{
    logData("Start scan error: " + obj.error + " - " + obj.message);
    rescanForDevices();
}

function startScanSuccess(obj)
{
    if (obj.status == "scanResult")
    {
        logData("Stopping scan..");
        bluetoothle.stopScan(stopScanSuccess, stopScanError);
        
        logData("Clearing scanning timeout");
        if (scanTimer != null)
        {
            clearTimeout(scanTimer);
        }

        window.localStorage.setItem(addressKey, obj.address);
        connectDevice(obj.address);
    }
    else if (obj.status == "scanStarted")
    {
        logData("Scan started successfully, stopping in 10s");
        scanTimer = setTimeout(scanTimeout, 10000);
    }
    else
    {
        logData("Unexpected start scan status: " + obj.status);
        rescanForDevices();
    }
}

function scanTimeout()
{
    logData("Scanning time out, stopping");
    bluetoothle.stopScan(stopScanSuccess, stopScanError);
}

function connectDevice(address)
{
    logData("Begining connection to: " + address + " with 5 second timeout");
    var paramsObj = {"address":address};
    bluetoothle.connect(connectSuccess, connectError, paramsObj);
    connectTimer = setTimeout(connectTimeout, 5000);
}

function connectTimeout()
{
    logData("Connection timed out");
    rescanForDevices();
}


/*-----------------*/
/*    STOP SCAN    */
/*-----------------*/

function stopScanError(obj)
{
    logData("Stop scan error: " + obj.error + " - " + obj.message);
    rescanForDevices();
}

function stopScanSuccess(obj)
{
    if (obj.status == "scanStopped")
    {
        logData("Scan was stopped successfully");
    }
    else
    {
        logData("Unexpected stop scan status: " + obj.status);
    }
}


/*---------------*/
/*    CONNECT    */
/*---------------*/

function connectError(obj)
{
    logData("Connect error: " + obj.error + " - " + obj.message);
    clearConnectTimeout();
    rescanForDevices();
}

function connectSuccess(obj)
{
    if (obj.status == "connecting")
    {
        logData("Connecting to : " + obj.name + " - " + obj.address);
    }
    else 
    {
        logData("Clearing connect timeout");
        if (connectTimer != null)
        {
            clearTimeout(connectTimer);
        }
        
        if (obj.status == "connected")
        {
            logData("Connected to : " + obj.name + " - " + obj.address);
            exploreService();
        }
        else
        {
            logData("Unexpected connect status: " + obj.status);
            rescanForDevices();
        }
    }
}

function exploreService()
{
    var deviceType = (navigator.userAgent.match(/iPad/i))  == "iPad" ? Device_iPad 
        : (navigator.userAgent.match(/iPhone/i))  == "iPhone" ? Device_iPhone 
        : (navigator.userAgent.match(/Android/i)) == "Android" ? Device_Android 
        : "null";
    
    logData("This device = " + deviceType);
    if (deviceType == Device_iPhone || 
        deviceType == Device_iPad
       )
    {
        logData("iOS services discovering - attempting");
        var paramsObj = {"serviceUuids":[]};
        bluetoothle.services(servicesSuccess, servicesError, paramsObj);
    }
    else if (deviceType == Device_Android)
    {
        logData("Android services discovering - attempting");
        bluetoothle.discover(discoverSuccess, discoverError);
    }
}


/*----------------------*/
/*    SERVICES (iOS)    */
/*----------------------*/

function servicesError(obj)
{
    logData("Services discovery failure: " + obj.error + " - " + obj.message);
    disconnectDevice();
    rescanForDevices();
}

function servicesSuccess(obj)
{
    logData("iOS services discovering - success");
    if (obj.status == "discoveredServices")
    {
        var serviceUuids = obj.serviceUuids;
        for (var i = 0; i < serviceUuids.length; i++)
        {
            var serviceUuid = serviceUuids[i];

            logData("Service " + i + ": UUID = " + serviceUuid);
      
            if (serviceUuid == humidityServiceUuid)
            {
                logData("Device has desired service: " + serviceUuid);
                var paramsObj = {"serviceUuid":serviceUuid, "characteristicUuids":[]};
                bluetoothle.characteristics(characteristicsSuccess, characteristicsError, paramsObj);
                return;
            }
        }
        
        logData("Error: humidity service not found");
        disconnectDevice();
        rescanForDevices();
    }
    else
    {
        logData("Unexpected services status: " + obj.status);
    }
    disconnectDevice();
    rescanForDevices();
}


/*-----------------------------*/
/*    CHARACTERISTICS (iOS)    */
/*-----------------------------*/

function characteristicsError(obj)
{
    logData("Characteristics discovery error: " + obj.error + " - " + obj.message);
    disconnectDevice();
    rescanForDevices();
}

function characteristicsSuccess(obj)
{
    if (obj.status == "discoveredCharacteristics")
    {
        var characteristics = obj.characteristics;
        for (var i = 0; i < characteristics.length; i++)
        {
            var characteristicUuid = characteristics[i].characteristicUuid;

            //logData("Characteristic " + i + ": UUID = " + characteristicUuid);
        
            if (characteristicUuid == humidityEnablingCharacteristicUuid)
            {
                logData("Service has desired characteristic: " + characteristicUuid);
                enableHumiditySensorAndRead();
                return;
            }
        }
        logData("Error: humidity measurement characteristic not found.");
    }
    else
    {
        logData("Unexpected characteristics status: " + obj.status);
    }
    disconnectDevice();
    rescanForDevices();
}


/*--------------------------*/
/*    DISCOVER (Android)    */
/*--------------------------*/

function discoverError(obj)
{
    logData("Discover error: " + obj.error + " - " + obj.message);
    disconnectDevice();
    rescanForDevices();
}

function discoverSuccess(obj)
{
    if (obj.status == "discovered")
    {
        logData("Discovery completed");
        //@TODO ANDROID STUFF
    }
    else
    {
        logData("Unexpected discover status: " + obj.status);
        disconnectDevice();
        rescanForDevices();
    }
}

/*********************/
/** ENABLE HUMIDITY **/
/*********************/

function enableHumiditySensorAndRead()
{
    logData("Enabling humidity sensor");
    var paramsObj = {"value":bluetoothle.bytesToEncodedString([0x01]), "serviceUuid":humidityServiceUuid, "characteristicUuid":humidityEnablingCharacteristicUuid};
    bluetoothle.write(writeSuccess, writeError, paramsObj);
}


/*-------------*/
/*    WRITE    */
/*-------------*/

function writeError(obj)
{
    logData("Write error: " + obj.error + " - " + obj.message);
    disconnectDevice();
    rescanForDevices();
}

function writeSuccess(obj)
{
    if (obj.status == "written")
    {
        logData("Write successful");
        
        logData("Reading humidity");
        var paramsObj = {"serviceUuid":humidityServiceUuid, "characteristicUuid":humidityReadingCharacteristicUuid};
        bluetoothle.read(readSuccess, readError, paramsObj);
    }
    else 
    {
        logData("Unexpected read status: " + obj.status);
        disconnectDevice();
        rescanForDevices();
    }
}


/*------------*/
/*    READ    */
/*------------*/

function readError(obj)
{
    logData("Read error: " + obj.error + " - " + obj.message);
    disconnectDevice();
    rescanForDevices();
}

function readSuccess(obj)
{
    if (obj.status == "read")
    {
        var bytes = bluetoothle.encodedStringToBytes(obj.value);
        logData("read humidity: bytes[0]:" + bytes[0]);
    }
    else
    {
        logData("Unexpected read status: " + obj.status);
    }
    disconnectDevice();
    rescanForDevices();
}

function disconnectDevice()
{
    bluetoothle.disconnect(disconnectSuccess, disconnectError);
}


/*------------------*/
/*    DISCONNECT    */
/*------------------*/

function disconnectError(obj)
{
    logData("Disconnect error: " + obj.error + " - " + obj.message);
    rescanForDevices();
}

function disconnectSuccess(obj)
{
    if (obj.status == "disconnected")
    {
        logData("Disconnect device");
        bluetoothle.close(closeSuccess, closeError);
    }
    else if (obj.status == "disconnecting")
    {
        logData("Disconnecting device");
    }
    else
    {
        logData("Unexpected disconnect status: " + obj.status);
        rescanForDevices();
    }
}


/*-------------*/
/*    CLOSE    */
/*-------------*/

function closeError(obj)
{
    logData("Close error: " + obj.error + " - " + obj.message);
    rescanForDevices();
}

function closeSuccess(obj)
{
    if (obj.status == "closed")
    {
        logData("Closed device");
    }
    else
    {
        logData("Unexpected close status: " + obj.status);
    }
    rescanForDevices();
}