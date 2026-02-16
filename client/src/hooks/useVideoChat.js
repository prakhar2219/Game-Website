import { useEffect, useRef, useState } from 'react';
import { useGame } from '../context/GameContext';
import { toast } from 'react-hot-toast';

const useVideoChat = () => {
  const { socket, gameState } = useGame();
  const [localStream, setLocalStream] = useState(null);
  const [peers, setPeers] = useState({}); // Map of userId -> RTCPeerConnection
  const [remoteStreams, setRemoteStreams] = useState({}); // Map of userId -> MediaStream
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [audioDevices, setAudioDevices] = useState([]);
  const [selectedAudioId, setSelectedAudioId] = useState('');

  const peersRef = useRef({}); // Keep track of peers in ref to avoid stale state in callbacks
  const streamRef = useRef(null);

  useEffect(() => {
    const initVideo = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setLocalStream(stream);
        streamRef.current = stream;

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
  }, [gameState.roomCode, gameState.player]);

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

  const handleAudioChange = async (deviceId) => {
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
              
              setLocalStream(streamRef.current); 

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

  return {
    localStream,
    remoteStreams,
    isMuted,
    isVideoOff,
    toggleMute,
    toggleVideo,
    audioDevices,
    selectedAudioId,
    handleAudioChange
  };
};

export default useVideoChat;
