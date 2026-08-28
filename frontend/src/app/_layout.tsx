import { View, Platform, ColorValue } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// ─── Design tokens ────────────────────────────────────────────────
const GOLD   = '#c8a96e';
const MUTED  = '#6b6b7a';           // lighter than before for better contrast on floating bar
const BAR_BG = 'rgba(17, 17, 20, 0.92)'; // translucent for modern glass feel
const BORDER = 'rgba(255, 255, 255, 0.08)';
const ICON_ACTIVE_BG = 'rgba(200, 169, 110, 0.15)'; // subtle gold tint for active icon container

type IconName = React.ComponentProps<typeof Ionicons>['name'];

// ─── Tab icon with custom active indicator ────────────────────────
function TabIcon({
  name,
  focused,
  color,
}: {
  name: IconName;
  focused: boolean;
  color: ColorValue;
}) {
  return (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        width: 48,
        height: 40,
        borderRadius: 20,
        backgroundColor: focused ? ICON_ACTIVE_BG : 'transparent',
        // subtle transition
        transform: [{ scale: focused ? 1.05 : 1 }],
      }}
    >
      <Ionicons name={name} size={22} color={color} />
      <View
        style={{
          position: 'absolute',
          bottom: 2,
          width: 5,
          height: 5,
          borderRadius: 2.5,
          backgroundColor: focused ? GOLD : 'transparent',
          // optional glow
          shadowColor: GOLD,
          shadowOpacity: focused ? 0.8 : 0,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 0 },
          elevation: focused ? 3 : 0,
        }}
      />
    </View>
  );
}

// ─── Layout ───────────────────────────────────────────────────────
export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: GOLD,
        tabBarInactiveTintColor: MUTED,
        tabBarShowLabel: false,          // modern icon‑only bar
        tabBarHideOnKeyboard: true,      // better UX

        tabBarStyle: {
          position: 'absolute',          // floating bar
          left: 16,
          right: 16,
          bottom: Platform.OS === 'ios' ? 24 : 16,
          height: 64,
          borderRadius: 24,
          backgroundColor: BAR_BG,
          borderTopWidth: 0,             // remove default top border
          borderWidth: 1,
          borderColor: BORDER,
          paddingHorizontal: 12,
          paddingTop: 6,
          paddingBottom: Platform.OS === 'ios' ? 8 : 6,
          // modern shadow
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.3,
          shadowRadius: 16,
          elevation: 10,
        },

        tabBarItemStyle: {
          borderRadius: 18,
          marginHorizontal: 4,
        },

        // ── Header ──────────────────────────────────────────────
        headerStyle: {
          backgroundColor: '#0d0d10',    // slightly darker than bar for depth
        },
        headerShadowVisible: false,
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 18,
          color: '#f0ede8',
          letterSpacing: 0.4,
        },
        headerTintColor: GOLD,
        headerRight: () => null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerTitle: 'Discover',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon
              name={focused ? 'compass' : 'compass-outline'}
              focused={focused}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="explore"
        options={{
          title: 'Search',
          headerTitle: 'Search',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon
              name={focused ? 'search' : 'search-outline'}
              focused={focused}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="library"
        options={{
          title: 'My Shelf',
          headerTitle: 'My Shelf',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon
              name={focused ? 'library' : 'library-outline'}
              focused={focused}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}