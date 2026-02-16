import React, { useEffect, useRef, useState } from 'react';
import { useGame } from '../context/GameContext';
import { toast } from 'react-hot-toast';

const VideoChat = () => {
  const { socket, gameState } = useGame();
  const [localStream, setLocalStream] = useState(null);
  const [peers, setPeers] = useState({}); // Map of userId -> RTCPeerConnection
  const [remoteStreams, setRemoteStreams] = useState({}); // Map of userId -> MediaStream
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [audioDevices, setAudioDevices] = useState([]);
  const [selectedAudioId, setSelectedAudioId] = useState('');

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

        // Get Audio Devices
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter(device => device.kind === 'audioinput');
        setAudioDevices(audioInputs);
        const currentAudioTrack = stream.getAudioTracks()[0];
        if (currentAudioTrack) {
            const settings = currentAudioTrack.getSettings();
            setSelectedAudioId(settings.deviceId);
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

  const handleAudioChange = async (e) => {
      const deviceId = e.target.value;
      if (deviceId === selectedAudioId) return;

      try {
          const newStream = await navigator.mediaDevices.getUserMedia({ 
              audio: { deviceId: { exact: deviceId } },
              video: false
          });
          const newAudioTrack = newStream.getAudioTracks()[0];

          if (streamRef.current) {
              const oldAudioTrack = streamRef.current.getAudioTracks()[0];
              if (oldAudioTrack) {
                  oldAudioTrack.stop();
                  streamRef.current.removeTrack(oldAudioTrack);
              }
              streamRef.current.addTrack(newAudioTrack);
              
              // Sync mute state
              newAudioTrack.enabled = !isMuted;
              
              setLocalStream(streamRef.current); // Update state to trigger re-renders if needed

              // Replace track in all peer connections
              Object.values(peersRef.current).forEach(peer => {
                  const sender = peer.getSenders().find(s => s.track && s.track.kind === 'audio');
                  if (sender) {
                      sender.replaceTrack(newAudioTrack);
                  }
              });
          }
          setSelectedAudioId(deviceId);
      } catch (err) {
          console.error('Error switching microphone:', err);
          toast.error('Failed to switch microphone');
      }
  };

  const getUsername = (id) => {
      const player = gameState.players.find(p => p._id === id);
      return player ? player.username : 'Unknown';
  };

  return (
    <div className="w-full max-w-4xl mx-auto mb-8">
      <div className="flex justify-between items-center mb-4 px-4">
        <h3 className="text-xl text-center flex-grow">Video Chat</h3>
        <select 
            className="bg-gray-700 text-white text-sm p-2 rounded border border-gray-600 max-w-[200px]"
            value={selectedAudioId}
            onChange={handleAudioChange}
            title="Select Microphone"
        >
            {audioDevices.map(device => (
                <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Microphone ${device.deviceId.slice(0,5)}...`}
                </option>
            ))}
        </select>
      </div>
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
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                        </svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                        </svg>
                    )}
                </button>
                <button 
                    onClick={toggleVideo} 
                    className={`p-2 rounded-full ${isVideoOff ? 'bg-red-500' : 'bg-gray-700 hover:bg-gray-600'} transition`}
                    title={isVideoOff ? "Turn On Camera" : "Turn Off Camera"}
                >
                    {isVideoOff ? (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                             <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                        </svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                        </svg>
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
