<template>
  <q-page class="chat-page">
    <!-- Header -->
    <div class="chat-header">
      <div class="row items-center no-wrap">
        <q-icon name="support_agent" size="24px" color="primary" class="q-mr-sm" />
        <div>
          <div class="text-weight-bold" style="font-size: 15px">Support</div>
          <div class="text-caption" :class="statusClass">{{ statusText }}</div>
        </div>
        <q-space />
        <q-btn v-if="conversationId && status !== 'CLOSED'" flat dense round icon="close" color="grey-6" @click="endChat" />
      </div>
    </div>

    <!-- No conversation yet - show FAQ + start -->
    <div v-if="!conversationId" class="chat-intro">
      <div class="chat-intro-scroll q-pa-md">
        <div class="text-center q-mb-lg">
          <q-icon name="chat_bubble_outline" size="48px" color="grey-4" />
          <div class="text-h6 text-weight-bold q-mt-sm" style="color: #1A1A2E">How can we help?</div>
          <div class="text-caption text-grey-5">Ask a question or browse common topics below</div>
        </div>

        <!-- FAQ list -->
        <div v-if="faqs.length" class="q-mb-md">
          <div class="text-caption text-weight-bold text-grey-6 text-uppercase q-mb-sm" style="letter-spacing: 0.04em">Common Questions</div>
          <q-card v-for="faq in faqs" :key="faq.id" flat class="faq-card q-mb-xs" clickable @click="startWithQuestion(faq.question)">
            <q-card-section class="q-pa-sm">
              <div class="row items-center no-wrap">
                <q-icon name="help_outline" color="primary" size="18px" class="q-mr-sm" />
                <span style="font-size: 13px">{{ faq.question }}</span>
                <q-space />
                <q-icon name="chevron_right" color="grey-4" size="18px" />
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <!-- Start chat — fixed at bottom -->
      <div class="chat-input-bar">
        <q-input
          v-model="initialMessage"
          outlined
          dense
          placeholder="Type your question..."
          class="chat-input"
          @keyup.enter="startChat"
        >
          <template #append>
            <q-btn round flat icon="send" color="primary" :disable="!initialMessage.trim()" @click="startChat" />
          </template>
        </q-input>
      </div>
    </div>

    <!-- Active conversation -->
    <template v-else>
      <!-- Messages -->
      <div ref="messagesContainer" class="messages-container">
        <div v-for="msg in messages" :key="msg.id" class="message-row" :class="msg.senderType === 'USER' ? 'user' : 'other'">
          <div class="message-bubble" :class="bubbleClass(msg)">
            <div v-if="msg.senderType !== 'USER'" class="message-sender">
              {{ msg.senderType === 'BOT' ? 'ecoLoop Bot' : 'Support Agent' }}
            </div>
            <div class="message-text">{{ msg.content }}</div>
            <div class="message-time">{{ formatTime(msg.createdAt) }}</div>
          </div>
        </div>

        <!-- Typing indicator -->
        <div v-if="botTyping" class="message-row other">
          <div class="message-bubble bot typing">
            <span class="dot"></span><span class="dot"></span><span class="dot"></span>
          </div>
        </div>
      </div>

      <!-- Input -->
      <div class="chat-input-bar">
        <q-input
          v-model="newMessage"
          outlined
          dense
          placeholder="Type a message..."
          class="chat-input"
          :disable="status === 'CLOSED'"
          @keyup.enter="sendMessage"
        >
          <template #append>
            <q-btn round flat icon="send" color="primary" :disable="!newMessage.trim() || status === 'CLOSED'" @click="sendMessage" />
          </template>
        </q-input>
      </div>
    </template>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { io, Socket } from 'socket.io-client';
import { API_URL } from '@/config/api';

interface ChatMessage {
  id: string;
  conversationId: string;
  senderId?: string;
  senderType: 'USER' | 'AGENT' | 'BOT';
  content: string;
  isAutoReply: boolean;
  createdAt: string;
}

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category?: string;
}

const STORAGE_KEY = 'ecoloop_chat_conversation';
const socket = ref<Socket | null>(null);
const conversationId = ref<string | null>(localStorage.getItem(STORAGE_KEY));
const messages = ref<ChatMessage[]>([]);
const faqs = ref<FaqItem[]>([]);
const initialMessage = ref('');
const newMessage = ref('');
const status = ref('');
const botTyping = ref(false);
const messagesContainer = ref<HTMLElement>();

