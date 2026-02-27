import React, { useEffect, useRef, useState } from 'react';
import { useGame } from '../context/GameContext';
import { toast } from 'react-hot-toast';
import { Mic, MicOff, Video as VideoIcon, VideoOff } from 'lucide-react';

const VideoChat = () => {
  const { socket, gameState } = useGame();
  const [localStream, setLocalStream] = useState(null);
  const [peers, setPeers] = useState({}); // Map of userId -> RTCPeerConnection
  const [remoteStreams, setRemoteStreams] = useState({}); // Map of userId -> MediaStream
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const localVideoRef = useRef(null);
  const peersRef = useRef({}); // Keep track of peers in ref to avoid stale state in callbacks

  /* Ref for the current stream to ensure callbacks allow access to the latest tracks */
  const streamRef = useRef(null);

  useEffect(() => {
    const initVideo = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setLocalStream(stream);
        streamRef.current = stream;

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Join video room
        socket.emit('join-video', { roomCode: gameState.roomCode, userId: gameState.player._id });

        // Listen for new users
        socket.on('user-connected', async (userId) => {
          console.log('User connected to video:', userId);
          // Use current stream from ref
          const peer = createPeer(userId, gameState.player._id, streamRef.current);
          peersRef.current[userId] = peer;
          setPeers(prev => ({ ...prev, [userId]: peer }));
        });

        // Listen for offers
        socket.on('receive-offer', async ({ offer, from }) => {
          console.log('Received offer from:', from);
          const peer = addPeer(from, gameState.player._id, streamRef.current);
          peersRef.current[from] = peer;
          setPeers(prev => ({ ...prev, [from]: peer }));

          await peer.setRemoteDescription(offer);
          const answer = await peer.createAnswer();
          await peer.setLocalDescription(answer);
          socket.emit('answer', { answer, to: from, from: gameState.player._id });
        });

        // Listen for answers
        socket.on('receive-answer', async ({ answer, from }) => {
          const peer = peersRef.current[from];
          if (peer) {
            await peer.setRemoteDescription(answer);
          }
        });

        // Listen for ICE candidates
        socket.on('receive-ice-candidate', async ({ candidate, from }) => {
          const peer = peersRef.current[from];
          if (peer) {
             try {
               await peer.addIceCandidate(candidate);
             } catch (e) {
               console.warn('Error adding ICE candidate:', e);
             }
          }
        });

        // Listen for user disconnected
        socket.on('user-disconnected', (userId) => {
          console.log('User disconnected from video:', userId);
          if (peersRef.current[userId]) {
            peersRef.current[userId].close();
            delete peersRef.current[userId];
          }
          setPeers(prev => {
             const newPeers = { ...prev };
             delete newPeers[userId];
             return newPeers;
          });
          setRemoteStreams(prev => {
             const newStreams = { ...prev };
             delete newStreams[userId];
             return newStreams;
          });
        });

      } catch (err) {
        console.error('Error accessing media devices:', err);
        toast.error('Could not access camera/microphone');
      }
    };

    if (gameState.roomCode && gameState.player) {
      initVideo();
    }

    return () => {
      // Cleanup
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      Object.values(peersRef.current).forEach(peer => peer.close());
      socket.off('user-connected');
      socket.off('receive-offer');
      socket.off('receive-answer');
      socket.off('receive-ice-candidate');
      socket.off('user-disconnected');
    };
  }, [gameState.roomCode, gameState.player]); // Run once when room/player fits

  const createPeer = (targetId, myId, stream) => {
    const peer = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    if (stream) {
       stream.getTracks().forEach(track => peer.addTrack(track, stream));
    }

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', { candidate: event.candidate, to: targetId, from: myId });
      }
    };

    peer.ontrack = (event) => {
      setRemoteStreams(prev => ({ ...prev, [targetId]: event.streams[0] }));
    };
    
    peer.onnegotiationneeded = async () => {
         try {
             const offer = await peer.createOffer();
             await peer.setLocalDescription(offer);
             socket.emit('offer', { offer, to: targetId, from: myId });
         } catch (err) {
             console.error(err);
         }
    };

    return peer;
  };

  const addPeer = (targetId, myId, stream) => {
    const peer = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    if (stream) {
      stream.getTracks().forEach(track => peer.addTrack(track, stream));
    }

    peer.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('ice-candidate', { candidate: event.candidate, to: targetId, from: myId });
        }
    };
  
    peer.ontrack = (event) => {
        setRemoteStreams(prev => ({ ...prev, [targetId]: event.streams[0] }));
    };

    return peer;
  };

  const toggleMute = () => {
      const stream = streamRef.current;
      if (stream) {
          const audioTrack = stream.getAudioTracks()[0];
          if (audioTrack) {
              audioTrack.enabled = !audioTrack.enabled;
              setIsMuted(!audioTrack.enabled);
          }
      }
  };

  const toggleVideo = () => {
      const stream = streamRef.current;
      if (stream) {
          const videoTrack = stream.getVideoTracks()[0];
          if (videoTrack) {
              videoTrack.enabled = !videoTrack.enabled;
              setIsVideoOff(!videoTrack.enabled);
          }
      }
  };

  const getUsername = (id) => {
      const player = gameState.players.find(p => p._id === id);
      return player ? player.username : 'Unknown';
  };

  return (
    <div className="w-full max-w-4xl mx-auto mb-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          
          {/* Local Video */}
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden shadow-lg border-2 border-green-500">
            <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1]" />
            <div className="absolute bottom-2 left-2 text-sm text-white bg-black bg-opacity-60 px-2 py-1 rounded">
                {gameState.player?.username || 'You'} (Me)
            </div>
            <div className="absolute top-2 right-2 flex flex-col gap-2">
                <button 
                    onClick={toggleMute} 
                    className={`p-2 rounded-full ${isMuted ? 'bg-red-500' : 'bg-gray-700 hover:bg-gray-600'} transition`}
                    title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
                >
                    {isMuted ? (
                        <MicOff className="w-5 h-5 text-white" />
                    ) : (
                        <Mic className="w-5 h-5 text-white" />
                    )}
                </button>
                <button 
                    onClick={toggleVideo} 
                    className={`p-2 rounded-full ${isVideoOff ? 'bg-red-500' : 'bg-gray-700 hover:bg-gray-600'} transition`}
                    title={isVideoOff ? "Turn On Camera" : "Turn Off Camera"}
                >
                    {isVideoOff ? (
                        <VideoOff className="w-5 h-5 text-white" />
                    ) : (
                        <VideoIcon className="w-5 h-5 text-white" />
                    )}
                </button>
            </div>
          </div>

          {/* Remote Videos */}
          {Object.keys(remoteStreams).map(peerId => (
            <VideoPlayer 
                key={peerId} 
                stream={remoteStreams[peerId]} 
                username={getUsername(peerId)} 
            />
          ))}

          {/* Placeholders if needed to fill 4 spots? 
              Users might not be connected yet. 
              Let's show placeholders for other players in the room who aren't connected?
          */}
          {gameState.players
             .filter(p => p._id !== gameState.player._id && !remoteStreams[p._id])
             .map(p => (
                 <div key={p._id} className="relative aspect-video bg-gray-800 rounded-lg overflow-hidden shadow-lg border border-gray-700 flex items-center justify-center">
                    <div className="text-center">
                        <div className="w-12 h-12 bg-gray-700 rounded-full mx-auto mb-2 flex items-center justify-center animate-pulse">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-gray-400">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                            </svg>
                        </div>
                        <p className="text-gray-400 text-sm">Waiting for video...</p>
                        <p className="text-white font-bold">{p.username}</p>
                    </div>
                 </div>
             ))
          }
      </div>
    </div>
  );
};

const VideoPlayer = ({ stream, username }) => {
    const ref = useRef();
    useEffect(() => {
        if (ref.current) ref.current.srcObject = stream;
    }, [stream]);

    return (
        <div className="relative aspect-video bg-black rounded-lg overflow-hidden shadow-lg border border-gray-600">
           <video ref={ref} autoPlay playsInline className="w-full h-full object-cover" />
           <div className="absolute bottom-2 left-2 text-sm text-white bg-black bg-opacity-60 px-2 py-1 rounded">
               {username}
           </div>
        </div>
    );
};

export default VideoChat;
