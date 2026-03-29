<template>
  <q-page class="q-pa-md" style="background: #F8FAFB">
    <div class="row items-center q-mb-md">
      <h5 class="q-my-none text-weight-bold">Live Chat</h5>
      <q-badge v-if="waitingCount > 0" color="orange" text-color="white" class="q-ml-sm">
        {{ waitingCount }} waiting
      </q-badge>
      <q-space />
      <q-btn flat dense no-caps icon="refresh" color="grey-6" @click="loadConversations" />
    </div>

    <div class="row q-col-gutter-md" style="height: calc(100vh - 140px)">
      <!-- Conversation list -->
      <div class="col-12 col-md-4">
        <q-card flat class="conv-list-card full-height">
          <q-tabs v-model="filterTab" dense no-caps active-color="primary" indicator-color="primary" class="q-mb-sm" align="left">
            <q-tab name="waiting" :label="`Waiting (${waitingConvs.length})`" />
            <q-tab name="active" :label="`Active (${activeConvs.length})`" />
            <q-tab name="closed" :label="`Closed (${closedConvs.length})`" />
          </q-tabs>

          <q-list separator class="conv-list">
            <q-item
              v-for="conv in filteredConvs"
              :key="conv.id"
              clickable
              v-ripple
              :active="selectedConv?.id === conv.id"
              active-class="active-conv"
              @click="selectConversation(conv)"
            >
              <q-item-section avatar>
                <UserAvatar
                  :user-id="conv.userId || null"
                  :name="conv.visitorName || (conv.user ? `${conv.user.firstName} ${conv.user.lastName}` : 'Visitor')"
                  size="36px"
                  :color="conv.status === 'WAITING_AGENT' ? 'orange' : 'primary'"
                />
              </q-item-section>
              <q-item-section>
                <q-item-label class="text-weight-medium">
                  {{ conv.visitorName || (conv.user ? `${conv.user.firstName} ${conv.user.lastName}` : 'Visitor') }}
                </q-item-label>
                <q-item-label caption class="ellipsis">
                  {{ conv.messages?.[0]?.content || 'No messages' }}
                </q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-badge v-if="conv.status === 'WAITING_AGENT'" color="orange" text-color="white" style="font-size: 10px">
                  Waiting
                </q-badge>
                <q-item-label v-else caption>{{ timeAgo(conv.updatedAt) }}</q-item-label>
              </q-item-section>
            </q-item>

            <q-item v-if="filteredConvs.length === 0">
              <q-item-section class="text-center text-grey-5 q-pa-lg">No conversations</q-item-section>
            </q-item>
          </q-list>
        </q-card>
      </div>

      <!-- Chat window -->
      <div class="col-12 col-md-8">
        <q-card flat class="chat-window full-height" v-if="selectedConv">
          <!-- Chat header -->
          <div class="chat-win-header q-pa-sm">
            <div class="row items-center no-wrap">
              <UserAvatar
                :user-id="selectedConv.userId || null"
                :name="selectedConv.visitorName || (selectedConv.user ? `${selectedConv.user.firstName} ${selectedConv.user.lastName}` : 'Visitor')"
                size="36px"
                class="q-mr-sm"
              />
              <div>
                <div class="text-weight-bold" style="font-size: 14px">
                  {{ selectedConv.visitorName || (selectedConv.user ? `${selectedConv.user.firstName} ${selectedConv.user.lastName}` : 'Visitor') }}
                </div>
                <div class="text-caption text-grey-5" v-if="selectedConv.visitorEmail">
                  {{ selectedConv.visitorEmail }}
                </div>
                <div class="text-caption" :class="selectedConv.status === 'WITH_AGENT' ? 'text-positive' : 'text-orange'">
                  {{ selectedConv.status === 'CLOSED' ? 'Closed' : selectedConv.status === 'WITH_AGENT' ? 'You are connected' : 'Waiting for you' }}
                </div>
              </div>
              <q-space />
              <q-btn v-if="selectedConv.status === 'WAITING_AGENT'" unelevated no-caps color="primary" label="Join Chat" size="sm" style="border-radius: 8px" @click="joinChat" />
              <q-btn v-if="selectedConv.status !== 'CLOSED'" flat dense icon="close" color="grey-6" @click="closeChat">
                <q-tooltip>Close conversation</q-tooltip>
              </q-btn>
            </div>
          </div>

          <!-- Messages -->
          <div ref="agentMessages" class="agent-messages">
            <div v-for="msg in chatMessages" :key="msg.id" class="msg-row" :class="msg.senderType === 'AGENT' ? 'agent' : msg.senderType === 'USER' ? 'user' : 'bot'">
              <div class="msg-bubble" :class="msg.senderType">
                <div v-if="msg.senderType !== 'AGENT'" class="msg-sender">{{ msg.senderType === 'BOT' ? 'Bot' : 'User' }}</div>
                <div class="msg-text">{{ msg.content }}</div>
                <div class="msg-time">{{ formatTime(msg.createdAt) }}</div>
              </div>
            </div>
          </div>

          <!-- Agent input -->
          <div class="agent-input q-pa-sm" v-if="selectedConv.status === 'WITH_AGENT'">
            <q-input
              v-model="agentReply"
              outlined
              dense
              placeholder="Type your reply..."
              class="agent-input-field"
              @keyup.enter="sendAgentMessage"
            >
              <template #append>
                <q-btn round flat icon="send" color="primary" :disable="!agentReply.trim()" @click="sendAgentMessage" />
              </template>
            </q-input>
          </div>
        </q-card>

        <!-- No selection -->
        <q-card v-else flat class="chat-window full-height row items-center justify-center">
          <div class="text-center">
            <q-icon name="forum" size="64px" color="grey-3" />
            <div class="text-grey-5 q-mt-md">Select a conversation to start responding</div>
          </div>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { io, Socket } from 'socket.io-client';
