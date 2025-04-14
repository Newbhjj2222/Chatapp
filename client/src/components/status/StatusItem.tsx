import { Status } from "../../types";
import { format, isToday } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useQueryClient } from "@tanstack/react-query";

interface StatusItemProps {
  status: Status;
  onClick: () => void;
}

export default function StatusItem({ status, onClick }: StatusItemProps) {
  const queryClient = useQueryClient();
  
  const handleClick = async () => {
    // Mark status as viewed when clicked
    try {
      await apiRequest("POST", `/api/statuses/${status.id}/view`, {});
      // Invalidate statuses to update view count
      queryClient.invalidateQueries({ queryKey: ["/api/statuses"] });
    } catch (error) {
      console.error("Error marking status as viewed:", error);
    }
    
    onClick();
  };
  
  const displayTime = () => {
    const statusDate = new Date(status.timestamp);
    if (isToday(statusDate)) {
      return format(statusDate, "h:mm a");
    }
    return format(statusDate, "MMM d, h:mm a");
  };
  
  const isFresh = () => {
    const statusTime = new Date(status.timestamp).getTime();
    const currentTime = new Date().getTime();
    const hoursDiff = (currentTime - statusTime) / (1000 * 60 * 60);
    return hoursDiff < 24;
  };

  return (
    <div 
      className="flex items-center p-2 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors mb-2"
      onClick={handleClick}
    >
      <div className="relative">
        <div className={`w-14 h-14 rounded-full border-2 ${isFresh() ? "border-primary" : "border-gray-300"} p-1`}>
          <img 
            src={status.user?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(status.user?.displayName || "User")}`} 
            alt="Profile" 
            className="w-full h-full rounded-full object-cover"
          />
        </div>
      </div>
      <div className="ml-3">
        <h4 className="font-medium">{status.user?.displayName || "User"}</h4>
        <p className="text-xs text-gray-500">{displayTime()}</p>
        {status.viewCount > 0 && (
          <p className="text-xs text-gray-400">{status.viewCount} views</p>
        )}
      </div>
    </div>
  );
}
