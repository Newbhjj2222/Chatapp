import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { Status } from "../../types";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import StatusItem from "./StatusItem";
import { Card, CardContent } from "@/components/ui/card";

interface StatusViewProps {
  statuses: Status[];
  onBackClick: () => void;
}

export default function StatusView({ statuses, onBackClick }: StatusViewProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState<Status | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [statusText, setStatusText] = useState("");
  
  const { data: currentUser } = useQuery({
    queryKey: ["/api/users/me"],
  });

  const myStatuses = statuses.filter(
    (status) => status.userId === currentUser?.id
  );
  
  const otherStatuses = statuses.filter(
    (status) => status.userId !== currentUser?.id
  );

  // Create status mutation
  const createStatusMutation = useMutation({
    mutationFn: (newStatus: {
      type: "text" | "image";
      content: string;
    }) => apiRequest("POST", "/api/statuses", newStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/statuses"] });
      toast({
        title: "Status created",
        description: "Your status has been posted successfully",
      });
      setFile(null);
      setStatusText("");
    },
  });

  // File selection handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  // Create status
  const handleCreateStatus = async () => {
    if (!file && !statusText) {
      toast({
        title: "Error",
        description: "Please select an image or enter some text",
        variant: "destructive",
      });
      return;
    }

    try {
      if (file) {
        // Upload image first
        const formData = new FormData();
        formData.append("image", file);

        const response = await fetch("/api/upload/status-image", {
          method: "POST",
          body: formData,
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Failed to upload image");
        }

        const { imageUrl } = await response.json();

        // Create status with image URL
        await createStatusMutation.mutateAsync({
          type: "image",
          content: imageUrl,
        });
      } else if (statusText) {
        // Create text status
        await createStatusMutation.mutateAsync({
          type: "text",
          content: statusText,
        });
      }
    } catch (error) {
      console.error("Error creating status:", error);
      toast({
        title: "Error",
        description: "Failed to create status",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
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
          <h2 className="font-medium text-lg">Status Updates</h2>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-primary"
          aria-label="New status"
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
              d="M12 4v16m8-8H4"
            />
          </svg>
        </Button>
      </div>

      {/* Status list */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Your status */}
        <div className="mb-6">
          <h3 className="text-sm text-gray-500 mb-2">Your status</h3>
          <div className="flex items-center p-2 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors">
            <div className="relative">
              <img
                src={currentUser?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.displayName || "User")}`}
                alt="Your profile"
                className="w-14 h-14 rounded-full object-cover border-2 border-primary"
              />
              <label className="absolute bottom-0 right-0 bg-primary text-white rounded-full p-1 shadow-sm cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </label>
            </div>
            <div className="ml-3">
              <h4 className="font-medium">My Status</h4>
              <p className="text-xs text-gray-500">
                {myStatuses.length > 0
                  ? `${myStatuses.length} recent updates`
                  : "Tap to add status update"}
              </p>
            </div>
          </div>

          {/* Status creation form */}
          {(file || statusText) && (
            <div className="mt-2 p-3 bg-white rounded-lg shadow-sm">
              {file && (
                <div className="mb-2 relative">
                  <img
                    src={URL.createObjectURL(file)}
                    alt="Status preview"
                    className="w-full h-auto rounded-lg"
                  />
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute top-2 right-2 bg-gray-800/50 hover:bg-gray-800/70 text-white rounded-full h-8 w-8"
                    onClick={() => setFile(null)}
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
              )}
              <div className="mb-2">
                <input
                  type="text"
                  value={statusText}
                  onChange={(e) => setStatusText(e.target.value)}
                  placeholder="Add a caption..."
                  className="w-full p-2 bg-gray-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={handleCreateStatus}
                  disabled={createStatusMutation.isPending}
                  className="bg-primary hover:bg-primary/90"
                >
                  {createStatusMutation.isPending ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Posting...</span>
                    </div>
                  ) : (
                    "Post Status"
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Banner ad in status */}
        <div className="mb-6 bg-white rounded-lg shadow-md overflow-hidden">
          <div className="bg-primary text-white text-xs px-3 py-1">SPONSORED</div>
          <div className="p-3">
            <img
              src="https://images.unsplash.com/photo-1563986768494-4dee2763ff3f?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80"
              alt="Advertisement"
              className="w-full h-40 object-cover rounded-lg"
            />
            <h3 className="font-medium mt-2">Upgrade your conversations with NetChat Pro</h3>
            <p className="text-sm text-gray-500 mb-2">Get extra features and remove ads.</p>
            <div className="flex justify-between items-center">
              <Button className="bg-primary hover:bg-primary/90">Learn More</Button>
              <span className="text-xs text-gray-500">Ad views: 245</span>
            </div>
          </div>
        </div>

        {/* Recent updates */}
        {otherStatuses.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm text-gray-500 mb-2">Recent updates</h3>
            {otherStatuses.map((status) => (
              <StatusItem
                key={status.id}
                status={status}
                onClick={() => setSelectedStatus(status)}
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {otherStatuses.length === 0 && (
          <Card className="mb-4">
            <CardContent className="pt-6">
              <div className="text-center">
                <h3 className="font-medium text-gray-900 mb-2">No recent updates</h3>
                <p className="text-sm text-gray-500">
                  When your contacts post status updates, you'll see them here.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
