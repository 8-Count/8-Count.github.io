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

function initializeSuccess(obj)
{
  if (obj.status == "enabled")
  {
    var address = window.localStorage.getItem(addressKey);
    if (address == null)
    {
        logData("Bluetooth initialized successfully. Starting scan for BLE devices");
        var paramsObj = {"serviceUuids":[]};
        bluetoothle.startScan(startScanSuccess, startScanError, paramsObj);
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

function initializeError(obj)
{
  logData("Initialize error: " + obj.error + " - " + obj.message);
}

function startScanSuccess(obj)
{
  if (obj.status == "scanResult")
  {
    logData("Stopping scan..");
    bluetoothle.stopScan(stopScanSuccess, stopScanError);
    clearScanTimeout();

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

function startScanError(obj)
{
  logData("Start scan error: " + obj.error + " - " + obj.message);
}

function scanTimeout()
{
  logData("Scanning time out, stopping");
  bluetoothle.stopScan(stopScanSuccess, stopScanError);
}

function clearScanTimeout()
{ 
    logData("Clearing scanning timeout");
  if (scanTimer != null)
  {
    clearTimeout(scanTimer);
  }
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

function stopScanError(obj)
{
  logData("Stop scan error: " + obj.error + " - " + obj.message);
}

function connectDevice(address)
{
  logData("Begining connection to: " + address + " with 5 second timeout");
    var paramsObj = {"address":address};
  bluetoothle.connect(connectSuccess, connectError, paramsObj);
  connectTimer = setTimeout(connectTimeout, 5000);
}

function connectSuccess(obj)
{
  if (obj.status == "connected")
  {
    logData("Connected to : " + obj.name + " - " + obj.address);

    clearConnectTimeout();
    //tempDisconnectDevice();
    //enableHumiditySensorAndRead(); //important
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

function connectError(obj)
{
  logData("Connect error: " + obj.error + " - " + obj.message);
  clearConnectTimeout();
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















function tempDisconnectDevice()
{
  logData("Disconnecting from device to test reconnect");
    bluetoothle.disconnect(tempDisconnectSuccess, tempDisconnectError);
}

function tempDisconnectSuccess(obj)
{
    if (obj.status == "disconnected")
    {
        logData("Temp disconnect device and reconnecting in 1 second. Instantly reconnecting can cause issues");
        setTimeout(reconnect, 1000);
    }
    else if (obj.status == "disconnecting")
    {
        logData("Temp disconnecting device");
    }
    else
  {
    logData("Unexpected temp disconnect status: " + obj.status);
  }
}

function tempDisconnectError(obj)
{
  logData("Temp disconnect error: " + obj.error + " - " + obj.message);
}

function reconnect()
{
  logData("Reconnecting with 5 second timeout");
  bluetoothle.reconnect(reconnectSuccess, reconnectError);
  reconnectTimer = setTimeout(reconnectTimeout, 5000);
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

/*****************/
/** HEART - iOS **/
/*****************/

/**************/
/** SERVICES **/
/**************/

function servicesHeartSuccess(obj)
{
  if (obj.status == "discoveredServices")
  {
    var serviceUuids = obj.serviceUuids;
    for (var i = 0; i < serviceUuids.length; i++)
    {
      var serviceUuid = serviceUuids[i];

      if (serviceUuid == heartRateServiceUuid)
      {
        logData("Finding heart rate characteristics");
        var paramsObj = {"serviceUuid":heartRateServiceUuid, "characteristicUuids":[heartRateMeasurementCharacteristicUuid]};
        bluetoothle.characteristics(characteristicsHeartSuccess, characteristicsHeartError, paramsObj);
        return;
      }
    }
    logData("Error: heart rate service not found");
  }
    else
  {
    logData("Unexpected services heart status: " + obj.status);
  }
  disconnectDevice();
}

function servicesHeartError(obj)
{
  logData("Services heart error: " + obj.error + " - " + obj.message);
  disconnectDevice();
}

/***********/
/** CHARS **/
/***********/

function characteristicsHeartSuccess(obj)
{
  if (obj.status == "discoveredCharacteristics")
  {
    var characteristics = obj.characteristics;
    for (var i = 0; i < characteristics.length; i++)
    {
      logData("Heart characteristics found, now discovering descriptor");
      var characteristicUuid = characteristics[i].characteristicUuid;

      if (characteristicUuid == heartRateMeasurementCharacteristicUuid)
      {
        var paramsObj = {"serviceUuid":heartRateServiceUuid, "characteristicUuid":heartRateMeasurementCharacteristicUuid};
        bluetoothle.descriptors(descriptorsHeartSuccess, descriptorsHeartError, paramsObj);
        return;
      }
    }
    logData("Error: Heart rate measurement characteristic not found.");
  }
    else
  {
    logData("Unexpected characteristics heart status: " + obj.status);
  }
  disconnectDevice();
}

function characteristicsHeartError(obj)
{
  logData("Characteristics heart error: " + obj.error + " - " + obj.message);
  disconnectDevice();
}

/**************/
/** DESCRIPT **/
/**************/

function descriptorsHeartSuccess(obj)
{
  if (obj.status == "discoveredDescriptors")
  {
    logData("Discovered heart descriptors, now discovering battery service");
    var paramsObj = {"serviceUuids":[batteryServiceUuid]};
    bluetoothle.services(servicesBatterySuccess, servicesBatteryError, paramsObj);
  }
    else
  {
    logData("Unexpected descriptors heart status: " + obj.status);
    disconnectDevice();
  }
}

function descriptorsHeartError(obj)
{
  logData("Descriptors heart error: " + obj.error + " - " + obj.message);
  disconnectDevice();
}


/***************************/
/****** BATTERY - iOS ******/
/***************************/

/**************/
/** SERVICES **/
/**************/

function servicesBatterySuccess(obj)
{
  if (obj.status == "discoveredServices")
  {
    var serviceUuids = obj.serviceUuids;
    for (var i = 0; i < serviceUuids.length; i++)
    {
      var serviceUuid = serviceUuids[i];

      if (serviceUuid == batteryServiceUuid)
      {
        logData("Found battery service, now finding characteristic");
        var paramsObj = {"serviceUuid":batteryServiceUuid, "characteristicUuids":[batteryLevelCharacteristicUuid]};
        bluetoothle.characteristics(characteristicsBatterySuccess, characteristicsBatteryError, paramsObj);
        return;
      }
    }
    logData("Error: battery service not found");
  }
    else
  {
    logData("Unexpected services battery status: " + obj.status);
  }
  disconnectDevice();
}

function servicesBatteryError(obj)
{
  logData("Services battery error: " + obj.error + " - " + obj.message);
  disconnectDevice();
}

/***********/
/** CHARS **/
/***********/

function characteristicsBatterySuccess(obj)
{
  if (obj.status == "discoveredCharacteristics")
  {
    var characteristics = obj.characteristics;
    for (var i = 0; i < characteristics.length; i++)
    {
      var characteristicUuid = characteristics[i].characteristicUuid;

      if (characteristicUuid == batteryLevelCharacteristicUuid)
      {
        readBatteryLevel();
        return;
      }
    }
    logData("Error: Battery characteristic not found.");
  }
    else
  {
    logData("Unexpected characteristics battery status: " + obj.status);
  }
  disconnectDevice();
}

function characteristicsBatteryError(obj)
{
  logData("Characteristics battery error: " + obj.error + " - " + obj.message);
  disconnectDevice();
}

/***********************/
/****** ANDROID ********/
/***********************/

function discoverSuccess(obj)
{
    if (obj.status == "discovered")
    {
        logData("Discovery completed");

    readBatteryLevel();
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
    /*var k = new Uint8Array(1);
    k[0] = 1;*/
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
    var paramsObj = {"serviceUuid": humidityServiceUuid, "characteristicUuid": humidityReadingCharacteristicUuid};
    bluetoothle.read(readHumiditySuccess, readHumidityError, paramsObj);
}

function readHumiditySuccess()
{
    if (obj.status == "read")
    {
        var bytes = bluetoothle.encodedStringToBytes(obj.value);
        logData("Battery level: " + bytes[0]);
        disconnectDevice();
    }
    else
    {
        logData("Unexpected read status: " + obj.status);
        disconnectDevice();
    }
}

function readHumidityError()
{
  logData("Read error: " + obj.error + " - " + obj.message);
  disconnectDevice();
}


function readBatteryLevel()
{
  logData("Reading battery level");
  var paramsObj = {"serviceUuid":batteryServiceUuid, "characteristicUuid":batteryLevelCharacteristicUuid};
  bluetoothle.read(readSuccess, readError, paramsObj);
}

function readSuccess(obj)
{
    if (obj.status == "read")
    {
        var bytes = bluetoothle.encodedStringToBytes(obj.value);
        logData("read humidity: bytes[0]:" + bytes[0]);
        logData("read humidity: bytes:" + bytes);
        disconnectDevice();
        /*
        logData("Subscribing to heart rate for 5 seconds");
        var paramsObj = {"serviceUuid":heartRateServiceUuid, "characteristicUuid":heartRateMeasurementCharacteristicUuid};
        bluetoothle.subscribe(subscribeSuccess, subscribeError, paramsObj);
        setTimeout(unsubscribeDevice, 5000);
        */
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

function subscribeSuccess(obj)
{   
    if (obj.status == "subscribedResult")
    {
        logData("Subscription data received");

        //Parse array of int32 into uint8
        var bytes = bluetoothle.encodedStringToBytes(obj.value);

        //Check for data
        if (bytes.length == 0)
        {
            logData("Subscription result had zero length data");
            return;
        }

        //Get the first byte that contains flags
        var flag = bytes[0];

        //Check if u8 or u16 and get heart rate
        var hr;
        if ((flag & 0x01) == 1)
        {
            var u16bytes = bytes.buffer.slice(1, 3);
            var u16 = new Uint16Array(u16bytes)[0];
            hr = u16;
        }
        else
        {
            var u8bytes = bytes.buffer.slice(1, 2);
            var u8 = new Uint8Array(u8bytes)[0];
            hr = u8;
        }
        logData("Heart Rate: " + hr);
    }
    else if (obj.status == "subscribed")
    {
        logData("Subscription started");
    }
    else
  {
    logData("Unexpected subscribe status: " + obj.status);
    disconnectDevice();
  }
}

function subscribeError(msg)
{
  logData("Subscribe error: " + obj.error + " - " + obj.message);
  disconnectDevice();
}

function unsubscribeDevice()
{
  logData("Unsubscribing heart service");
  var paramsObj = {"serviceUuid":heartRateServiceUuid, "characteristicUuid":heartRateMeasurementCharacteristicUuid};
  bluetoothle.unsubscribe(unsubscribeSuccess, unsubscribeError, paramsObj);
}

function unsubscribeSuccess(obj)
{
    if (obj.status == "unsubscribed")
    {
        logData("Unsubscribed device");

        logData("Reading client configuration descriptor");
        var paramsObj = {"serviceUuid":heartRateServiceUuid, "characteristicUuid":heartRateMeasurementCharacteristicUuid, "descriptorUuid":clientCharacteristicConfigDescriptorUuid};
        bluetoothle.readDescriptor(readDescriptorSuccess, readDescriptorError, paramsObj);
    }
    else
  {
    logData("Unexpected unsubscribe status: " + obj.status);
    disconnectDevice();
  }
}

function unsubscribeError(obj)
{
  logData("Unsubscribe error: " + obj.error + " - " + obj.message);
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