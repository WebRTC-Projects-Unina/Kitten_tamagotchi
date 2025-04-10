
// Inizializzazione socket e variabili globali
const socket = io();
let username = "";
let userColor = "";
let isPlay = false;
let raceScore = 0;
let raceTimer;
let isRacing = false;
let gameScore = 0;
let gameTimer;
let onlineUsers = [];
let scores = [];

let localStream;
const peers = {}; // Memorizza le connessioni peer, indicizzate per socket id
const config = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' }
  ]
};



// Gestione del login
document.getElementById('login-button').addEventListener('click', () => {
  // Recupera i dati inseriti
  const username = document.getElementById('username-input').value;
  const color = document.getElementById('color-input').value;
  
  if (!username) {
    alert("Per favore, inserisci un nome!");
    return;
  }
  

});

// Gestione del logout
document.getElementById('logout-button').addEventListener('click', () => {
socket.disconnect();
window.location.href='index.html';

  
 
});



const catImg = document.getElementById("cat");
const runner = document.getElementById("runner");
const racePopup = document.getElementById("race-popup");
const raceScoreDisplay = document.getElementById("race-score");
const gamePopup = document.getElementById("game-popup");
const gameArea = document.getElementById("game-area");
const scoreDisplay = document.getElementById("game-score");

// Frame per le animazioni del gattino
const normalFrames = ["norm1.png", "norm2.png", "norm3.png"];
const hungryFrames = ["fame1.png", "fame2.png"];
const eatingFrames = ["mangia1.png", "mangia2.png"];
const sleepyFrames = ["sonno1.png", "sonno2.png"];
const sleepingFrames = ["dorme1.png", "dorme2.png", "dorme3.png"];
const thirstyFrames = ["sete1.png", "sete2.png"];
const drinkingFrames = ["beve1.png", "beve2.png"];
const playFrames = ["noia0.png", "noia1.png", "noia2.png"];
const gioiosoFrames = ["gioioso1.png", "gioioso2.png"];
const outdoorFrames = ["fuori1.png", "fuori2.png"];
let currentFrames = normalFrames;
let frameIndex = 0;
let animationInterval;

// Funzione per animare il gattino

function startAnimation(frames, fps = 3) {
  clearInterval(animationInterval);
  currentFrames = frames;
  frameIndex = 0;
  animationInterval = setInterval(() => {
    catImg.src = currentFrames[frameIndex];
    frameIndex = (frameIndex + 1) % currentFrames.length;
  }, 1000 / fps);
}

// Funzioni per il gioco e la corsa
window.feedCat = function () {
  socket.emit("respond need", { user: username, type: "food" });
};

window.sleepCat = function () {
  socket.emit("respond need", { user: username, type: "sleep" });
};

window.waterCat = function () {
  socket.emit("respond need", { user: username, type: "thirst" });
};

//GIOCO ACCHIAPPA IL TOPINO

window.startGame = function () {
  if (!isPlay) return;
  gamePopup.style.display = "flex";
  gameScore = 0;
  scoreDisplay.textContent = "Punteggio: 0";
  gameArea.innerHTML = "";
  gameTimer = setInterval(() => {
    const mouse = document.createElement("div");
    mouse.className = "mouse";
    mouse.style.top = Math.random() * 250 + "px";
    mouse.style.left = Math.random() * 250 + "px";
    mouse.onclick = () => {
      gameScore++;
      scoreDisplay.textContent = `Punteggio: ${gameScore}`;
      mouse.remove();
    };
    gameArea.appendChild(mouse);
    setTimeout(() => mouse.remove(), 1000);
  }, 500);
  setTimeout(() => {
    clearInterval(gameTimer);
    gamePopup.style.display = "none";
    // Invia il punteggio del gioco al server; il server dovrà sommare questi punti alla classifica dell'utente.
    socket.emit("respond need", { user: username, type: "play", points: gameScore });
  }, 10000);
};

window.closeGame = function () {
  gamePopup.style.display = "none";
  clearInterval(gameTimer);
};

//GIOCO CORSA MARSHALL

