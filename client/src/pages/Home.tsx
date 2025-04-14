import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import ChatSidebar from "../components/chat/ChatSidebar";
import ChatView from "../components/chat/ChatView";
import StatusView from "../components/status/StatusView";
import MobileNavigation from "../components/layouts/MobileNavigation";
import { Chat, Message, Status } from "../types";
import { useQuery } from "@tanstack/react-query";
import { WebSocket } from "ws";
import { Spinner } from "@/components/ui/chart";

export default function Home() {
  const { user } = useAuth();
  const [activeView, setActiveView] = useState<"chats" | "status">("chats");
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [socket, setSocket] = useState<WebSocket | null>(null);

  const { data: chats, isLoading: chatsLoading } = useQuery<Chat[]>({
    queryKey: ["/api/chats"],
  });

  const { data: statuses, isLoading: statusesLoading } = useQuery<Status[]>({
    queryKey: ["/api/statuses"],
  });

  // Connect to WebSocket for real-time updates
  useEffect(() => {
    if (!user) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const newSocket = new WebSocket(wsUrl);

    newSocket.onopen = () => {
      console.log("WebSocket connected");
      // Authenticate socket connection
      if (user) {
        newSocket.send(
          JSON.stringify({
            type: "auth",
            userId: user.uid,
          })
        );
      }
    };

    newSocket.onclose = () => {
      console.log("WebSocket disconnected");
    };

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [user]);

  const handleChatSelect = (chat: Chat) => {
    setSelectedChat(chat);
    // On mobile, also switch to chat view
    if (window.innerWidth < 768) {
      setActiveView("chats");
    }
  };

  const handleMobileNavigation = (view: "chats" | "status") => {
    setActiveView(view);
    if (view === "status") {
      setSelectedChat(null);
    }
  };

  if (chatsLoading || statusesLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center">
          <h1 className="text-2xl font-bold text-primary mb-4">NetChat</h1>
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background text-textPrimary">
      {/* Mobile Header */}
      <header className="bg-primary text-white py-4 px-6 flex justify-between items-center md:hidden">
        <h1 className="text-xl font-bold">NetChat</h1>
        <div className="flex items-center space-x-4">
          <button className="focus:outline-none" aria-label="Search">
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
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </button>
          <button className="focus:outline-none" aria-label="Menu">
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
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Sidebar - hidden on mobile when chat is selected */}
        <div
          className={`${
            selectedChat && window.innerWidth < 768 ? "hidden" : "block"
          } md:block md:w-1/3 lg:w-1/4 xl:w-1/5`}
        >
          <ChatSidebar
            chats={chats || []}
            onChatSelect={handleChatSelect}
            selectedChatId={selectedChat?.id}
            visible={activeView === "chats"}
          />
        </div>

        {/* Main content area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {activeView === "chats" && selectedChat ? (
            <ChatView
              chat={selectedChat}
              socket={socket}
              onBackClick={() => setSelectedChat(null)}
            />
          ) : activeView === "status" ? (
            <StatusView
              statuses={statuses || []}
              onBackClick={() => setActiveView("chats")}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-center p-4">
              <div>
                <h2 className="text-xl font-bold text-primary mb-2">
                  Welcome to NetChat
                </h2>
                <p className="text-textSecondary mb-4">
                  Select a chat to start messaging or check out status updates
                </p>
              </div>
            </div>
          )}
        </main>

        {/* Mobile Navigation */}
        <MobileNavigation
          activeView={activeView}
          onChange={handleMobileNavigation}
        />
      </div>
    </div>
  );
}
