<template>
  <div class="lead-chat">
    <!-- Header with follow button -->
    <div class="chat-header row items-center q-mb-sm">
      <span class="text-caption text-grey-5">Team Deal Chat</span>
      <q-space />
      <q-btn
        flat dense no-caps size="sm"
        :icon="isFollowing ? 'notifications_active' : 'notifications_none'"
        :label="isFollowing ? 'Following' : 'Follow'"
        :color="isFollowing ? 'primary' : 'grey-6'"
        :loading="togglingFollow"
        @click="toggleFollow"
      />
    </div>

    <!-- Messages area -->
    <div ref="messagesContainer" class="messages-container">
      <div v-if="loading" class="text-center q-pa-lg">
        <q-spinner-dots color="primary" size="30px" />
      </div>
      <div v-else-if="messages.length === 0" class="empty-state">
        <q-icon name="chat_bubble_outline" size="48px" color="grey-4" />
        <p class="text-grey-5 q-mt-sm">No messages yet. Start the conversation!</p>
      </div>
      <template v-else>
        <div
          v-for="msg in messages"
          :key="msg.id"
          class="message-row"
          :class="{ 'message-own': msg.userId === currentUserId }"
        >
          <q-avatar
            v-if="msg.userId !== currentUserId"
            size="28px"
            color="grey-3"
            text-color="grey-7"
            class="q-mr-xs"
          >
            <img v-if="msg.user?.profileImage" :src="msg.user.profileImage" :alt="userName(msg)" />
            <span v-else class="text-10">{{ initials(userName(msg)) }}</span>
          </q-avatar>
          <div class="message-bubble" :class="msg.userId === currentUserId ? 'bubble-own' : 'bubble-other'">
            <div v-if="msg.userId !== currentUserId" class="sender-name">{{ userName(msg) }}</div>
            <div class="message-text">{{ msg.message }}</div>
            <div class="message-time">{{ formatTime(msg.createdAt) }}</div>
          </div>
        </div>
      </template>
    </div>

    <!-- Typing indicator -->
    <div v-if="typingUser" class="typing-indicator">
      <span class="text-caption text-grey-5">{{ typingUser }} is typing...</span>
    </div>

    <!-- Input area -->
    <div class="input-area">
      <q-input
        v-model="newMessage"
        outlined
        dense
        placeholder="Type a message..."
        class="message-input"
        @keyup.enter="sendMessage"
        @update:model-value="emitTyping"
      >
        <template #append>
          <q-btn
            flat
            dense
            round
            icon="send"
            color="primary"
            :disable="!newMessage.trim()"
            @click="sendMessage"
          />
        </template>
      </q-input>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { api } from '@/boot/axios';
import { API_URL } from '@/config/api';
import { io, Socket } from 'socket.io-client';

interface ChatMessage {
  id: string;
  leadId: string;
  userId: string;
  message: string;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    profileImage: string | null;
  };
}

const props = defineProps<{ leadId: string }>();
const messages = ref<ChatMessage[]>([]);
const newMessage = ref('');
const loading = ref(true);
const messagesContainer = ref<HTMLElement | null>(null);
const typingUser = ref<string | null>(null);
const isFollowing = ref(false);
const togglingFollow = ref(false);
let typingTimeout: ReturnType<typeof setTimeout> | null = null;
let socket: Socket | null = null;

const currentUserId = (() => {
  try {
    const stored = localStorage.getItem('auth');
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed?.user?.id ?? '';
    }
  } catch { /* ignore */ }
  return '';
})();

function getAuthToken(): string {
  try {
    const stored = localStorage.getItem('auth');
    if (stored) return JSON.parse(stored)?.token ?? '';
  } catch { /* ignore */ }
  return '';
}

function userName(msg: ChatMessage) {
  if (!msg.user) return 'Unknown';
  return `${msg.user.firstName ?? ''} ${msg.user.lastName ?? ''}`.trim() || 'Unknown';
}

function initials(name: string) {
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2) || '?';
}

function formatTime(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) {
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  });
}

async function checkFollowStatus() {
  try {
    const { data } = await api.get(`/leads/${props.leadId}/chat/follow`);
    isFollowing.value = data.following;
  } catch { /* ignore */ }
}

