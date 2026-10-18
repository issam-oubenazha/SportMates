
import {
  TabList,
  TabListProps,
  Tabs,
  TabSlot,
  TabTrigger,
  TabTriggerSlotProps,
} from 'expo-router/ui';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

function TabButton({
  children,
  isFocused,
  ...props
}: TabTriggerSlotProps) {
  return (
    <Pressable
      {...props}
      style={styles.tabButton}
      accessibilityRole="button"
      accessibilityState={{ selected: isFocused }}
    >
      <Text style={[styles.tabText, isFocused && styles.activeText]}>
        {children}
      </Text>
    </Pressable>
  );
}

function CustomTabList(props: TabListProps) {
  return <View {...props} style={styles.tabBar} />;
}

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={styles.tabContent} />

      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="home" href="/" asChild>
            <TabButton>🏠 Accueil</TabButton>
          </TabTrigger>

          <TabTrigger name="explore" href="/explore" asChild>
            <TabButton>🔎 Explorer</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabContent: {
    flex: 1,
  },
  tabBar: {
    position: 'absolute',
    bottom: 18,
    left: 16,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingVertical: 12,
    paddingHorizontal: 8,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E7ECE6',
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 14,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#89938B',
  },
  activeText: {
    color: '#20583D',
    fontWeight: '800',
  },
});