window.startRace = function () {
  isRacing = true;
  raceScore = 0;
  raceScoreDisplay.textContent = "Distanza: 0";
  racePopup.style.display = "flex";
  let toggle = true;
  const immagini = ["correndo1.png", "correndo2.png", "correndo3.png", "correndo4.png"];
  let indiceCorrente = 0;
  document.onkeydown = function (e) {
    if (e.key === "ArrowRight" && isRacing) {
      raceScore++;
      raceScoreDisplay.textContent = `Distanza: ${raceScore}`;

      // Imposta l'immagine corrente e aggiorna l'indice
      runner.src = immagini[indiceCorrente];
      indiceCorrente = (indiceCorrente + 1) % immagini.length;
    }
  };
  raceTimer = setTimeout(() => {
    isRacing = false;
    document.onkeydown = null;
    racePopup.style.display = "none";
    // Calcola il punteggio: distanza divisa per 10, approssimato per difetto.
    const racePoints = Math.floor(raceScore / 10);
    // Invia il punteggio della corsa al server, da sommare alla classifica.
    socket.emit("respond need", { user: username, type: "air", points: racePoints });
  }, 10000);
};

window.closeRace = function () {
  isRacing = false;
  document.onkeydown = null;
  clearTimeout(raceTimer);
  racePopup.style.display = "none";
};

// Gestione delle notifiche per i bisogni
socket.on("trigger need", (type) => {
  if (type === "food") {
    document.getElementById("message").textContent = "Marshall ha fame!";
    startAnimation(hungryFrames, 2);
  } else if (type === "sleep") {
    document.getElementById("message").textContent = "Marshall ha sonno!";
    startAnimation(sleepyFrames, 2);
  } else if (type === "thirst") {
    document.getElementById("message").textContent = "Marshall ha sete!";
    startAnimation(thirstyFrames, 2);
  } else if (type === "air") {
    document.getElementById("message").textContent = "Marshall vuole uscire all'aria aperta!";
    startAnimation(outdoorFrames, 2);
  } else if (type === "play") {
    isPlay = true;
    document.getElementById("message").textContent = "Marshall vuole giocare!";
    startAnimation(playFrames, 2);
  }
});

socket.on("resolve need", ({ type, firstUser }) => {
  if (type === "food") {
    document.getElementById("message").textContent = `Marshall sta mangiando grazie a ${firstUser}!`;
    startAnimation(eatingFrames);
   //setTimeout(() => {
     // document.getElementById("message").textContent = `Marshall è felice grazie a ${firstUser}!`;
    //  startAnimation(normalFrames);
  //  }, 10000);
  } else if (type === "sleep") {
    document.getElementById("message").textContent = `Marshall sta dormendo grazie a ${firstUser}!`;
    startAnimation(sleepingFrames);
   // setTimeout(() => {
    //  document.getElementById("message").textContent = `Marshall è felice grazie a ${firstUser}!`;
     // startAnimation(normalFrames);
  //  }, 20000);
  } else if (type === "thirst") {
    document.getElementById("message").textContent = `Marshall sta bevendo grazie a ${firstUser}!`;
    startAnimation(drinkingFrames);
  /*  setTimeout(() => {
      document.getElementById("message").textContent = `Marshall è felice grazie a ${firstUser}!`;
      startAnimation(normalFrames);
    }, 10000);*/
  } else if (type === "air") {
    document.getElementById("message").textContent = `Marshall ha fatto una passeggiata grazie a ${firstUser}!`;
    startAnimation(normalFrames);
  /*  setTimeout(() => {
      document.getElementById("message").textContent = `Marshall è felice grazie a ${firstUser}!`;
      startAnimation(normalFrames);
    }, 10000);*/
  } else if (type === "play") {
    isPlay = false;
    document.getElementById("message").textContent = `Marshall ha giocato grazie a ${firstUser}!`;
   /* startAnimation(gioiosoFrames);
    setTimeout(() => {
      document.getElementById("message").textContent = `Marshall è felice grazie a ${firstUser}!`;
      startAnimation(normalFrames);
    }, 10000);*/
  }
});

// Funzionalità chat e login
function startChat() {
  const input = document.getElementById("username-input");
  const colorPicker = document.getElementById("color-input");
  if (input.value.trim()) {
    username = input.value.trim();
    userColor = colorPicker.value;
    document.getElementById("login-screen").style.display = "none";
    socket.emit("new user", { user: username, color: userColor });
    socket.emit("request previous messages");
    startAnimation(normalFrames);
  }
}
document.getElementById("login-button").addEventListener("click", startChat);

const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const messages = document.getElementById("messages");


chatForm.addEventListener("submit", function (e) {
  e.preventDefault();
  if (chatInput.value) {
    socket.emit("chat message", { user: username, color: userColor, text: chatInput.value });
    chatInput.value = "";
  }
});