import { api } from '@/boot/axios';
import { API_URL } from '@/config/api';
import UserAvatar from '@/components/common/UserAvatar.vue';

const socket = ref<Socket | null>(null);
interface ChatMessage {
  id: string;
  conversationId: string;
  senderId?: string;
  senderType: 'USER' | 'AGENT' | 'BOT';
  content: string;
  createdAt: string;
}

interface Conversation {
  id: string;
  status: string;
  visitorName?: string;
  visitorEmail?: string;
  userId?: string;
  assignedTo?: string;
  updatedAt: string;
  user?: { firstName: string; lastName: string };
  messages?: ChatMessage[];
}

const conversations = ref<Conversation[]>([]);
const selectedConv = ref<Conversation | null>(null);
const chatMessages = ref<ChatMessage[]>([]);
const agentReply = ref('');
const filterTab = ref('waiting');
const agentMessages = ref<HTMLElement>();
let pollInterval: ReturnType<typeof setInterval> | null = null;

const waitingConvs = computed(() => conversations.value.filter((c) => c.status === 'WAITING_AGENT'));
const activeConvs = computed(() => conversations.value.filter((c) => c.status === 'WITH_AGENT' || c.status === 'OPEN'));
const closedConvs = computed(() => conversations.value.filter((c) => c.status === 'CLOSED'));
const waitingCount = computed(() => waitingConvs.value.length);

const filteredConvs = computed(() => {
  if (filterTab.value === 'waiting') return waitingConvs.value;
  if (filterTab.value === 'active') return activeConvs.value;
  return closedConvs.value;
});

onMounted(() => {
  loadConversations();
  pollInterval = setInterval(loadConversations, 10000);

  socket.value = io(`${API_URL}/chat`, { transports: ['websocket', 'polling'] });

  socket.value.on('new_message', (msg: ChatMessage) => {
    if (selectedConv.value && msg.conversationId === selectedConv.value.id) {
      if (!chatMessages.value.find((m) => m.id === msg.id)) {
        chatMessages.value.push(msg);
        scrollToBottom();
      }
    }
  });

  socket.value.on('agent_requested', () => {
    loadConversations();
  });
});

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval);
  socket.value?.disconnect();
});

async function loadConversations() {
  try {
    const { data } = await api.get('/chat/conversations');
    conversations.value = Array.isArray(data) ? data : [];
  } catch { /* ignore */ }
}

async function selectConversation(conv: Conversation) {
  selectedConv.value = conv;
  try {
    const { data } = await api.get(`/chat/conversations/${conv.id}`);
    chatMessages.value = data.messages ?? [];
    selectedConv.value = { ...conv, ...data };
    socket.value?.emit('join_conversation', { conversationId: conv.id });
    scrollToBottom();
  } catch { /* ignore */ }
}

async function joinChat() {
  if (!socket.value || !selectedConv.value) return;
  try {
    const { data: user } = await api.get('/users/me');
    socket.value.emit('agent_join', {
      conversationId: selectedConv.value.id,
      agentId: user.id,
    });
    selectedConv.value.status = 'WITH_AGENT';
    loadConversations();
  } catch { /* ignore */ }
}

function sendAgentMessage() {
  if (!agentReply.value.trim() || !socket.value || !selectedConv.value) return;
  socket.value.emit('agent_message', {
    conversationId: selectedConv.value.id,
    content: agentReply.value.trim(),
    agentId: selectedConv.value.assignedTo,
  });
  agentReply.value = '';
}

async function closeChat() {
  if (!socket.value || !selectedConv.value) return;
  socket.value.emit('close_conversation', { conversationId: selectedConv.value.id });
  selectedConv.value.status = 'CLOSED';
  loadConversations();
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

async function scrollToBottom() {
  await nextTick();
  if (agentMessages.value) {
    agentMessages.value.scrollTop = agentMessages.value.scrollHeight;
  }
}

watch(chatMessages, () => scrollToBottom(), { deep: true });
</script>

<style lang="scss" scoped>
.conv-list-card {
  background: #fff;
  border: 1px solid #E5E7EB;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
}

.conv-list {
  flex: 1;
  overflow-y: auto;
}

.active-conv {
  background: #F0FDFA !important;
  border-left: 3px solid #00897B;
}

.chat-window {
  background: #fff;
  border: 1px solid #E5E7EB;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
}

.chat-win-header {
  border-bottom: 1px solid #E5E7EB;
}

.agent-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.msg-row {
  display: flex;
  &.agent { justify-content: flex-end; }
  &.user, &.bot { justify-content: flex-start; }
}

.msg-bubble {
  max-width: 70%;
  padding: 8px 12px;
  border-radius: 12px;
  font-size: 13px;

  &.AGENT { background: #00897B; color: #fff; border-bottom-right-radius: 4px; }
  &.USER { background: #F3F4F6; color: #1A1A2E; border-bottom-left-radius: 4px; }
  &.BOT { background: #FFF7ED; color: #92400E; border-bottom-left-radius: 4px; }
}

.msg-sender { font-size: 10px; font-weight: 600; color: #9CA3AF; margin-bottom: 2px; }
.msg-time { font-size: 10px; opacity: 0.6; margin-top: 2px; text-align: right; }
.msg-bubble.AGENT .msg-time { color: rgba(255,255,255,0.6); }

.agent-input {
  border-top: 1px solid #E5E7EB;
}

.agent-input-field {
  :deep(.q-field__control) { border-radius: 20px; }
}

.full-height {
  height: 100%;
}
</style>
