import { Chat, Message, Status, User } from "../types";

/**
 * Compresses an image before upload
 * @param file Image file to compress
 * @param maxWidth Maximum width in pixels
 * @param maxHeight Maximum height in pixels
 * @param quality Compression quality (0-1)
 * @returns Promise with compressed file
 */
export const compressImage = (
  file: File,
  maxWidth: number = 1200,
  maxHeight: number = 1200,
  quality: number = 0.7
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        // Calculate new dimensions
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        
        // Create canvas and draw image
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        
        if (!ctx) {
          reject(new Error("Failed to get canvas context"));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        // Get compressed image blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Failed to compress image"));
            }
          },
          file.type,
          quality
        );
      };
      
      img.onerror = () => {
        reject(new Error("Failed to load image"));
      };
      
      if (typeof readerEvent.target?.result === "string") {
        img.src = readerEvent.target.result;
      } else {
        reject(new Error("Failed to read file"));
      }
    };
    
    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };
    
    reader.readAsDataURL(file);
  });
};

/**
 * Formats a message timestamp based on current date
 * @param timestamp Message timestamp
 * @returns Formatted time string
 */
export const formatMessageTime = (timestamp: string | Date): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    // Today - show time
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date);
  } else if (diffDays === 1) {
    // Yesterday
    return 'Yesterday';
  } else if (diffDays < 7) {
    // Within a week - show day name
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long'
    }).format(date);
  } else {
    // Older - show date
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric'
    }).format(date);
  }
};

/**
 * Group chat members by first letter of their name
 * @param members List of chat members
 * @returns Object with members grouped by first letter
 */
export const groupMembersByFirstLetter = (members: User[]): Record<string, User[]> => {
  const grouped: Record<string, User[]> = {};
  
  members.forEach(member => {
    if (!member.displayName) return;
    
    const firstLetter = member.displayName.charAt(0).toUpperCase();
    if (!grouped[firstLetter]) {
      grouped[firstLetter] = [];
    }
    
    grouped[firstLetter].push(member);
  });
  
  // Sort each group alphabetically
  Object.keys(grouped).forEach(key => {
    grouped[key].sort((a, b) => 
      a.displayName.localeCompare(b.displayName)
    );
  });
  
  return grouped;
};
