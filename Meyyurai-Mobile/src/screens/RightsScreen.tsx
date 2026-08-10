import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Colors } from '../theme/colors';
import { Header } from '../components/Header';
import {
  Search,
  BookOpen,
  Shield,
  Briefcase,
  ShoppingBag,
  Smartphone,
  Home as HomeIcon,
  Heart,
  Users,
  Scale,
  X,
  CheckCircle,
} from 'lucide-react-native';
import { RIGHTS_CATEGORIES, RIGHTS_DATA, CategoryRightsDetail } from '../lib/rights-data';
import { useI18n } from '../lib/i18n';

export const RightsScreen = () => {
  const { t } = useI18n();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDetail, setSelectedDetail] = useState<CategoryRightsDetail | null>(null);

  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'shield':
        return <Shield size={22} color={Colors.accentGold} />;
      case 'briefcase':
        return <Briefcase size={22} color={Colors.primaryLight} />;
      case 'shopping-bag':
        return <ShoppingBag size={22} color="#F97316" />;
      case 'smartphone':
        return <Smartphone size={22} color="#38BDF8" />;
      case 'home':
        return <HomeIcon size={22} color="#A7F3D0" />;
      case 'heart':
        return <Heart size={22} color="#F472B6" />;
      case 'users':
        return <Users size={22} color="#FBBF24" />;
      default:
        return <Scale size={22} color={Colors.primaryLight} />;
    }
  };

  const filteredCategories = RIGHTS_CATEGORIES.filter((cat) =>
    cat.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openCategoryModal = (catId: string) => {
    const detail = RIGHTS_DATA[catId] || RIGHTS_DATA['women'];
    setSelectedDetail(detail);
  };

  return (
    <View style={styles.container}>
      <Header title="Rights & Education" subtitle="Plain-language legal laws & protections" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* SEARCH BAR */}
        <View style={styles.searchContainer}>
          <Search size={18} color={Colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('rights.search')}
            placeholderTextColor={Colors.textDim}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* CATEGORY GRID */}
        <Text style={styles.sectionTitle}>LEGAL CATEGORIES</Text>
        <View style={styles.grid}>
          {filteredCategories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={styles.card}
              onPress={() => openCategoryModal(cat.id)}
              activeOpacity={0.7}
            >
              <View style={styles.cardHeader}>
                <View style={styles.iconBg}>{getCategoryIcon(cat.icon)}</View>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{cat.badge}</Text>
                </View>
              </View>
              <Text style={styles.cardTitle}>{cat.title}</Text>
              <Text style={styles.cardSub}>Laws, procedures & complaint steps</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* DETAIL MODAL */}
      {selectedDetail && (
        <Modal animationType="slide" transparent={false} visible={!!selectedDetail}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>{selectedDetail.title}</Text>
                <Text style={styles.modalSub}>{selectedDetail.subtitle}</Text>
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setSelectedDetail(null)}
              >
                <X size={20} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll}>
              <View style={styles.sectionCard}>
                <Text style={styles.modalSectionTitle}>OVERVIEW</Text>
                <Text style={styles.modalText}>{selectedDetail.overview}</Text>
              </View>

              {/* LAWS SECTION */}
              <Text style={styles.modalSectionTitle}>RELEVANT LAWS & SECTIONS</Text>
              {selectedDetail.laws.map((law, index) => (
                <View key={index} style={styles.lawCard}>
                  <Text style={styles.actName}>{law.actName}</Text>
                  <Text style={styles.sectionName}>{law.section}</Text>
                  <Text style={styles.lawDesc}>{law.description}</Text>

                  {law.punishment && (
                    <View style={styles.punishmentBox}>
                      <Text style={styles.punishmentTitle}>PUNISHMENT / PENALTY:</Text>
                      <Text style={styles.punishmentText}>{law.punishment}</Text>
                    </View>
                  )}
                </View>
              ))}

              {/* COMPLAINT STEPS */}
              <Text style={styles.modalSectionTitle}>HOW TO FILE A COMPLAINT</Text>
              {selectedDetail.complaintSteps.map((step, idx) => (
                <View key={idx} style={styles.stepRow}>
                  <CheckCircle size={18} color={Colors.primaryLight} style={{ marginTop: 2 }} />
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </Modal>
      )}
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
    paddingBottom: 40,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  iconBg: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    backgroundColor: Colors.cardHover,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  cardSub: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.backgroundSecondary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  modalSub: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  modalScroll: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.accentGold,
    letterSpacing: 1,
    marginBottom: 10,
  },
  modalText: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textPrimary,
  },
  lawCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actName: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primaryLight,
  },
  sectionName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginVertical: 4,
  },
  lawDesc: {
    fontSize: 13,
    color: Colors.textMuted,
    lineHeight: 18,
  },
  punishmentBox: {
    marginTop: 10,
    backgroundColor: Colors.inputBg,
    borderRadius: 8,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: Colors.sosRed,
  },
  punishmentTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.sosRed,
  },
  punishmentText: {
    fontSize: 12,
    color: Colors.textPrimary,
    marginTop: 2,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.card,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  stepText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textPrimary,
    marginLeft: 10,
    lineHeight: 18,
  },
});
