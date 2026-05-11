import { useEffect, useState, useCallback } from 'react';
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  PermissionsAndroid,
  Alert,
} from 'react-native';
import BackgroundGeolocation, {
  LocationProvider,
  LocationAccuracy,
  type Location,
  type ServiceStatus,
} from 'react-native-nitro-background-geolocation';

type AndroidPermission =
  (typeof PermissionsAndroid.PERMISSIONS)[keyof typeof PermissionsAndroid.PERMISSIONS];

async function requestLocationPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }

  try {
    const permissions: AndroidPermission[] = [
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    ];

    if (Platform.Version >= 29) {
      permissions.push(PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION);
    }

    if (Platform.Version >= 33) {
      permissions.push(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    }

    const results = await PermissionsAndroid.requestMultiple(permissions);
    const requiredPermissions = [
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    ];

    const missingPermissions = requiredPermissions.filter(
      (permission) => results[permission] !== PermissionsAndroid.RESULTS.GRANTED
    );

    if (missingPermissions.length > 0) {
      Alert.alert('Permission denied', 'Fine location permission is required.');
      return false;
    }

    return true;
  } catch (err) {
    console.warn('Permission request error:', err);
    return false;
  }
}

export default function App() {
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [status, setStatus] = useState<ServiceStatus | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${timestamp}] ${message}`, ...prev].slice(0, 50));
  }, []);

  useEffect(() => {
    requestLocationPermissions().then((granted) => {
      setPermissionGranted(granted);
      addLog(granted ? 'Permissions granted' : 'Permissions denied');
    });
  }, [addLog]);

  const handleConfigure = useCallback(async () => {
    try {
      await BackgroundGeolocation.configure({
        locationProvider: LocationProvider.DISTANCE_FILTER,
        desiredAccuracy: LocationAccuracy.HIGH,
        distanceFilter: 50,
        debug: true,
        interval: 10000,
        fastestInterval: 5000,
        notificationsEnabled: true,
        notificationTitle: 'BG Geolocation',
        notificationText: 'Tracking location in background',
      });
      addLog('Configured successfully');
    } catch (err) {
      addLog(`Configure error: ${err}`);
    }
  }, [addLog]);

  const handleStart = useCallback(async () => {
    try {
      // Set up location listener before starting
      BackgroundGeolocation.onLocation((location: Location) => {
        setCurrentLocation(location);
        addLog(
          `Location: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)} (acc: ${location.accuracy.toFixed(1)}m)`
        );
      });

      BackgroundGeolocation.onError((error) => {
        addLog(`Error [${error.code}]: ${error.message}`);
      });

      await BackgroundGeolocation.start();
      setIsRunning(true);
      addLog('Tracking started');
    } catch (err) {
      addLog(`Start error: ${err}`);
    }
  }, [addLog]);

  const handleStop = useCallback(async () => {
    try {
      await BackgroundGeolocation.stop();
      BackgroundGeolocation.removeAllListeners();
      setIsRunning(false);
      addLog('Tracking stopped');
    } catch (err) {
      addLog(`Stop error: ${err}`);
    }
  }, [addLog]);

  const handleCheckStatus = useCallback(async () => {
    try {
      const s = await BackgroundGeolocation.checkStatus();
      setStatus(s);
      addLog(
        `Status: running=${s.isRunning}, locationServices=${s.locationServicesEnabled}, auth=${s.authorization}`
      );
    } catch (err) {
      addLog(`Status error: ${err}`);
    }
  }, [addLog]);

  const handleGetCurrentLocation = useCallback(async () => {
    try {
      const loc = await BackgroundGeolocation.getCurrentLocation({
        timeout: 15000,
        maximumAge: 10000,
        enableHighAccuracy: true,
      });
      setCurrentLocation(loc);
      addLog(
        `Current: ${loc.latitude.toFixed(6)}, ${loc.longitude.toFixed(6)} (acc: ${loc.accuracy.toFixed(1)}m)`
      );
    } catch (err) {
      addLog(`GetCurrentLocation error: ${err}`);
    }
  }, [addLog]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Background Geolocation Test</Text>

      <View style={styles.statusBar}>
        <Text style={styles.statusText}>
          Permissions: {permissionGranted ? 'Granted' : 'Denied'}
        </Text>
        <Text style={styles.statusText}>
          Tracking: {isRunning ? 'Running' : 'Stopped'}
        </Text>
      </View>

      {currentLocation && (
        <View style={styles.locationBox}>
          <Text style={styles.locationTitle}>Last Location</Text>
          <Text style={styles.locationText}>
            Lat: {currentLocation.latitude.toFixed(6)}
          </Text>
          <Text style={styles.locationText}>
            Lng: {currentLocation.longitude.toFixed(6)}
          </Text>
          <Text style={styles.locationText}>
            Accuracy: {currentLocation.accuracy.toFixed(1)}m
          </Text>
          <Text style={styles.locationText}>
            Speed: {currentLocation.speed.toFixed(1)} m/s
          </Text>
          <Text style={styles.locationText}>
            Altitude: {currentLocation.altitude.toFixed(1)}m
          </Text>
          <Text style={styles.locationText}>
            Altitude Accuracy: {currentLocation.altitudeAccuracy.toFixed(1)}m
          </Text>
        </View>
      )}

      {status && (
        <View style={styles.statusBox}>
          <Text style={styles.locationTitle}>Service Status</Text>
          <Text style={styles.locationText}>
            Running: {status.isRunning ? 'Yes' : 'No'}
          </Text>
          <Text style={styles.locationText}>
            Location Services: {status.locationServicesEnabled ? 'On' : 'Off'}
          </Text>
          <Text style={styles.locationText}>
            Authorization: {status.authorization}
          </Text>
        </View>
      )}

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, styles.configButton]}
          onPress={handleConfigure}
        >
          <Text style={styles.buttonText}>Configure</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.statusButton]}
          onPress={handleCheckStatus}
        >
          <Text style={styles.buttonText}>Check Status</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[
            styles.button,
            isRunning ? styles.stopButton : styles.startButton,
          ]}
          onPress={isRunning ? handleStop : handleStart}
        >
          <Text style={styles.buttonText}>
            {isRunning ? 'Stop Tracking' : 'Start Tracking'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.locButton]}
          onPress={handleGetCurrentLocation}
        >
          <Text style={styles.buttonText}>Get Location</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, styles.configButton]}
          onPress={() => {
            BackgroundGeolocation.showAppSettings();
            addLog('Opened app settings');
          }}
        >
          <Text style={styles.buttonText}>App Settings</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.statusButton]}
          onPress={() => {
            BackgroundGeolocation.showLocationSettings();
            addLog('Opened location settings');
          }}
        >
          <Text style={styles.buttonText}>Location Settings</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.logTitle}>Logs</Text>
      <ScrollView style={styles.logContainer}>
        {logs.map((log, i) => (
          <Text key={i} style={styles.logText}>
            {log}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
    paddingHorizontal: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
    color: '#333',
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#555',
  },
  locationBox: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  statusBox: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: '#333',
  },
  locationText: {
    fontSize: 13,
    color: '#555',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  button: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  configButton: {
    backgroundColor: '#6366f1',
  },
  statusButton: {
    backgroundColor: '#8b5cf6',
  },
  startButton: {
    backgroundColor: '#22c55e',
  },
  stopButton: {
    backgroundColor: '#ef4444',
  },
  locButton: {
    backgroundColor: '#3b82f6',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  logTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
    color: '#333',
  },
  logContainer: {
    flex: 1,
    backgroundColor: '#1e1e1e',
    borderRadius: 8,
    padding: 8,
    marginBottom: 16,
  },
  logText: {
    fontSize: 12,
    color: '#a3e635',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 2,
  },
});