// Persist conversationId
function saveConversation(id: string | null) {
  conversationId.value = id;
  if (id) {
    localStorage.setItem(STORAGE_KEY, id);
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

const statusText = computed(() => {
  if (!conversationId.value) return 'Online';
  if (status.value === 'WITH_AGENT') return 'Connected to agent';
  if (status.value === 'WAITING_AGENT') return 'Waiting for agent...';
  if (status.value === 'CLOSED') return 'Conversation ended';
  return 'Online';
});

const statusClass = computed(() => {
  if (status.value === 'WITH_AGENT') return 'text-positive';
  if (status.value === 'WAITING_AGENT') return 'text-orange';
  if (status.value === 'CLOSED') return 'text-grey-5';
  return 'text-positive';
});

function bubbleClass(msg: ChatMessage) {
  if (msg.senderType === 'USER') return 'user';
  if (msg.senderType === 'BOT') return 'bot';
  return 'agent';
}

onMounted(async () => {
  // Load FAQs
  try {
    const res = await fetch(`${API_URL}/api/v1/chat/faq`);
    faqs.value = await res.json();
  } catch { /* ignore */ }

  // Connect socket
  socket.value = io(`${API_URL}/chat`, { transports: ['websocket', 'polling'] });

  // Resume existing conversation if stored
  const storedId = localStorage.getItem(STORAGE_KEY);
  if (storedId) {
    socket.value.emit('join_conversation', { conversationId: storedId });
  }

  socket.value.on('conversation_started', (data: { conversation: any; message: ChatMessage }) => {
    saveConversation(data.conversation.id);
    status.value = data.conversation.status;
    messages.value = [data.message];
    // Ensure we're in the room
    socket.value?.emit('join_conversation', { conversationId: data.conversation.id });
    scrollToBottom();
  });

  socket.value.on('conversation_loaded', (data: any) => {
    if (data) {
      messages.value = data.messages ?? [];
      status.value = data.status;
      if (data.status === 'CLOSED') {
        // Don't restore closed conversations
        saveConversation(null);
      }
      scrollToBottom();
    }
  });

  socket.value.on('new_message', (msg: ChatMessage) => {
    // Avoid duplicates
    if (!messages.value.find((m) => m.id === msg.id)) {
      botTyping.value = false;
      messages.value.push(msg);
      scrollToBottom();
    }
  });

  socket.value.on('agent_joined', (data: any) => {
    status.value = 'WITH_AGENT';
    // Re-join room to ensure we receive agent messages
    if (conversationId.value) {
      socket.value?.emit('join_conversation', { conversationId: conversationId.value });
    }
  });

  socket.value.on('conversation_closed', () => {
    status.value = 'CLOSED';
    saveConversation(null);
  });
});

onUnmounted(() => {
  socket.value?.disconnect();
});

function getUserData(): Record<string, string | undefined> {
  // Try pinia persisted state
  try {
    const raw = localStorage.getItem('user');
    if (raw) {
      const parsed = JSON.parse(raw);
      const u = parsed?.user ?? parsed;
      if (u?.email) {
        return {
          userId: u.id,
          visitorName: u.name || `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim(),
          visitorEmail: u.email,
        };
      }
    }
  } catch { /* ignore */ }
  return {};
}

function startChat() {
  if (!initialMessage.value.trim() || !socket.value) return;
  const msg = initialMessage.value.trim();
  initialMessage.value = '';

  socket.value.emit('start_conversation', getUserData(), (res: { conversationId: string }) => {
    // After conversation starts, send the initial message
    setTimeout(() => {
      if (socket.value && res.conversationId) {
        botTyping.value = true;
        socket.value.emit('send_message', {
          conversationId: res.conversationId,
          content: msg,
        });
      }
    }, 500);
  });
}

function startWithQuestion(question: string) {
  initialMessage.value = question;
  startChat();
}

function sendMessage() {
  if (!newMessage.value.trim() || !socket.value || !conversationId.value) return;
  const content = newMessage.value.trim();
  newMessage.value = '';
  botTyping.value = true;

  socket.value.emit('send_message', {
    conversationId: conversationId.value,
    content,
  });
}

function endChat() {
  if (socket.value && conversationId.value) {
    socket.value.emit('close_conversation', { conversationId: conversationId.value });
  }
  saveConversation(null);
  messages.value = [];
  status.value = '';
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

async function scrollToBottom() {
  await nextTick();
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
}

watch(messages, () => scrollToBottom(), { deep: true });
</script>

<style lang="scss" scoped>
.chat-page {
  background: #F8FAFB;
  display: flex;
  flex-direction: column;
  height: calc(100vh - 100px);
}

.chat-header {
  background: #fff;
  padding: 12px 16px;
  border-bottom: 1px solid #E5E7EB;
}

.chat-intro {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-intro-scroll {
  flex: 1;
  overflow-y: auto;
}

.faq-card {
  background: #fff;
  border: 1px solid #E5E7EB;
  border-radius: 10px;
  transition: all 0.15s;
  cursor: pointer;
  &:hover { border-color: #00897B; background: #F0FDFA; }
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.message-row {
  display: flex;
  &.user { justify-content: flex-end; }
  &.other { justify-content: flex-start; }
}

.message-bubble {
  max-width: 80%;
  padding: 10px 14px;
  border-radius: 16px;
  font-size: 14px;
  line-height: 1.4;

  &.user {
    background: #00897B;
    color: #fff;
    border-bottom-right-radius: 4px;
  }

  &.bot {
    background: #fff;
    border: 1px solid #E5E7EB;
    color: #1A1A2E;
    border-bottom-left-radius: 4px;
  }

  &.agent {
    background: #EDE9FE;
    color: #1A1A2E;
    border-bottom-left-radius: 4px;
  }

  &.typing {
    padding: 12px 18px;
    .dot {
      display: inline-block;
      width: 6px; height: 6px;
      border-radius: 50%;
      background: #9CA3AF;
      margin: 0 2px;
      animation: bounce 1.4s infinite;
      &:nth-child(2) { animation-delay: 0.2s; }
      &:nth-child(3) { animation-delay: 0.4s; }
    }
  }
}

@keyframes bounce {
  0%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(-6px); }
}

.message-sender {
  font-size: 11px;
  font-weight: 600;
  color: #6B7280;
  margin-bottom: 2px;
}

.message-time {
  font-size: 10px;
  color: rgba(0, 0, 0, 0.35);
  margin-top: 4px;
  text-align: right;
}

.message-bubble.user .message-time {
  color: rgba(255, 255, 255, 0.6);
}

.chat-input-bar {
  background: #fff;
  padding: 8px 16px;
  border-top: 1px solid #E5E7EB;
}

.chat-input {
  :deep(.q-field__control) {
    border-radius: 24px;
  }
}
</style>