socket.on("chat message", function (data) {
  const li = document.createElement("li");
  li.classList.add("chat-message");
  li.classList.add(data.user === username ? "own-message" : "other-message");
  li.innerHTML = `<strong style="color:${data.color}">${data.user}</strong>: ${data.text}`;
  messages.appendChild(li);
  messages.scrollTop = messages.scrollHeight;
});

socket.on("previous messages", function (chatHistory) {
  chatHistory.forEach((data) => {
    const li = document.createElement("li");
    li.classList.add("chat-message");
    li.classList.add(data.user === username ? "own-message" : "other-message");
    li.innerHTML = `<strong style="color:${data.color}">${data.user}</strong>: ${data.text}`;
    messages.appendChild(li);
  });
  messages.scrollTop = messages.scrollHeight;
});

socket.on("update users", function (users) {
  onlineUsers=users;
  console.log("onlineUsers:", onlineUsers);
  const userList = users.map((u) => `<li style='color:${u.color}'>${u.user}</li>`).join("");

  document.getElementById("user-list").innerHTML = userList;
});

socket.on("update scores", function (Serverscores) {
  scores=Serverscores;
  console.log("scores:", scores); 
  const list = Serverscores.map((s) => `<li>${s.user}: ${s.points} punti</li>`).join("");
  document.getElementById("score-list").innerHTML = list;
  // Mostra il pulsante di sfida se raggiungi i 10 punti
  const myScore = Serverscores.find((s) => s.user === username);
  if (myScore && myScore.points >= 10) {
   
    document.getElementById("tris").style.display = "block";

  }

  // Mostra il pulsante di videochiamta se raggiungi i 15 punti
  if (myScore && myScore.points >= 15){
    document.getElementById("video-call-btn").style.display = "block";
  }
});


//TRIS
document.getElementById("tris").addEventListener("click", () => {
  console.log("Pulsante sfida premuto.");
  console.log("onlineUsers in click:", onlineUsers);
  console.log("scores in click:", scores);
  
  // Filtra gli utenti idonei (almeno 10 punti e non te stesso)
  let sfidabili = onlineUsers.filter(u => {
    if (u.user === username) return false;
    const s = scores.find(sc => sc.user === u.user);
    console.log(`Verifica utente ${u.user}: punti = ${s ? s.points : 0}`);
    return s && s.points >= 10;
  });
  console.log("Utenti sfidabili:", sfidabili);
  
  if (sfidabili.length === 0) {
    alert("Non ci sono altri utenti idonei a giocare online!");
    return;
  }
  
  // Prepara la lista per il prompt
  let listString = "Scegli l'utente da sfidare (digita il nome esatto):\n";
  sfidabili.forEach((u) => {
    listString += `${u.user}\n`;
  });
  console.log("Lista utenti sfidabili da mostrare nel prompt:", listString);
  
  // Richiedi la scelta tramite prompt
  const rawScelta = prompt(listString);
  if (rawScelta === null) {
    console.log("Prompt annullato dall'utente.");
    return;
  }
  const scelta = rawScelta.trim();
  console.log("Scelta inserita:", scelta);
  
  // Cerca l'utente corrispondente nella lista degli sfidabili
  const target = sfidabili.find(u => u.user.toLowerCase() === scelta.toLowerCase());
  if (!target) {
    console.log("Nome non trovato tra gli sfidabili. Scelta non valida.");
    alert("Scelta non valida.");
    return;
  }
  
  console.log("Sfida inviata a:", target.user);
  // Inviaamo il nome dell'utente target
  socket.emit("challenge request", { targetUser: target.user });
});
// Listener per ricevere la sfida
socket.on("challenge incoming", (data) => {
  console.log("Ricevuto evento challenge incoming:", data);
  const accept = confirm(`Hai ricevuto una sfida da ${data.challengerName}. Accetti?`);
  console.log("Risposta alla sfida:", accept);
  socket.emit("challenge response", { challengerId: data.challengerId, accepted: accept });
});




// Inizializzazione della partita (tris)
socket.on("challenge start", (data) => {
  // data: { roomId, players }
  // Mostra la UI del tris (ad esempio un popup o una sezione dedicata) e inizializza il gioco
  // Salva la roomId per inviare le mosse
  console.log("challenge start event received:", data);
  startTicTacToeGame(data.roomId, data.players);
  
});


// Funzione per inviare una mossa
function sendTicTacToeMove(roomId, move) {
  // move: ad esempio { cell: 3, player: username }
  socket.emit("tic tac toe move", { roomId, move });
}

