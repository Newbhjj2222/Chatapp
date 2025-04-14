export interface User {
  id: number;
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
}

export interface Chat {
  id: number;
  type: 'direct' | 'group';
  name?: string;
  photoURL?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  members?: User[];
  isOnline?: boolean;
}

export interface Message {
  id: number;
  chatId: number;
  senderId: number;
  sender?: User;
  messageType: 'text' | 'image';
  content: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
}

export interface Status {
  id: number;
  userId: number;
  user?: User;
  content: string;
  type: 'text' | 'image';
  timestamp: string;
  expiresAt: string;
  viewCount: number;
}

export interface BannerAd {
  id: string;
  imageUrl: string;
  title: string;
  description: string;
  ctaText: string;
  ctaUrl: string;
  viewCount: number;
}
