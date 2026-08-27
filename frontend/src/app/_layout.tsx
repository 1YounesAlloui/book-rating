import "../global.css";
import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#0066cc',
        tabBarInactiveTintColor: '#8e8e93',
        tabBarStyle: { height: 60, paddingBottom: 8, paddingTop: 8 },
        headerStyle: { backgroundColor: '#ffffff' },
        headerTitleStyle: { fontWeight: 'bold', color: '#1c1c1e' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerTitle: 'Discover Books',
          tabBarIcon: ({ focused }) => <Text style={{ fontSize: 18 }}>{focused ? '🏠' : '🏚️'}</Text>,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          headerTitle: 'Search Catalog',
          tabBarIcon: () => <Text style={{ fontSize: 18 }}>🔍</Text>,
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'My Shelf',
          headerTitle: 'Saved Books',
          tabBarIcon: () => <Text style={{ fontSize: 18 }}>📚</Text>,
        }}
      />
    </Tabs>
  );
}