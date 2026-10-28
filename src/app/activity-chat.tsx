
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

import { useAuth } from '../contexts/auth-context';
import { supabase } from '../lib/supabase';

type ChatMessage = {
  id: string;
  activity_id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

export default function ActivityChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    activityId?: string;
    title?: string;
  }>();

  const activityId = Array.isArray(params.activityId)
    ? params.activityId[0]
    : params.activityId;

  const activityTitle = Array.isArray(params.title)
    ? params.title[0]
    : params.title;

  const { session } = useAuth();
  const userId = session?.user.id;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const listRef = useRef<FlatList<ChatMessage>>(null);

  const addMessage = useCallback((message: ChatMessage) => {
    setMessages((current) => {
      if (current.some((item) => item.id === message.id)) {
        return current;
      }

      return [...current, message].sort(
        (a, b) =>
          new Date(a.created_at).getTime() -
          new Date(b.created_at).getTime()
      );
    });
  }, []);

  useEffect(() => {
    if (!activityId || !userId) {
      setLoading(false);
      setErrorMessage(
        !activityId
          ? 'Identifiant de l’activité manquant.'
          : 'Connectez-vous pour accéder au chat.'
      );
      return;
    }

    let active = true;

    const loadMessages = async () => {
      setLoading(true);
      setErrorMessage('');

      const { data, error } = await supabase
        .from('activity_messages')
        .select('id, activity_id, sender_id, content, created_at')
        .eq('activity_id', activityId)
        .order('created_at', { ascending: true });

      if (!active) return;

      if (error) {
        setErrorMessage(
          'Impossible de charger les messages. Vérifiez les policies RLS de Supabase.'
        );
      } else {
        setMessages((data ?? []) as ChatMessage[]);
      }

      setLoading(false);
    };

    void loadMessages();

    const channel = supabase
      .channel(`activity-chat-${activityId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_messages',
          filter: `activity_id=eq.${activityId}`,
        },
        (payload) => {
          if (active) {
            addMessage(payload.new as ChatMessage);
          }
        }
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [activityId, userId, addMessage]);

  const sendMessage = async () => {
    const content = messageText.trim();

    if (!content || !activityId || !userId || sending) return;

    setSending(true);
    setErrorMessage('');

    const { data, error } = await supabase
      .from('activity_messages')
      .insert({
        activity_id: activityId,
        sender_id: userId,
        content,
      })
      .select('id, activity_id, sender_id, content, created_at')
      .single();

    if (error) {
      console.error('SEND ACTIVITY MESSAGE ERROR:', error);
      setErrorMessage(
        'Message non envoyé. Vérifiez que vous êtes participant de cette activité et que les policies RLS sont correctes.'
      );
    } else if (data) {
      addMessage(data as ChatMessage);
      setMessageText('');
    }

    setSending(false);
  };

  useEffect(() => {
    if (messages.length > 0) {
      listRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages.length]);

  const formatTime = (value: string) =>
    new Date(value).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backText}>‹ Retour</Text>
        </Pressable>

        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Chat de l’activité</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {activityTitle || 'SportMates'}
          </Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#20583D"
          style={styles.loader}
        />
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() =>
            listRef.current?.scrollToEnd({ animated: true })
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>💬</Text>
              <Text style={styles.emptyTitle}>
                Début de la conversation
              </Text>
              <Text style={styles.emptyText}>
                Envoyez le premier message aux participants de cette activité.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isMine = item.sender_id === userId;

            return (
              <View
                style={[
                  styles.messageRow,
                  isMine && styles.myMessageRow,
                ]}
              >
                <View
                  style={[
                    styles.bubble,
                    isMine ? styles.myBubble : styles.otherBubble,
                  ]}
                >
                  {!isMine && (
                    <Text style={styles.senderLabel}>Participant</Text>
                  )}
                  <Text
                    style={[
                      styles.messageContent,
                      isMine && styles.myMessageContent,
                    ]}
                  >
                    {item.content}
                  </Text>
                  <Text
                    style={[
                      styles.messageTime,
                      isMine && styles.myMessageTime,
                    ]}
                  >
                    {formatTime(item.created_at)}
                  </Text>
                </View>
              </View>
            );
          }}
        />
      )}

      {errorMessage ? (
        <Text style={styles.errorText}>{errorMessage}</Text>
      ) : null}

      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          placeholder="Écrire un message..."
          placeholderTextColor="#879087"
          value={messageText}
          onChangeText={setMessageText}
          multiline
          maxLength={2000}
          editable={!sending && !!userId && !!activityId}
        />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Envoyer le message"
          style={[
            styles.sendButton,
            (!messageText.trim() || sending) && styles.sendButtonDisabled,
          ]}
          onPress={() => void sendMessage()}
          disabled={!messageText.trim() || sending || !userId || !activityId}
        >
          {sending ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.sendButtonText}>➤</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8F4',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 55,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E9EDE7',
    gap: 12,
  },
  backButton: {
    paddingVertical: 8,
    paddingRight: 4,
  },
  backText: {
    color: '#20583D',
    fontWeight: '800',
    fontSize: 14,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    color: '#183C2B',
    fontSize: 18,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: '#788078',
    fontSize: 12,
    marginTop: 4,
  },
  loader: {
    marginTop: 35,
  },
  messageList: {
    padding: 16,
    paddingBottom: 24,
    flexGrow: 1,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    marginTop: 70,
  },
  emptyEmoji: {
    fontSize: 38,
    marginBottom: 12,
  },
  emptyTitle: {
    color: '#183C2B',
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyText: {
    color: '#788078',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,
  },
  messageRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 12,
  },
  myMessageRow: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '84%',
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 16,
  },
  otherBubble: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E9EDE7',
    borderBottomLeftRadius: 4,
  },
  myBubble: {
    backgroundColor: '#20583D',
    borderBottomRightRadius: 4,
  },
  senderLabel: {
    color: '#20583D',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 4,
  },
  messageContent: {
    color: '#24392B',
    fontSize: 14,
    lineHeight: 20,
  },
  myMessageContent: {
    color: '#FFFFFF',
  },
  messageTime: {
    color: '#89938B',
    fontSize: 10,
    textAlign: 'right',
    marginTop: 5,
  },
  myMessageTime: {
    color: '#D7E8DC',
  },
  errorText: {
    color: '#B42318',
    fontSize: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E9EDE7',
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: '#F1F3EF',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 11,
    color: '#24392B',
    fontSize: 14,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#20583D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
});
