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

var SM = "";

function logData(message)
{
    document.getElementById("connection_log").innerHTML = 
        message + "<br />" + document.getElementById("connection_log").innerHTML;
}

function scanForDevices()
{
    var paramsObj = {"serviceUuids":[]};
    bluetoothle.startScan(startScanSuccess, startScanError, paramsObj);
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
            logData("Bluetooth initialized successfully. Starting scan for BLE devices");
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


/*-----------------*/
/*    STOP SCAN    */
/*-----------------*/

function stopScanError(obj)
{
    logData("Stop scan error: " + obj.error + " - " + obj.message);
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
}

function connectSuccess(obj)
{
    if (obj.status == "connected")
    {
        logData("Connected to : " + obj.name + " - " + obj.address);

        clearConnectTimeout();
        exploreService();
    }
    else if (obj.status == "connecting")
    {
        logData("Connecting to : " + obj.name + " - " + obj.address);
    }
    else
    {
        logData("Unexpected connect status: " + obj.status);
        clearConnectTimeout();
    }
}



function connectTimeout()
{
  logData("Connection timed out");
}

function clearConnectTimeout()
{ 
    logData("Clearing connect timeout");
  if (connectTimer != null)
  {
    clearTimeout(connectTimer);
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
        bluetoothle.services(servicesHumiditySuccess, servicesHumidityError, paramsObj);
    }
    else if (deviceType == Device_Android)
    {
        logData("Android services discovering - attempting");
        bluetoothle.discover(discoverSuccess, discoverError);
    }
}

/******************/
/** CUSTOM - iOS **/
/******************/

/**************/
/** SERVICES **/
/**************/

function servicesHumiditySuccess(obj)
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
        bluetoothle.characteristics(characteristicsHumiditySuccess, characteristicsHumidityError, paramsObj);
        return;
      }
    }
    logData("Error: humidity service not found");
  }
    else
  {
    logData("Unexpected services status: " + obj.status);
  }
  disconnectDevice();
}

function servicesHumidityError(obj)
{
  logData("Services discovery failure: " + obj.error + " - " + obj.message);
  disconnectDevice();
}

/***********/
/** CHARS **/
/***********/

function characteristicsHumiditySuccess(obj)
{
  if (obj.status == "discoveredCharacteristics")
  {
    var characteristics = obj.characteristics;
    for (var i = 0; i < characteristics.length; i++)
    {
      //logData("humidity characteristics found, now discovering descriptor");
      var characteristicUuid = characteristics[i].characteristicUuid;

      logData("Characteristic " + i + ": UUID = " + characteristicUuid);
        
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
}

function characteristicsHumidityError(obj)
{
  logData("Characteristics discovery error: " + obj.error + " - " + obj.message);
  disconnectDevice();
}

function reconnectSuccess(obj)
{
  if (obj.status == "connected")
  {
    logData("Reconnected to : " + obj.name + " - " + obj.address);

    clearReconnectTimeout();

    exploreService();
  }
  else if (obj.status == "connecting")
  {
    logData("Reconnecting to : " + obj.name + " - " + obj.address);
  }
  else
  {
    logData("Unexpected reconnect status: " + obj.status);
    disconnectDevice();
  }
}

function reconnectError(obj)
{
  logData("Reconnect error: " + obj.error + " - " + obj.message);
  disconnectDevice();
}

function reconnectTimeout()
{
  logData("Reconnection timed out");
}

function clearReconnectTimeout()
{ 
    logData("Clearing reconnect timeout");
  if (reconnectTimer != null)
  {
    clearTimeout(reconnectTimer);
  }
}

/***********************/
/****** ANDROID ********/
/***********************/

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
  }
}

function discoverError(obj)
{
  logData("Discover error: " + obj.error + " - " + obj.message);
  disconnectDevice();
}

/*********************/
/** ENABLE HUMIDITY **/
/*********************/

function enableHumiditySensorAndRead()
{
    logData("Enabling humidity sensor");
    var str = bluetoothle.bytesToEncodedString([0x01]);
    logData("str = " + str);
    var paramsObj = {"value":str, "serviceUuid":humidityServiceUuid, "characteristicUuid":humidityEnablingCharacteristicUuid};
    bluetoothle.write(enableHumiditySensorWriteSuccess, enableHumiditySensorWriteError, paramsObj);
}

function enableHumiditySensorWriteSuccess(obj)
{
    if (obj.status == "written")
    {
        logData("Write successful");
        readHumidity();
    }
    else 
    {
        logData("Unexpected read status: " + obj.status);
        disconnectDevice();
    }
}

function enableHumiditySensorWriteError(obj)
{
    logData("Write error: " + obj.error + " - " + obj.message);
    disconnectDevice();
}

/*******************/
/** READ HUMIDITY **/
/*******************/

function readHumidity()
{    
    logData("Reading humidity");
    var paramsObj = {"serviceUuid":humidityServiceUuid, "characteristicUuid":humidityReadingCharacteristicUuid};
    bluetoothle.read(readSuccess, readError, paramsObj);
}

function readSuccess(obj)
{
    if (obj.status == "read")
    {
        var bytes = bluetoothle.encodedStringToBytes(obj.value);
        logData("read humidity: bytes[0]:" + bytes[0]);
        disconnectDevice();
    }
    else
  {
    logData("Unexpected read status: " + obj.status);
    disconnectDevice();
  }
}

function readError(obj)
{
  logData("Read error: " + obj.error + " - " + obj.message);
  disconnectDevice();
}

function readDescriptorSuccess(obj)
{
    if (obj.status == "readDescriptor")
    {
        var bytes = bluetoothle.encodedStringToBytes(obj.value);
        var u16Bytes = new Uint16Array(bytes.buffer);
        logData("Read descriptor value: " + u16Bytes[0]);
        disconnectDevice();
    }
    else
  {
    logData("Unexpected read descriptor status: " + obj.status);
    disconnectDevice();
  }
}

function readDescriptorError(obj)
{
  logData("Read Descriptor error: " + obj.error + " - " + obj.message);
  disconnectDevice();
}

function disconnectDevice()
{
  bluetoothle.disconnect(disconnectSuccess, disconnectError);
}

function disconnectSuccess(obj)
{
    if (obj.status == "disconnected")
    {
        logData("Disconnect device");
        closeDevice();
    }
    else if (obj.status == "disconnecting")
    {
        logData("Disconnecting device");
    }
    else
  {
    logData("Unexpected disconnect status: " + obj.status);
  }
}

function disconnectError(obj)
{
  logData("Disconnect error: " + obj.error + " - " + obj.message);
}

function closeDevice()
{
  bluetoothle.close(closeSuccess, closeError);
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
}

function closeError(obj)
{
  logData("Close error: " + obj.error + " - " + obj.message);
}