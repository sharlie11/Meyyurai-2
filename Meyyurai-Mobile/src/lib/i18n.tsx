import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Lang = 'en' | 'ta' | 'hi' | 'te' | 'kn' | 'ml';

export const LANGUAGES: { code: Lang; label: string; native: string }[] = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు' },
  { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'ml', label: 'Malayalam', native: 'മലയാളം' },
];

type Dict = Record<string, string>;

const translations: Record<Lang, Dict> = {
  en: {
    'app.tagline': 'Safety, Rights & Guidance',
    'auth.welcome': 'Welcome to Meyyurai',
    'auth.subtitle': 'Your trusted companion for safety, rights and guidance.',
    'auth.email': 'Email address',
    'auth.password': 'Password',
    'auth.fullName': 'Full name',
    'auth.signIn': 'Sign in',
    'auth.signUp': 'Create account',
    'auth.or': 'or',
    'auth.haveAccount': 'Already have an account? Sign in',
    'auth.noAccount': 'New here? Create an account',
    'auth.forgot': 'Forgot password?',
    'auth.terms': 'By continuing you agree to our terms and privacy policy.',
    'ai.placeholder': 'Ask your legal right or safety query...',
    'nav.emergency': 'Emergency',
    'nav.ai': 'AI Guidance',
    'nav.rights': 'Rights',
    'nav.resources': 'Helplines',
    'nav.profile': 'Profile',
    'onboarding.title': 'Set up your profile',
    'onboarding.subtitle': 'We use this to help faster in an emergency.',
    'onboarding.fullName': 'Full name',
    'onboarding.phone': 'Phone number',
    'onboarding.emergency': 'Emergency contact number',
    'onboarding.guardian': 'Parent/Guardian contact',
    'onboarding.language': 'Preferred language',
    'profile.section.you': 'YOU',
    'profile.section.language': 'LANGUAGE',
    'profile.section.contacts': 'EMERGENCY CONTACTS',
    'profile.section.permissions': 'PERMISSIONS',
    'profile.section.account': 'ACCOUNT & SECURITY',
    'profile.subtitle.tap': 'Tap to complete your profile',
    'profile.preferredLang': 'Preferred language',
    'profile.noContacts': 'No emergency contacts added yet.',
    'profile.add': '+ Add Contact',
    'profile.logout': 'Sign out',
    'common.cancel': 'Cancel',
    'common.save': 'Save',
    'common.delete': 'Delete',
    'rights.eyebrow': 'Know your rights',
    'rights.title': 'Rights & Education',
    'rights.description': 'Plain-language explanations, laws, authorities and how to act.',
    'rights.search': 'Search legal rights or laws...',
  },
  ta: {
    'app.tagline': 'பாதுகாப்பு, உரிமைகள் & வழிகாட்டுதல்',
    'auth.welcome': 'மெய்யுரைக்கு வரவேற்கிறோம்',
    'auth.subtitle': 'உங்கள் பாதுகாப்பு மற்றும் உரிமைகளுக்கான நம்பகமான துணை.',
    'auth.email': 'மின்னஞ்சல் முகவரி',
    'auth.password': 'கடவுச்சொல்',
    'auth.fullName': 'முழு பெயர்',
    'auth.signIn': 'உள்நுழைய',
    'auth.signUp': 'கணக்கை உருவாக்கு',
    'auth.or': 'அல்லது',
    'auth.haveAccount': 'ஏற்கனவே கணக்கு உள்ளதா? உள்நுழைய',
    'auth.noAccount': 'புதிய பயனரா? கணக்கை உருவாக்கு',
    'auth.forgot': 'கடவுச்சொல் மறந்துவிட்டதா?',
    'auth.terms': 'தொடர்வதன் மூலம் எங்கள் விதிமுறைகளை ஏற்கிறீர்கள்.',
    'ai.placeholder': 'உங்கள் சட்ட உரிமை அல்லது கேள்வியைக் கேட்கவும்...',
    'nav.emergency': 'அவசரம்',
    'nav.ai': 'AI உதவி',
    'nav.rights': 'உரிமைகள்',
    'nav.resources': 'உதவி எண்கள்',
    'nav.profile': 'சுயவிவரம்',
    'profile.logout': 'வெளியேறு',
    'common.cancel': 'ரத்து',
    'common.save': 'சேமி',
    'common.delete': 'நீக்கு',
    'rights.eyebrow': 'உங்கள் உரிமைகளை அறியுங்கள்',
    'rights.title': 'உரிமைகள் மற்றும் கல்வி',
    'rights.description': 'எளிய மொழியில் சட்ட விளக்கங்கள் மற்றும் முறைகள்.',
    'rights.search': 'சட்ட உரிமைகளைத் தேடுக...',
  },
  hi: {
    'app.tagline': 'सुरक्षा, अधिकार और मार्गदर्शन',
    'auth.welcome': 'मेय्युराई में आपका स्वागत है',
    'auth.subtitle': 'सुरक्षा और अधिकारों के लिए आपका भरोसेमंद साथी।',
    'auth.email': 'ईमेल',
    'auth.password': 'पासवर्ड',
    'auth.fullName': 'पूरा नाम',
    'auth.signIn': 'साइन इन',
    'auth.signUp': 'खाता बनाएँ',
    'nav.emergency': 'आपातकाल',
    'nav.ai': 'AI मार्गदर्शन',
    'nav.rights': 'अधिकार',
    'nav.resources': 'हेल्पलाइन',
    'nav.profile': 'प्रोफ़ाइल',
    'profile.logout': 'साइन आउट',
    'common.cancel': 'रद्द',
    'common.save': 'सहेजें',
    'common.delete': 'हटाएँ',
    'rights.title': 'अधिकार और शिक्षा',
    'rights.search': 'कानूनी अधिकार खोजें...',
  },
  te: {
    'app.tagline': 'భద్రత, హక్కులు & మార్గదర్శనం',
    'auth.welcome': 'మెయ్యురైకి స్వాగతం',
    'auth.email': 'ఇమెయిల్',
    'auth.password': 'పాస్‌వర్డ్',
    'auth.signIn': 'సైన్ ఇన్',
    'auth.signUp': 'ఖాతా సృష్టించండి',
    'nav.emergency': 'అత్యవసరం',
    'nav.ai': 'AI సలహా',
    'nav.rights': 'హక్కులు',
    'nav.resources': 'హెల్ప్‌లైన్స్',
    'nav.profile': 'ప్రొఫైల్',
    'profile.logout': 'సైన్ అవుట్',
    'common.cancel': 'రద్దు',
    'common.save': 'సేవ్',
  },
  kn: {
    'app.tagline': 'ಸುರಕ್ಷತೆ, ಹಕ್ಕುಗಳು & ಮಾರ್ಗದರ್ಶನ',
    'auth.welcome': 'ಮೆಯ್ಯುರೈಗೆ ಸ್ವಾಗತ',
    'auth.email': 'ಇಮೇಲ್',
    'auth.password': 'ಪಾಸ್‌ವರ್ಡ್',
    'auth.signIn': 'ಸೈನ್ ಇನ್',
    'auth.signUp': 'ಖಾತೆ ರಚಿಸಿ',
    'nav.emergency': 'ತುರ್ತು',
    'nav.ai': 'AI ಮಾರ್ಗದರ್ಶನ',
    'nav.rights': 'ಹಕ್ಕುಗಳು',
    'nav.resources': 'ಸಹಾಯವಾಣಿ',
    'nav.profile': 'ಪ್ರೊಫೈಲ್',
    'profile.logout': 'ಸೈನ್ ಔಟ್',
    'common.cancel': 'ರದ್ದು',
    'common.save': 'ಉಳಿಸಿ',
  },
  ml: {
    'app.tagline': 'സുരക്ഷ, അവകാശങ്ങൾ & മാർഗ്ഗനിർദ്ദേശം',
    'auth.welcome': 'മെയ്യുരൈയിലേക്ക് സ്വാഗതം',
    'auth.email': 'ഇമെയിൽ',
    'auth.password': 'പാസ്‌വേഡ്',
    'auth.signIn': 'സൈൻ ഇൻ',
    'auth.signUp': 'അക്കൗണ്ട് സൃഷ്ടിക്കുക',
    'nav.emergency': 'അടിയന്തരം',
    'nav.ai': 'AI സഹായം',
    'nav.rights': 'അവകാശങ്ങൾ',
    'nav.resources': 'ഹെൽപ്പ്‌ലൈനുകൾ',
    'nav.profile': 'പ്രൊഫൈൽ',
    'profile.logout': 'സൈൻ ഔട്ട്',
    'common.cancel': 'റദ്ദാക്കുക',
    'common.save': 'സംരക്ഷിക്കുക',
  },
};

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (key: string) => string };
const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en');

  useEffect(() => {
    AsyncStorage.getItem('meyyurai.lang').then((stored) => {
      if (stored && stored in translations) {
        setLangState(stored as Lang);
      }
    });
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    AsyncStorage.setItem('meyyurai.lang', l);
  };

  const t = (key: string) => translations[lang]?.[key] ?? translations.en[key] ?? key;

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider');
  return ctx;
}
