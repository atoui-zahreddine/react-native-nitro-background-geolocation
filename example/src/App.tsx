import { Text, View, StyleSheet } from 'react-native';

// TODO: Task 9 will update the example app with geolocation usage

export default function App() {
  return (
    <View style={styles.container}>
      <Text>Background Geolocation Example</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
