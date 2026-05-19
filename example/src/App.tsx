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

const DEBUG_LOG_LEVEL = 1;

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

function formatError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null) {
    const maybeCode = 'code' in error ? String(error.code) : null;
    const maybeMessage =
      'message' in error && typeof error.message === 'string'
        ? error.message
        : null;

    if (maybeCode && maybeMessage) {
      return `[${maybeCode}] ${maybeMessage}`;
    }

    if (maybeMessage) {
      return maybeMessage;
    }
  }

  if (typeof error === 'string' && error.length > 0) {
    return error;
  }

  return 'Unknown native failure';
}

function formatNativeTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString();
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

  const refreshStatus = useCallback(
    async (shouldLog: boolean) => {
      const nextStatus = await BackgroundGeolocation.checkStatus();
      setStatus(nextStatus);
      setIsRunning(nextStatus.isRunning);

      if (shouldLog) {
        addLog(
          `Status: running=${nextStatus.isRunning}, locationServices=${nextStatus.locationServicesEnabled}, auth=${nextStatus.authorization}`
        );
      }

      return nextStatus;
    },
    [addLog]
  );

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      const granted = await requestLocationPermissions();
      if (!isMounted) {
        return;
      }

      setPermissionGranted(granted);
      addLog(granted ? 'Permissions granted' : 'Permissions denied');

      try {
        const entries = await BackgroundGeolocation.getLogEntries(
          50,
          0,
          DEBUG_LOG_LEVEL
        );

        if (isMounted && entries.length > 0) {
          setLogs(
            entries.map(
              (entry) =>
                `[${formatNativeTimestamp(entry.timestamp)}] ${entry.level}: ${entry.message}`
            )
          );
        }
      } catch (error) {
        if (isMounted) {
          addLog(`Log restore error: ${formatError(error)}`);
        }
      }

      try {
        const nextStatus = await refreshStatus(false);
        if (isMounted && nextStatus.isRunning) {
          addLog('Tracking already running');
        }
      } catch (error) {
        if (isMounted) {
          addLog(`Status restore error: ${formatError(error)}`);
        }
      }
    };

    bootstrap();

    return () => {
      isMounted = false;
    };
  }, [addLog, refreshStatus]);

  useEffect(() => {
    const removeLocationListener = BackgroundGeolocation.onLocation(
      (location: Location) => {
        setCurrentLocation(location);
        addLog(
          `Location: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)} (acc: ${location.accuracy.toFixed(1)}m)`
        );
      }
    );

    const removeErrorListener = BackgroundGeolocation.onError((error) => {
      addLog(`Error [${error.code}]: ${error.message}`);
    });

    const removeStartListener = BackgroundGeolocation.onStart(() => {
      setIsRunning(true);
      addLog('Tracking started');
    });

    const removeStopListener = BackgroundGeolocation.onStop(() => {
      setIsRunning(false);
      addLog('Tracking stopped');
    });

    return () => {
      removeLocationListener();
      removeErrorListener();
      removeStartListener();
      removeStopListener();
    };
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
        stopOnTerminate: false,
        notificationsEnabled: true,
        notificationTitle: 'BG Geolocation',
        notificationText: 'Tracking location in background',
      });
      addLog('Configured successfully');
    } catch (err) {
      addLog(`Configure error: ${formatError(err)}`);
    }
  }, [addLog]);

  const handleStart = useCallback(async () => {
    try {
      const nextStatus = await refreshStatus(false);
      if (nextStatus.isRunning) {
        addLog('Tracking already running');
        return;
      }

      await BackgroundGeolocation.start();
    } catch (err) {
      addLog(`Start error: ${formatError(err)}`);
    }
  }, [addLog, refreshStatus]);

  const handleStop = useCallback(async () => {
    try {
      await BackgroundGeolocation.stop();
      setIsRunning(false);
      await refreshStatus(false);
    } catch (err) {
      addLog(`Stop error: ${formatError(err)}`);
    }
  }, [addLog, refreshStatus]);

  const handleCheckStatus = useCallback(async () => {
    try {
      await refreshStatus(true);
    } catch (err) {
      addLog(`Status error: ${formatError(err)}`);
    }
  }, [addLog, refreshStatus]);

  const handleGetStoredLocations = useCallback(async () => {
    try {
      const all = await BackgroundGeolocation.getLocations();
      const valid = await BackgroundGeolocation.getValidLocations();
      addLog(`Stored: ${all.length} total, ${valid.length} pending sync`);

      const recent = all.slice(-5).reverse();
      for (const loc of recent) {
        addLog(
          `  DB: ${loc.latitude.toFixed(6)}, ${loc.longitude.toFixed(6)} @ ${formatNativeTimestamp(loc.time)}`
        );
      }
    } catch (err) {
      addLog(`Stored locations error: ${formatError(err)}`);
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
      addLog(`GetCurrentLocation error: ${formatError(err)}`);
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

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, styles.locButton]}
          onPress={handleGetStoredLocations}
        >
          <Text style={styles.buttonText}>Stored Locations</Text>
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
