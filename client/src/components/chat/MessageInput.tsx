import { useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface MessageInputProps {
  messageText: string;
  setMessageText: (text: string) => void;
  onSendMessage: () => void;
  onImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  sendingInProgress: boolean;
}

export default function MessageInput({
  messageText,
  setMessageText,
  onSendMessage,
  onImageSelect,
  sendingInProgress,
}: MessageInputProps) {
  const inputRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle enter key press to send message
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSendMessage();
    }
  };

  // Auto-resize input
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      const scrollHeight = inputRef.current.scrollHeight;
      inputRef.current.style.height = `${
        scrollHeight > 120 ? 120 : scrollHeight
      }px`;
    }
  }, [messageText]);

  return (
    <div className="bg-white border-t p-3">
      <div className="flex items-center">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-gray-500"
          aria-label="Emoji"
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
              d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </Button>
        
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={onImageSelect}
          className="hidden"
        />
        
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-gray-500"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Attach file"
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
              d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
            />
          </svg>
        </Button>
        
        <div className="relative flex-1 mx-2">
          <div
            ref={inputRef}
            contentEditable
            className="message-input w-full p-2 pr-10 bg-gray-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary overflow-y-auto"
            style={{ minHeight: "40px", maxHeight: "120px" }}
            onKeyDown={handleKeyDown}
            onInput={(e) => setMessageText(e.currentTarget.textContent || "")}
            dangerouslySetInnerHTML={{ __html: messageText }}
            placeholder="Type a message"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-primary"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Take photo"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </Button>
        </div>
        
        <Button
          type="button"
          className="p-2 bg-primary text-white rounded-full"
          disabled={sendingInProgress || (!messageText.trim() && !fileInputRef.current?.files?.length)}
          onClick={onSendMessage}
          aria-label="Send message"
        >
          {sendingInProgress ? (
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
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
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          )}
        </Button>
      </div>
    </div>
  );
}
