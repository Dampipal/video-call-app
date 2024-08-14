const socket = io();


socket.on('connect', () => {
    console.log('Connected to server');
})
const startCallButton = document.getElementById('start-call');
const endCallButton = document.getElementById('end-call');
const muteButton = document.getElementById('mute');
const localVideo = document.getElementById('local-video');
const remoteVideo = document.getElementById('remote-video');

const chatBox = document.getElementById('chat-box');
const chatInput = document.getElementById('chat-input');
const sendMessageButton = document.getElementById('send-message');

let localStream;
let peerConnection;
let isMuted = false;
const configuration = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

startCallButton.addEventListener('click', startCall);
endCallButton.addEventListener('click', endCall);
muteButton.addEventListener('click', toggleMute);
sendMessageButton.addEventListener('click', sendMessage);

async function startCall() {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideo.srcObject = localStream;

    peerConnection = new RTCPeerConnection(configuration);
    peerConnection.addStream(localStream);

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('ice-candidate', event.candidate);
        }
    };

    peerConnection.onaddstream = (event) => {
        remoteVideo.srcObject = event.stream;
    };

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit('offer', offer);
}

function endCall() {
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
    }
    localVideo.srcObject = null;
    remoteVideo.srcObject = null;
}

function toggleMute() {
    if (localStream) {
        localStream.getAudioTracks().forEach(track => track.enabled = !track.enabled);
        isMuted = !isMuted;
        muteButton.textContent = isMuted ? 'Unmute' : 'Mute';
    }
}

async function handleOffer(offer) {
    if (!peerConnection) {
        peerConnection = new RTCPeerConnection(configuration);
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('ice-candidate', event.candidate);
            }
        };
        peerConnection.onaddstream = (event) => {
            remoteVideo.srcObject = event.stream;
        };
    }

    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit('answer', answer);
}

socket.on('offer', handleOffer);

socket.on('answer', (answer) => {
    peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
});

socket.on('ice-candidate', (candidate) => {
    peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
});

// Chat functionality
function sendMessage() {
    const message = chatInput.value;
    if (message.trim() !== '') {
        socket.emit('chat-message', { name: 'You', message });
        chatInput.value = '';
        displayMessage('You', message);
    }
}

socket.on('chat-message', ({ name, message }) => {
    displayMessage(name, message);
});

function displayMessage(name, message) {
    const messageElement = document.createElement('div');
    messageElement.textContent = `${name}: ${message}`;
    chatBox.appendChild(messageElement);
    chatBox.scrollTop = chatBox.scrollHeight;
}