// --- IMPLEMENTAZIONE DI BASE DEL TRIS ---
// Le funzioni startTicTacToeGame e updateTicTacToeBoard sono esempi basilari.
// Dovrai implementare la logica completa del tris (gestione turno, controllo vincitore, ecc.)

function startTicTacToeGame(roomId, players) {
  document.getElementById("ticTacToe-popup").style.display = "block";
  console.log("inizio");
  window.currentGameRoom = roomId;
  window.ticTacToeBoard = Array(9).fill(null);
  window.currentTurn = players[0];
  renderTicTacToeBoard();
}



function updateTicTacToeBoard(move) {
  // Aggiorna la cella in base alla mossa ricevuta
  window.ticTacToeBoard[move.cell] = move.player;
  // Cambia turno (semplificato)
  window.currentTurn = username;
  renderTicTacToeBoard();
}


// Funzione per controllare se c'è un vincitore
function checkWinner(board) {
  const winningLines = [
    [0, 1, 2], // righe
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6], // colonne
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8], // diagonali
    [2, 4, 6]
  ];

  for (const [a, b, c] of winningLines) {
    if (board[a] && board[a] === board[b] && board[b] === board[c]) {
      return board[a]; // restituisce iusername vincente
    }
  }
  return null;
}

// Funzione per controllare lo stato della partita (vittoria o pareggio)
function checkGameStatus() {
  const winner = checkWinner(window.ticTacToeBoard);
  if (winner) {
    // Mostra un alert e un messaggio sullo schermo
    alert(winner + " ha vinto, partita conclusa!");
    document.getElementById("ticTacToe-message").innerText = winner + " ha vinto, partita conclusa!";
    endTicTacToeGame();
  } else {
    // Controlla se tutte le celle sono piene => pareggio
    const isDraw = window.ticTacToeBoard.every(cell => cell !== null);
    if (isDraw) {
      alert("Pareggio, partita conclusa!");
      document.getElementById("ticTacToe-message").innerText = "Pareggio, partita conclusa!";
      endTicTacToeGame();
    }
  }
}

// Funzione per terminare la partita (nasconde il popup e resetta la board)
function endTicTacToeGame() {
  document.getElementById("ticTacToe-popup").style.display = "none";
  // Qui puoi decidere di resettare la board o inviare un evento al server
  window.ticTacToeBoard = Array(9).fill(null);
}

// Funzione per renderizzare la board
function renderTicTacToeBoard() {
  const boardDiv = document.getElementById("ticTacToe-board");
  boardDiv.innerHTML = ""; // pulisci il contenuto precedente

  window.ticTacToeBoard.forEach((cell, index) => {
    const cellDiv = document.createElement("div");
    cellDiv.className = "ticTacToe-cell";
    cellDiv.textContent = cell || ""; // mostra il simbolo o lascia vuoto

    cellDiv.addEventListener("click", () => {
      // Se è il tuo turno e la cella è vuota, esegui la mossa
      if (window.currentTurn === username && !window.ticTacToeBoard[index]) {
        window.ticTacToeBoard[index] = username;
        renderTicTacToeBoard();
        sendTicTacToeMove(window.currentGameRoom, { cell: index, player: username });
        window.currentTurn = null; // attesa mossa avversaria
        checkGameStatus(); // controlla se la partita è finita
      }
    });
    boardDiv.appendChild(cellDiv);
  });
}

// Funzione per aggiornare la board quando arriva la mossa dell'avversario
function updateTicTacToeBoard(move) {
  window.ticTacToeBoard[move.cell] = move.player;
  window.currentTurn = username;
  renderTicTacToeBoard();
  checkGameStatus(); // controlla anche dopo la mossa avversaria
}

// Event listener per ricevere le mosse dall'altro giocatore
socket.on("tic tac toe move", (data) => {
  updateTicTacToeBoard(data.move);
});

// Funzione per iniziare la partita
function startTicTacToeGame(roomId, players) {
  // Mostra il popup del Tris
  document.getElementById("ticTacToe-popup").style.display = "block";
  // Pulisce eventuali messaggi precedenti
  document.getElementById("ticTacToe-message").innerText = "";
  console.log("inizio");
  window.currentGameRoom = roomId;
  window.ticTacToeBoard = Array(9).fill(null);
  window.currentTurn = players[0]; // ad es. il primo nella lista inizia
  renderTicTacToeBoard();
}

// Ricezione dell'evento "challenge start" per iniziare la partita
socket.on("challenge start", (data) => {
  console.log("challenge start event received:", data);
  startTicTacToeGame(data.roomId, data.players);
  console.log("cia", data);
});





