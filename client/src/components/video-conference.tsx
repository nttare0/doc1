import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Mic, 
  MicOff, 
  Video as VideoIcon, 
  VideoOff, 
  Monitor, 
  MessageSquare, 
  Phone,
  PhoneOff,
  X,
  Users,
  Copy,
  Shield
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface VideoConferenceProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Participant {
  id: string;
  name: string;
  initials: string;
  isHost: boolean;
  micEnabled: boolean;
  videoEnabled: boolean;
  color: string;
}

export function VideoConference({ open, onOpenChange }: VideoConferenceProps) {
  const [duration, setDuration] = useState(0);
  const [isRecording] = useState(true);
  const [localMicEnabled, setLocalMicEnabled] = useState(true);
  const [localVideoEnabled, setLocalVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const { toast } = useToast();

  // Mock participants data
  const [participants] = useState<Participant[]>([
    { id: '1', name: 'John Doe', initials: 'JD', isHost: true, micEnabled: true, videoEnabled: true, color: 'bg-zeolf-blue' },
    { id: '2', name: 'Sarah Miller', initials: 'SM', isHost: false, micEnabled: true, videoEnabled: false, color: 'bg-zeolf-accent' },
    { id: '3', name: 'Robert Johnson', initials: 'RJ', isHost: false, micEnabled: false, videoEnabled: true, color: 'bg-zeolf-success' },
    { id: '4', name: 'Lisa Wang', initials: 'LW', isHost: false, micEnabled: true, videoEnabled: true, color: 'bg-zeolf-warning' },
  ]);

  const meetingId = "123-456-789";

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (open) {
      interval = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [open]);

  // Reset timer when modal closes
  useEffect(() => {
    if (!open) {
      setDuration(0);
    }
  }, [open]);

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleToggleMic = () => {
    setLocalMicEnabled(!localMicEnabled);
    toast({
      title: localMicEnabled ? "Microphone muted" : "Microphone unmuted",
    });
  };

  const handleToggleVideo = () => {
    setLocalVideoEnabled(!localVideoEnabled);
    toast({
      title: localVideoEnabled ? "Camera turned off" : "Camera turned on",
    });
  };

  const handleToggleScreenShare = () => {
    setIsScreenSharing(!isScreenSharing);
    toast({
      title: isScreenSharing ? "Screen sharing stopped" : "Screen sharing started",
    });
  };

  const handleCopyMeetingLink = () => {
    const meetingLink = `https://zeolf-dms.com/meeting/${meetingId}`;
    navigator.clipboard.writeText(meetingLink);
    toast({
      title: "Meeting link copied",
      description: "Share this link with other participants",
    });
  };

  const handleEndCall = () => {
    onOpenChange(false);
    toast({
      title: "Meeting ended",
      description: "You have left the meeting",
    });
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-full max-h-full w-screen h-screen p-0 bg-black">
        <div className="flex flex-col h-full" data-testid="video-conference">
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-black/50 text-white">
            <div className="flex items-center space-x-4">
              <h3 className="font-medium">ZEOLF Team Meeting</h3>
              <span className="text-sm text-gray-300">{formatDuration(duration)}</span>
              {isRecording && (
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-sm">Recording</span>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:text-gray-300"
                data-testid="button-participants"
              >
                <Users className="w-4 h-4 mr-2" />
                <span>{participants.length} participants</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="text-white hover:text-gray-300"
                data-testid="button-close-meeting"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Video Grid */}
          <div className="flex-1 p-4">
            <div className="grid grid-cols-2 lg:grid-cols-2 gap-4 h-full">
              {participants.map((participant, index) => (
                <div 
                  key={participant.id} 
                  className="relative bg-gray-900 rounded-lg overflow-hidden"
                  data-testid={`participant-${participant.id}`}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-white">
                      <div className={`w-${index === 0 ? '20' : '16'} h-${index === 0 ? '20' : '16'} ${participant.color} rounded-full flex items-center justify-center mx-auto mb-${index === 0 ? '4' : '3'}`}>
                        <span className={`${index === 0 ? 'text-2xl' : 'text-lg'} font-medium`}>
                          {participant.initials}
                        </span>
                      </div>
                      <p className="font-medium">{participant.name}</p>
                      {participant.isHost && (
                        <Badge variant="secondary" className="text-xs mt-1">
                          Host
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  {/* Participant Controls Indicator */}
                  <div className="absolute bottom-4 left-4 flex items-center space-x-2">
                    {participant.micEnabled ? (
                      <Mic className="w-4 h-4 text-white" />
                    ) : (
                      <MicOff className="w-4 h-4 text-red-500" />
                    )}
                    {participant.videoEnabled ? (
                      <VideoIcon className="w-4 h-4 text-white" />
                    ) : (
                      <VideoOff className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Controls */}
          <div className="bg-black/50 p-4">
            <div className="flex items-center justify-center space-x-6 mb-4">
              <Button
                variant={localMicEnabled ? "secondary" : "destructive"}
                size="lg"
                className="w-12 h-12 rounded-full"
                onClick={handleToggleMic}
                data-testid="button-toggle-mic"
              >
                {localMicEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </Button>

              <Button
                variant={localVideoEnabled ? "secondary" : "destructive"}
                size="lg"
                className="w-12 h-12 rounded-full"
                onClick={handleToggleVideo}
                data-testid="button-toggle-video"
              >
                {localVideoEnabled ? <VideoIcon className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </Button>

              <Button
                variant={isScreenSharing ? "default" : "secondary"}
                size="lg"
                className="w-12 h-12 rounded-full bg-zeolf-blue hover:bg-zeolf-blue-dark"
                onClick={handleToggleScreenShare}
                data-testid="button-screen-share"
              >
                <Monitor className="w-5 h-5" />
              </Button>

              <Button
                variant="secondary"
                size="lg"
                className="w-12 h-12 rounded-full"
                data-testid="button-chat"
              >
                <MessageSquare className="w-5 h-5" />
              </Button>

              <Button
                variant="destructive"
                size="lg"
                className="w-12 h-12 rounded-full"
                onClick={handleEndCall}
                data-testid="button-end-call"
              >
                <PhoneOff className="w-5 h-5" />
              </Button>
            </div>

            <div className="flex items-center justify-between text-white text-sm">
              <div className="flex items-center space-x-4">
                <span>Meeting ID: {meetingId}</span>
                <Button
                  variant="link"
                  size="sm"
                  className="text-zeolf-accent hover:text-blue-300 p-0 h-auto"
                  onClick={handleCopyMeetingLink}
                  data-testid="button-copy-link"
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Copy Link
                </Button>
              </div>
              <div className="flex items-center space-x-2 text-gray-300">
                <Shield className="w-4 h-4" />
                <span>End-to-end encrypted</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
