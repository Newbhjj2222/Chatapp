import { useState, useEffect, useRef } from "react";
import { Status } from "../../types";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface StatusViewerProps {
  status: Status;
  onClose: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  hasNext?: boolean;
  hasPrevious?: boolean;
}

export default function StatusViewer({
  status,
  onClose,
  onNext,
  onPrevious,
  hasNext = false,
  hasPrevious = false,
}: StatusViewerProps) {
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const viewDuration = 5000; // 5 seconds per status
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const elapsedTimeRef = useRef<number>(0);
  const queryClient = useQueryClient();

  // Mark status as viewed
  useEffect(() => {
    const markAsViewed = async () => {
      try {
        await apiRequest("POST", `/api/statuses/${status.id}/view`, {});
        // Invalidate statuses to update view count
        queryClient.invalidateQueries({ queryKey: ["/api/statuses"] });
      } catch (error) {
        console.error("Error marking status as viewed:", error);
      }
    };

    markAsViewed();
  }, [status.id, queryClient]);

  // Handle progress bar
  useEffect(() => {
    // Reset progress when status changes
    setProgress(0);
    elapsedTimeRef.current = 0;
    startTimeRef.current = Date.now();

    const updateProgress = () => {
      const currentTime = Date.now();
      const delta = currentTime - startTimeRef.current;
      startTimeRef.current = currentTime;
      
      if (!isPaused) {
        elapsedTimeRef.current += delta;
        const newProgress = Math.min((elapsedTimeRef.current / viewDuration) * 100, 100);
        setProgress(newProgress);
        
        if (newProgress >= 100 && onNext) {
          onNext();
        }
      }
    };

    // Set up interval for progress bar
    progressIntervalRef.current = setInterval(updateProgress, 100);

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [status.id, isPaused, onNext]);

  // Handle user interactions
  const handlePauseToggle = () => {
    setIsPaused(!isPaused);
  };

  // Handle touch/click for navigation
  const handleScreenTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const screenWidth = window.innerWidth;
    const clickX = e.clientX;
    const threshold = screenWidth * 0.3; // 30% of screen width
    
    if (clickX < threshold && hasPrevious) {
      if (onPrevious) onPrevious();
    } else if (clickX > screenWidth - threshold && hasNext) {
      if (onNext) onNext();
    } else {
      handlePauseToggle();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Progress bar */}
      <div className="absolute top-0 left-0 right-0 z-10 p-2 flex space-x-1">
        <Progress value={progress} className="h-1 bg-gray-600" />
      </div>
      
      {/* Header */}
      <div className="relative z-10 p-4 flex items-center text-white">
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-black/20"
          onClick={onClose}
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
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </Button>
        
        <div className="flex items-center ml-2">
          <img
            src={status.user?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(status.user?.displayName || 'User')}`}
            alt="User"
            className="w-8 h-8 rounded-full object-cover mr-2"
          />
          <div>
            <p className="font-medium">{status.user?.displayName}</p>
            <p className="text-xs opacity-70">
              {new Date(status.timestamp).toLocaleString()}
            </p>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div 
        className="flex-1 flex items-center justify-center" 
        onClick={handleScreenTap}
      >
        {status.type === "image" ? (
          <img
            src={status.content}
            alt="Status"
            className="max-w-full max-h-full object-contain"
          />
        ) : (
          <div className="bg-primary p-8 rounded-lg max-w-md text-white text-center text-xl font-medium">
            {status.content}
          </div>
        )}
      </div>
      
      {/* Footer with view count */}
      <div className="relative z-10 p-4 text-white">
        <div className="flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
          <span>{status.viewCount} views</span>
        </div>
      </div>
      
      {/* Navigation indicators */}
      <div className="absolute inset-y-0 left-0 w-1/3 flex items-center justify-start px-4 opacity-0">
        {hasPrevious && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white bg-black/20 hover:bg-black/40"
            onClick={onPrevious}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8"
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
        )}
      </div>
      
      <div className="absolute inset-y-0 right-0 w-1/3 flex items-center justify-end px-4 opacity-0">
        {hasNext && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white bg-black/20 hover:bg-black/40"
            onClick={onNext}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Button>
        )}
      </div>
    </div>
  );
}
