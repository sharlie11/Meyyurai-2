import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  TextInput,
} from 'react-native';
import { Colors } from '../theme/colors';
import { Header } from '../components/Header';
import { PhoneCall, MapPin, Shield, Search, Clock, ExternalLink } from 'lucide-react-native';
import { HELPLINES, HELP_CENTERS } from '../lib/resources-data';

export const ResourcesScreen = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const handleCall = (number: string) => {
    Linking.openURL(`tel:${number}`);
  };

  const filteredHelplines = HELPLINES.filter((h) => {
    const matchesCategory = selectedCategory === 'all' || h.category === selectedCategory;
    const matchesSearch =
      h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.number.includes(searchQuery);
    return matchesCategory && matchesSearch;
  });

  return (
    <View style={styles.container}>
      <Header title="Resources & Helplines" subtitle="24x7 Government & Emergency Helplines" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* SEARCH BAR */}
        <View style={styles.searchContainer}>
          <Search size={18} color={Colors.textMuted} style={{ marginRight: 10 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search helpline or emergency service..."
            placeholderTextColor={Colors.textDim}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* CATEGORY FILTERS */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          {['all', 'national', 'women', 'cyber', 'child', 'senior', 'legal'].map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.filterChip, selectedCategory === cat && styles.filterChipActive]}
              onPress={() => setSelectedCategory(cat)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterText,
                  selectedCategory === cat && styles.filterTextActive,
                ]}
              >
                {cat.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* DIRECT HELPLINES LIST */}
        <Text style={styles.sectionTitle}>DIRECT TOLL-FREE HELPLINES</Text>
        {filteredHelplines.map((h) => (
          <View key={h.id} style={styles.helplineCard}>
            <View style={styles.cardMain}>
              <View style={styles.badgeRow}>
                <View style={styles.catBadge}>
                  <Text style={styles.catBadgeText}>{h.category.toUpperCase()}</Text>
                </View>
                <View style={styles.hoursRow}>
                  <Clock size={12} color={Colors.textMuted} />
                  <Text style={styles.hoursText}>{h.availableHours}</Text>
                </View>
              </View>

              <Text style={styles.helplineName}>{h.name}</Text>
              <Text style={styles.helplineDesc}>{h.description}</Text>
            </View>

            <TouchableOpacity
              style={styles.callButton}
              onPress={() => handleCall(h.number)}
              activeOpacity={0.8}
            >
              <PhoneCall size={18} color="#FFFFFF" />
              <Text style={styles.callButtonText}>CALL {h.number}</Text>
            </TouchableOpacity>
          </View>
        ))}

        {/* NEARBY GOVERNMENT HELP CENTERS */}
        <Text style={styles.sectionTitle}>GOVERNMENT & POLICE HELP CENTERS</Text>
        {HELP_CENTERS.map((center, index) => (
          <View key={index} style={styles.centerCard}>
            <View style={styles.centerHeader}>
              <MapPin size={20} color={Colors.accentGold} />
              <View style={{ marginLeft: 10, flex: 1 }}>
                <Text style={styles.centerName}>{center.name}</Text>
                <Text style={styles.centerType}>{center.type}</Text>
              </View>
            </View>

            <Text style={styles.centerAddress}>{center.address}</Text>

            <TouchableOpacity
              style={styles.centerCallButton}
              onPress={() => handleCall(center.phone)}
              activeOpacity={0.7}
            >
              <PhoneCall size={14} color={Colors.primaryLight} />
              <Text style={styles.centerCallText}>{center.phone}</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 90,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 14,
  },
  filterRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.card,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primaryLight,
  },
  filterText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  helplineCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardMain: {
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  catBadge: {
    backgroundColor: Colors.inputBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  catBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primaryLight,
  },
  hoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hoursText: {
    fontSize: 11,
    color: Colors.textMuted,
    marginLeft: 4,
  },
  helplineName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  helplineDesc: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 4,
    lineHeight: 18,
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
  },
  callButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  centerCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  centerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  centerName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  centerType: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  centerAddress: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 10,
  },
  centerCallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  centerCallText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primaryLight,
    marginLeft: 6,
  },
});
