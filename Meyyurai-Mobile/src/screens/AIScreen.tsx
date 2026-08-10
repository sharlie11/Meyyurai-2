import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Colors } from '../theme/colors';
import { Header } from '../components/Header';
import { Send, Bot, User, Sparkles, Scale, AlertCircle } from 'lucide-react-native';
import { sendLegalAIQuery, QUICK_LEGAL_PROMPTS, ChatMessage } from '../lib/ai-provider';
import { useI18n } from '../lib/i18n';

export const AIScreen = () => {
  const { t, lang } = useI18n();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'ai',
      text: 'Hello! I am **Meyyurai AI Legal Assistant**. Ask me any question regarding your statutory rights, banking fraud reporting, salary protection, domestic violence, or tenant laws in India.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || inputText;
    if (!query.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputText('');
    setLoading(true);

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      const aiResponse = await sendLegalAIQuery(query, lang);
      setMessages((prev) => [...prev, aiResponse]);
    } catch (e) {
      const errorMsg: ChatMessage = {
        id: Date.now().toString(),
        sender: 'ai',
        text: 'Sorry, I encountered an issue retrieving legal advice. Please check your network connection or try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Header title="Meyyurai AI" subtitle="Plain-language Legal Assistance" />

      {/* CHAT MESSAGES */}
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.chatContainer}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((msg) => (
          <View
            key={msg.id}
            style={[
              styles.messageBubble,
              msg.sender === 'user' ? styles.userBubble : styles.aiBubble,
            ]}
          >
            <View style={styles.senderHeader}>
              <View style={msg.sender === 'user' ? styles.userIconBg : styles.aiIconBg}>
                {msg.sender === 'user' ? (
                  <User size={14} color="#FFFFFF" />
                ) : (
                  <Bot size={14} color={Colors.accentGold} />
                )}
              </View>
              <Text style={styles.senderName}>{msg.sender === 'user' ? 'You' : 'Meyyurai AI'}</Text>
              <Text style={styles.timestamp}>{msg.timestamp}</Text>
            </View>

            <Text style={styles.messageText}>{msg.text}</Text>

            {/* LAWS REFERENCED */}
            {msg.lawsReferenced && msg.lawsReferenced.length > 0 && (
              <View style={styles.lawsBox}>
                <View style={styles.lawsHeader}>
                  <Scale size={14} color={Colors.primaryLight} />
                  <Text style={styles.lawsTitle}>LAWS & SECTIONS CITED:</Text>
                </View>
                {msg.lawsReferenced.map((law, i) => (
                  <Text key={i} style={styles.lawItem}>
                    • {law}
                  </Text>
                ))}
              </View>
            )}

            {/* ACTION STEPS */}
            {msg.steps && msg.steps.length > 0 && (
              <View style={styles.stepsBox}>
                <Text style={styles.stepsTitle}>RECOMMENDED ACTION STEPS:</Text>
                {msg.steps.map((step, idx) => (
                  <Text key={idx} style={styles.stepItem}>
                    {idx + 1}. {step}
                  </Text>
                ))}
              </View>
            )}
          </View>
        ))}

        {loading && (
          <View style={styles.loadingBubble}>
            <ActivityIndicator size="small" color={Colors.primaryLight} />
            <Text style={styles.loadingText}>Analyzing legal sections & guidance...</Text>
          </View>
        )}
      </ScrollView>

      {/* QUICK SUGGESTIONS CHIPS */}
      <View style={styles.suggestionsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {QUICK_LEGAL_PROMPTS.map((prompt, index) => (
            <TouchableOpacity
              key={index}
              style={styles.promptChip}
              onPress={() => handleSend(prompt)}
              activeOpacity={0.7}
            >
              <Sparkles size={12} color={Colors.accentGold} style={{ marginRight: 6 }} />
              <Text style={styles.promptChipText}>{prompt}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* DISCLAIMER */}
      <View style={styles.disclaimerRow}>
        <AlertCircle size={12} color={Colors.textMuted} />
        <Text style={styles.disclaimerText}>
          AI guidance is for informational education and not a substitute for formal legal representation.
        </Text>
      </View>

      {/* INPUT BAR */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder={t('ai.placeholder')}
          placeholderTextColor={Colors.textDim}
          value={inputText}
          onChangeText={setInputText}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
          onPress={() => handleSend()}
          disabled={!inputText.trim() || loading}
          activeOpacity={0.8}
        >
          <Send size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  chatContainer: {
    padding: 16,
    paddingBottom: 20,
  },
  messageBubble: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    maxWidth: '90%',
  },
  userBubble: {
    backgroundColor: Colors.cardHover,
    alignSelf: 'flex-end',
    borderWidth: 1,
    borderColor: Colors.primaryDark,
  },
  aiBubble: {
    backgroundColor: Colors.card,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  senderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  userIconBg: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  aiIconBg: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  timestamp: {
    fontSize: 10,
    color: Colors.textMuted,
    marginLeft: 'auto',
  },
  messageText: {
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  lawsBox: {
    marginTop: 10,
    backgroundColor: Colors.inputBg,
    borderRadius: 8,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primaryLight,
  },
  lawsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  lawsTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primaryLight,
    marginLeft: 6,
  },
  lawItem: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  stepsBox: {
    marginTop: 10,
    backgroundColor: Colors.cardHover,
    borderRadius: 8,
    padding: 10,
  },
  stepsTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.accentGold,
    marginBottom: 6,
  },
  stepItem: {
    fontSize: 12,
    color: Colors.textPrimary,
    marginTop: 3,
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 12,
    alignSelf: 'flex-start',
    marginBottom: 14,
  },
  loadingText: {
    fontSize: 12,
    color: Colors.textMuted,
    marginLeft: 10,
  },
  suggestionsContainer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  promptChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  promptChipText: {
    fontSize: 12,
    color: Colors.textPrimary,
  },
  disclaimerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  disclaimerText: {
    fontSize: 10,
    color: Colors.textMuted,
    marginLeft: 6,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: Colors.backgroundSecondary,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.inputBg,
    color: Colors.textPrimary,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 80,
    fontSize: 14,
    marginRight: 10,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Colors.cardBorder,
  },
});
