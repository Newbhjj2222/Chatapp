import { useState, useEffect } from "react";
import { ArrowLeft, Eye } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useChat } from "@/contexts/ChatContext";
import { Button } from "@/components/ui/button";
import { DEFAULT_PROFILE_IMAGE } from "@/lib/constants";
import { format } from "date-fns";

interface StatusViewerProps {
  onClose: () => void;
}

const StatusViewer = ({ onClose }: StatusViewerProps) => {
  const { user } = useAuth();
  const { selectedStatus, statusList, viewStatus } = useChat();
  const [currentStatusIndex, setCurrentStatusIndex] = useState(0);
  const [progressBars, setProgressBars] = useState<boolean[]>([]);

  useEffect(() => {
    if (!selectedStatus || !statusList.length) return;

    // Find the index of the selected status in the statusList
    const index = statusList.findIndex(status => status.userId === selectedStatus.userId);
    if (index !== -1) {
      setCurrentStatusIndex(index);
    }

    // Mark the status as viewed
    if (selectedStatus.id && user?.uid) {
      viewStatus(selectedStatus.id, user.uid);
    }

    // Initialize progress bars
    setProgressBars(statusList.map((_, i) => i < index));

    // Setup auto-progress
    const timer = setTimeout(() => {
      handleNext();
    }, 5000);

    return () => clearTimeout(timer);
  }, [selectedStatus, statusList, user?.uid]);

  const handleNext = () => {
    if (currentStatusIndex < statusList.length - 1) {
      setCurrentStatusIndex(prevIndex => {
        const newIndex = prevIndex + 1;
        setProgressBars(bars => bars.map((_, i) => i <= newIndex));
        
        // Mark the next status as viewed
        if (statusList[newIndex]?.id && user?.uid) {
          viewStatus(statusList[newIndex].id, user.uid);
        }
        
        return newIndex;
      });
    } else {
      onClose();
    }
  };

  const handlePrevious = () => {
    if (currentStatusIndex > 0) {
      setCurrentStatusIndex(prevIndex => {
        const newIndex = prevIndex - 1;
        setProgressBars(bars => bars.map((_, i) => i < newIndex));
        return newIndex;
      });
    }
  };

  if (!selectedStatus || !statusList.length) {
    return null;
  }

  const currentStatus = statusList[currentStatusIndex];
  
  return (
    <div className="fixed inset-0 z-50 bg-black">
      <div className="h-full flex flex-col">
        {/* Status Header */}
        <div className="px-4 py-3 flex items-center">
          <Button variant="ghost" onClick={onClose} className="text-white mr-3 p-2">
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <div className="flex items-center">
            <img
              src={currentStatus.user?.profileImage || DEFAULT_PROFILE_IMAGE}
              alt="Contact"
              className="w-10 h-10 rounded-full mr-3"
            />
            <div>
              <h2 className="font-medium text-white">{currentStatus.user?.username}</h2>
              <p className="text-xs text-gray-300">
                {currentStatus.createdAt
                  ? format(new Date(currentStatus.createdAt), "PPp")
                  : ""}
              </p>
            </div>
          </div>
        </div>

        {/* Status Content */}
        <div 
          className="flex-1 flex items-center justify-center p-4 relative"
          onClick={handleNext}
          onContextMenu={(e) => {
            e.preventDefault();
            handlePrevious();
          }}
        >
          {/* Status Progress Bar */}
          <div className="absolute top-0 left-0 right-0 flex space-x-1 px-2 py-2">
            {statusList.map((_, index) => (
              <div
                key={index}
                className={`h-1 flex-1 ${
                  progressBars[index] ? "bg-white" : "bg-white bg-opacity-50"
                }`}
              />
            ))}
          </div>

          {/* Status Image or Text */}
          {currentStatus.imageUrl ? (
            <img
              src={currentStatus.imageUrl}
              alt="Status"
              className="max-h-[80vh] max-w-full rounded-lg"
            />
          ) : (
            <div className="bg-primary p-6 rounded-lg max-w-xs text-center">
              <p className="text-white text-xl font-medium">{currentStatus.content}</p>
            </div>
          )}

          {/* Status Views */}
          <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between p-4">
            <div className="flex items-center bg-black bg-opacity-50 px-3 py-1 rounded-full">
              <Eye className="h-4 w-4 text-white mr-2" />
              <span className="text-white text-sm">{currentStatus.viewCount || 0} views</span>
            </div>
          </div>
        </div>
      </div>

      {/* Status Ad Banner */}
      <div className="bg-white p-4">
        <div className="bg-neutral-light rounded-lg p-3 flex items-center">
          <div className="flex-1">
            <h3 className="font-medium text-text-primary">Advertise your business</h3>
            <p className="text-sm text-text-secondary">Reach 50+ potential customers daily</p>
          </div>
          <Button className="bg-primary text-white">Learn more</Button>
        </div>
      </div>
    </div>
  );
};

export default StatusViewer;
