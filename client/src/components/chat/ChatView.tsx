import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Chat, Message } from "../../types";
import { useAuth } from "../../hooks/useAuth";
import { format } from "date-fns";
import MessageInput from "./MessageInput";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { WebSocket } from "ws";

interface ChatViewProps {
  chat: Chat;
  socket: WebSocket | null;
  onBackClick: () => void;
}

export default function ChatView({ chat, socket, onBackClick }: ChatViewProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messageText, setMessageText] = useState("");
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ["/api/messages", chat.id],
  });

  const { data: currentUser } = useQuery({
    queryKey: ["/api/users/me"],
  });

  // Get other user for direct chats
  const otherUser =
    chat.type === "direct"
      ? chat.members?.find((member) => member.id !== currentUser?.id)
      : null;

  const displayName =
    chat.type === "group" ? chat.name : otherUser?.displayName || "User";
  const avatarUrl =
    chat.type === "group"
      ? chat.photoURL
      : otherUser?.photoURL ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}`;

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: (newMessage: {
      chatId: number;
      messageType: "text" | "image";
      content: string;
    }) => apiRequest("POST", "/api/messages", newMessage),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages", chat.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
    },
  });

  // Handle image selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  // Send message
  const handleSendMessage = async () => {
    if ((!messageText && !selectedImage) || !chat.id) return;

    try {
      if (selectedImage) {
        // Create a FormData to upload the image
        const formData = new FormData();
        formData.append("image", selectedImage);
        formData.append("chatId", chat.id.toString());

        // Upload the image
        const response = await fetch("/api/upload/image", {
          method: "POST",
          body: formData,
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Failed to upload image");
        }

        const { imageUrl } = await response.json();

        // Send message with image URL
        await sendMessageMutation.mutateAsync({
          chatId: chat.id,
          messageType: "image",
          content: imageUrl,
        });

        // Clear image
        setSelectedImage(null);
        setPreviewUrl(null);
      }

      if (messageText.trim()) {
        // Send text message
        await sendMessageMutation.mutateAsync({
          chatId: chat.id,
          messageType: "text",
          content: messageText,
        });

        // Clear text
        setMessageText("");
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  // Group messages by date
  const messagesByDate: { [date: string]: Message[] } = {};
  messages.forEach((message) => {
    const date = format(new Date(message.timestamp), "yyyy-MM-dd");
    if (!messagesByDate[date]) {
      messagesByDate[date] = [];
    }
    messagesByDate[date].push(message);
  });

  // Scroll to bottom when new messages are received
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Listen for new messages from WebSocket
  useEffect(() => {
    if (!socket) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "new_message" && data.chatId === chat.id) {
          queryClient.invalidateQueries({
            queryKey: ["/api/messages", chat.id],
          });
          queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    socket.addEventListener("message", handleMessage);
    return () => {
      socket.removeEventListener("message", handleMessage);
    };
  }, [socket, chat.id, queryClient]);

  return (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <div className="bg-white border-b py-3 px-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden mr-2 text-primary"
            onClick={onBackClick}
            aria-label="Back"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Button>
          <img
            src={avatarUrl}
            alt={displayName}
            className="w-10 h-10 rounded-full object-cover"
          />
          <div className="ml-3">
            <h2 className="font-medium text-gray-900">{displayName}</h2>
            <p className="text-xs text-gray-500">
              {chat.type === "group"
                ? `${chat.members?.length || 0} members`
                : otherUser?.isOnline
                ? "Online"
                : "Offline"}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-500"
            aria-label="Video call"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-500"
            aria-label="Call"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
              />
            </svg>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-500"
            aria-label="More options"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
              />
            </svg>
          </Button>
        </div>
      </div>

      {/* Chat messages */}
      <ScrollArea
        className="flex-1 p-4 chat-height"
        style={{
          backgroundImage:
            "url('https://web.whatsapp.com/img/bg-chat-tile-light_04fcacde539c58cca6bacfedd38bec92.png')",
        }}
      >
        {Object.keys(messagesByDate).length === 0 ? (
          <div className="flex justify-center items-center h-full">
            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <h3 className="font-medium text-gray-900">No messages yet</h3>
              <p className="text-sm text-gray-500 mt-1">
                Start the conversation!
              </p>
            </div>
          </div>
        ) : (
          Object.entries(messagesByDate).map(([date, dateMessages]) => (
            <div key={date}>
              {/* Date marker */}
              <div className="flex justify-center mb-4">
                <span className="bg-white px-3 py-1 rounded-full text-xs text-gray-500 shadow-sm">
                  {isToday(new Date(date))
                    ? "Today"
                    : isYesterday(new Date(date))
                    ? "Yesterday"
                    : format(new Date(date), "MMMM d, yyyy")}
                </span>
              </div>

              {/* Messages for this date */}
              {dateMessages.map((message) => {
                const isCurrentUser = message.senderId === currentUser?.id;
                return (
                  <div
                    key={message.id}
                    className={`flex mb-4 ${
                      isCurrentUser ? "justify-end" : ""
                    }`}
                  >
                    <div
                      className={`max-w-[75%] rounded-lg p-3 shadow-sm ${
                        isCurrentUser
                          ? "bg-[#DCF8C6]"
                          : "bg-white"
                      }`}
                    >
                      {/* Show sender name in group chats */}
                      {chat.type === "group" && !isCurrentUser && (
                        <p className="text-xs font-medium text-primary mb-1">
                          {message.sender?.displayName || "Unknown"}
                        </p>
                      )}

                      {/* Message content */}
                      {message.messageType === "image" ? (
                        <div className="mb-2">
                          <img
                            src={message.content}
                            alt="Image message"
                            className="rounded-lg max-w-full h-auto"
                          />
                        </div>
                      ) : (
                        <p className="text-gray-900">{message.content}</p>
                      )}

                      {/* Message timestamp and status */}
                      <div className="flex justify-end items-center mt-1">
                        <span className="text-xs text-gray-500 mr-1">
                          {format(new Date(message.timestamp), "p")}
                        </span>
                        {isCurrentUser && (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className={`h-4 w-4 ${
                              message.status === "read"
                                ? "text-blue-500"
                                : "text-gray-400"
                            }`}
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}

        {/* Image preview */}
        {previewUrl && (
          <div className="flex justify-center mb-4">
            <div className="relative max-w-[75%]">
              <img
                src={previewUrl}
                alt="Selected image"
                className="rounded-lg max-w-full h-auto"
              />
              <Button
                variant="secondary"
                size="icon"
                className="absolute top-2 right-2 bg-gray-800/50 hover:bg-gray-800/70 text-white rounded-full h-8 w-8"
                onClick={() => {
                  setSelectedImage(null);
                  setPreviewUrl(null);
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </Button>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </ScrollArea>

      {/* Message input area */}
      <MessageInput
        messageText={messageText}
        setMessageText={setMessageText}
        onSendMessage={handleSendMessage}
        onImageSelect={handleImageSelect}
        sendingInProgress={sendMessageMutation.isPending}
      />
    </div>
  );
}

function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

function isYesterday(date: Date): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return (
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()
  );
}
