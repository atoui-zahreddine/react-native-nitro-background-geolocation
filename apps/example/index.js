// Import order matters: headless registration must run before the router
// entry, and ES imports hoist — so both must be imports, in this order.
import './src/registerHeadless';
import 'expo-router/entry';