async function toggleFollow() {
  togglingFollow.value = true;
  try {
    if (isFollowing.value) {
      await api.delete(`/leads/${props.leadId}/chat/follow`);
      isFollowing.value = false;
    } else {
      await api.post(`/leads/${props.leadId}/chat/follow`);
      isFollowing.value = true;
    }
  } catch { /* ignore */ }
  finally { togglingFollow.value = false; }
}

async function loadMessages() {
  loading.value = true;
  try {
    const { data } = await api.get(`/leads/${props.leadId}/chat`);
    messages.value = data;
    scrollToBottom();
  } catch {
    // silently fail
  } finally {
    loading.value = false;
  }
}

async function sendMessage() {
  const text = newMessage.value.trim();
  if (!text) return;
  newMessage.value = '';
  try {
    const { data } = await api.post(`/leads/${props.leadId}/chat`, { message: text });
    // If socket not connected, add locally
    if (!socket?.connected) {
      messages.value.push(data);
      scrollToBottom();
    }
  } catch {
    // restore message on failure
    newMessage.value = text;
  }
}

let lastTypingEmit = 0;
function emitTyping() {
  if (!socket?.connected) return;
  const now = Date.now();
  if (now - lastTypingEmit < 2000) return;
  lastTypingEmit = now;
  socket.emit('typing', { leadId: props.leadId });
}

function connectSocket() {
  const token = getAuthToken();
  if (!token) return;

  socket = io(`${API_URL}/lead-chat`, {
    auth: { token },
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    socket?.emit('join_lead', { leadId: props.leadId });
  });

  socket.on('new_message', (msg: ChatMessage) => {
    // Avoid duplicates
    if (!messages.value.find(m => m.id === msg.id)) {
      messages.value.push(msg);
      scrollToBottom();
    }
  });

  socket.on('user_typing', (data: { userId: string; name: string }) => {
    if (data.userId === currentUserId) return;
    typingUser.value = data.name;
    if (typingTimeout) clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => { typingUser.value = null; }, 3000);
  });
}

onMounted(() => {
  loadMessages();
  checkFollowStatus();
  connectSocket();
});

onUnmounted(() => {
  if (socket) {
    socket.emit('leave_lead', { leadId: props.leadId });
    socket.disconnect();
    socket = null;
  }
  if (typingTimeout) clearTimeout(typingTimeout);
});

watch(() => props.leadId, (newId, oldId) => {
  if (newId !== oldId) {
    if (socket) {
      socket.emit('leave_lead', { leadId: oldId });
      socket.emit('join_lead', { leadId: newId });
    }
    loadMessages();
  }
});
</script>

<style lang="scss" scoped>
.lead-chat {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 350px;
  max-height: 500px;
}

.chat-header {
  padding-bottom: 6px;
  border-bottom: 1px solid #F3F4F6;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;

  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: #D1D5DB; border-radius: 4px; }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 16px;
}

.message-row {
  display: flex;
  align-items: flex-end;
  margin-bottom: 8px;
  padding: 0 4px;

  &.message-own {
    justify-content: flex-end;
  }
}

.message-bubble {
  max-width: 75%;
  padding: 8px 12px;
  border-radius: 12px;
  word-break: break-word;
}

.bubble-own {
  background: #00897B;
  color: #fff;
  border-bottom-right-radius: 4px;

  .message-time {
    color: rgba(255, 255, 255, 0.7);
  }
}

.bubble-other {
  background: #F3F4F6;
  color: #1A1A2E;
  border-bottom-left-radius: 4px;
}

.sender-name {
  font-size: 11px;
  font-weight: 600;
  color: #00897B;
  margin-bottom: 2px;
}

.message-text {
  font-size: 13px;
  line-height: 1.4;
  white-space: pre-wrap;
}

.message-time {
  font-size: 10px;
  color: #9CA3AF;
  text-align: right;
  margin-top: 2px;
}

.typing-indicator {
  padding: 4px 8px;
  min-height: 20px;
}

.input-area {
  padding-top: 8px;
  border-top: 1px solid #F3F4F6;
}

.message-input {
  :deep(.q-field__control) {
    border-radius: 20px;
  }
}
</style>