// Funzioni per la videochiamata
async function getLocalStream() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    document.getElementById('localVideo').srcObject = localStream;
  } catch (e) {
    console.error('Errore nell\'ottenere lo stream locale', e);
  }
}
document.getElementById('video-call-btn').addEventListener('click', async () => {
  if (!username) {
    alert("Devi prima fare login per entrare in chiamata!");
    return;
  }
  await getLocalStream();
  socket.emit('join-room');
  document.getElementById('leave-call-btn').style.display = 'block';
  document.getElementById('video-call-btn').style.display = 'none';
});

document.getElementById('leave-call-btn').addEventListener('click', () => {
  // Notifica al server l'uscita dalla chiamata
  socket.emit('leave-call');
  
  // Chiudi le peerConnection
  for (const peerId in peers) {
    peers[peerId].close();
    delete peers[peerId];
  }

  // Ferma il localStream
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
  }

  // Rimuovi tutti i video tranne il locale
  document.querySelectorAll('#videos video').forEach(video => {
    if (video.id !== 'localVideo') {
      video.remove();
    }
  });


  // Nascondi / Mostra i bottoni
  document.getElementById('leave-call-btn').style.display = 'none';
  document.getElementById('video-call-btn').style.display = 'block';

  console.log('Chiamata terminata');
});

//logout

document.getElementById('logout-button').addEventListener('click', () => {
  // Notifica al server l'uscita dal tamagotchi
  socket.emit('leave-tama');
  // Mostra la sezione di login
  document.getElementById('login-screen').style.display = 'block';
  

});


// Crea una connessione peer per un dato peerId
function createPeerConnection(peerId) {
  const peerConnection = new RTCPeerConnection(config);

  // Aggiungi i flussi locali alla connessione
  localStream.getTracks().forEach(track => {
    peerConnection.addTrack(track, localStream);
  });

  // Gestione dello stream remoto
  peerConnection.ontrack = (event) => {
    let video = document.getElementById('video-' + peerId);
    if (!video) {
      video = document.createElement('video');
      video.id = 'video-' + peerId;
      video.autoplay = true;
      video.playsInline = true;
      document.getElementById('videos').appendChild(video);
    }
    video.srcObject = event.streams[0];
  };

  // Gestione dei candidate ICE
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('candidate', {
        to: peerId,
        candidate: event.candidate
      });
    }
  };

  return peerConnection;
}

// Riceve la lista degli utenti già connessi
socket.on('all-users', (users) => {
  users.forEach(user => {
    const peerId = user.id;
    // Crea una connessione peer per ogni utente esistente
    peers[peerId] = createPeerConnection(peerId);
    // Crea e invia un'offerta
    peers[peerId].createOffer()
      .then(offer => peers[peerId].setLocalDescription(offer))
      .then(() => {
        socket.emit('offer', {
          to: peerId,
          sdp: peers[peerId].localDescription
        });
      })
      .catch(e => console.error(e));
  });
});

// Quando un nuovo utente si unisce alla chiamata
socket.on('user-joined', (data) => {
  const peerId = data.id;
  peers[peerId] = createPeerConnection(peerId);
});

// Ricezione di un'offerta da un altro utente
socket.on('offer', (data) => {
  const peerId = data.from;
  if (!peers[peerId]) {
    peers[peerId] = createPeerConnection(peerId);
  }
  peers[peerId].setRemoteDescription(new RTCSessionDescription(data.sdp))
    .then(() => peers[peerId].createAnswer())
    .then(answer => peers[peerId].setLocalDescription(answer))
    .then(() => {
      socket.emit('answer', {
        to: peerId,
        sdp: peers[peerId].localDescription
      });
    })
    .catch(e => console.error(e));
});

// Ricezione della risposta (answer) da un peer
socket.on('answer', (data) => {
  const peerId = data.from;
  peers[peerId].setRemoteDescription(new RTCSessionDescription(data.sdp))
    .catch(e => console.error(e));
});

// Ricezione di un candidate ICE
socket.on('candidate', (data) => {
  const peerId = data.from;
  const candidate = new RTCIceCandidate(data.candidate);
  if (peers[peerId]) {
    peers[peerId].addIceCandidate(candidate)
      .catch(e => console.error(e));
  }
});

// Gestione della disconnessione di un utente
socket.on('user-disconnected', (peerId) => {
  if (peers[peerId]) {
    peers[peerId].close();
    delete peers[peerId];
  }
  const video = document.getElementById('video-' + peerId);
  if (video) {
    video.remove();
  }
});

