
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');


const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

let connectedUsers = [];
let chatHistory = [];
let scores = [];
let currentNeed = null;
let responseOrder = []; 
let playScores = [];

// Funzione per attivare il bisogno o far riposare Marshall
function triggerNeedOrRest() {
  const shouldRest = Math.random() < 0.1;
  if (shouldRest) {
    currentNeed = null;
    console.log("Marshall sta riposando.");
    io.emit('marshall happy');
    setTimeout(triggerNeedOrRest, 20000);
    return;
  }
  const types = ['food', 'sleep', 'thirst', 'air', 'play'];
  const type = types[Math.floor(Math.random() * types.length)];
  currentNeed = type;
  // Reset dei dati relativi alla risposta
  responseOrder = [];
  playScores = [];
  console.log("Nuovo bisogno attivato:", type);
  io.emit('trigger need', type);
  //const timeoutDuration = type === 'play' ? 10000 : 30000;
  setTimeout(() => {
    if (currentNeed === type) {
      if (type === 'play') {
        // Ordina per punti decrescenti e risolvi
        playScores.sort((a, b) => b.points - a.points);
        const firstUser = playScores[0]?.user || '';
        if (firstUser) {
          console.log("Risolve bisogno 'play' con:", playScores.map(p => p.user));
          resolveNeed(type, playScores);
        } else {
          console.log("Nessuno ha risposto per 'play'. Riavvio...");
          restart();
        }
      } else if (type === 'air') {
        // Per la corsa, attendi l'intero periodo per raccogliere i punteggi
        if (responseOrder.length > 0) {
          responseOrder.sort((a, b) => b.points - a.points);
          const firstUser = responseOrder[0]?.user || '';
          console.log("Risolve bisogno 'air' con:", responseOrder.map(r => r.user));
          resolveNeed(type, responseOrder);
        } else {
          console.log("Nessuno ha risposto per 'air'. Riavvio...");
          restart();
        }
      } else {
        console.log("Nessuna risposta per il bisogno:", type, "-> restart");
        restart();
      }
    }
  }, 30000);
}

function resolveNeed(type, winners) {
  let firstUser;
  console.log("Risolvendo bisogno:", type);
  if (type === 'play' || type === 'air') {
    winners.sort((a, b) => b.points - a.points);
    firstUser = winners[0]?.user || '';
  } else {
    firstUser = winners[0] || '';
  }
  console.log("Vincitore:", firstUser);
  io.emit('resolve need', { type, firstUser });

  // Aggiorna i punteggi in base al tipo di bisogno
  if (type === 'play' || type === 'air') {
    winners.forEach(entry => {
      const { user, points } = entry;
      const scoreEntry = scores.find(s => s.user === user);
      if (scoreEntry) {
        scoreEntry.points += points;
        console.log(`Assegno ${points} punti a ${user} (totale ${scoreEntry.points})`);
      } else {
        scores.push({ user, points });
        console.log(`Assegno ${points} punti a ${user} (nuovo)`);
      }
    });
  } else {
    const pointsMap = [5, 3, 2, 1];
    winners.forEach((user, i) => {
      const scoreEntry = scores.find(s => s.user === user);
      const pointsToAdd = pointsMap[i] || 0;
      if (scoreEntry) {
        scoreEntry.points += pointsToAdd;
        console.log(`Assegno ${pointsToAdd} punti a ${user} (totale ${scoreEntry.points})`);
      } else {
        scores.push({ user, points: pointsToAdd });
        console.log(`Assegno ${pointsToAdd} punti a ${user} (nuovo)`);
      }
    });
  }
  scores.sort((a, b) => b.points - a.points);
  io.emit('update scores', scores);
  currentNeed = null;
  responseOrder = [];
  playScores = [];
  setTimeout(triggerNeedOrRest, 10000);
}

function restart() {
  currentNeed = null;
  console.log("Restart del bisogno...");
  triggerNeedOrRest();
}

io.on('connection', (socket) => {
  // Registrazione di un nuovo utente
  socket.on('new user', (data) => {
    socket.username = data.user;
    socket.color = data.color;
    connectedUsers.push({ id: socket.id, user: data.user, color: data.color });
    console.log('Nuovo utente:', data.user, 'ID:', socket.id);
    io.emit('update users', connectedUsers.map(u => ({ user: u.user, color: u.color })));
    io.emit('update scores', scores);
  });

  //CHAT

  socket.on('request previous messages', () => {
    console.log('Richiesta messaggi precedenti da:', socket.username);
    socket.emit('previous messages', chatHistory);
  });

  socket.on('chat message', (msg) => {
    console.log('Messaggio ricevuto da', msg.user, ":", msg.text);
    chatHistory.push(msg);
    io.emit('chat message', msg);
  });

  socket.on('respond need', ({ user, type, points }) => {
    console.log(`Risposta al bisogno: utente ${user}, tipo ${type}, punti ${points}`);
    if (currentNeed !== type) {
      console.log("Il bisogno attuale non corrisponde. Attuale:", currentNeed);
      return;
    }
    if (type === 'play') {
      // Raccolta dei punteggi del minigioco "play"
      const existing = playScores.find(s => s.user === user);
      if (!existing) {
        playScores.push({ user, points });
        console.log("Aggiunto punteggio play per", user);
      } else if (points > existing.points) {
        existing.points = points;
        console.log("Aggiornato punteggio play per", user, "a", points);
      }
    } else if (type === 'air') {
      // Per la corsa, raccogliamo o aggiorniamo l'oggetto { user, points }
      const existing = responseOrder.find(r => r.user === user);
      if (!existing) {
        responseOrder.push({ user, points });
        console.log("Aggiunto punteggio air per", user);
      } else if (points > existing.points) {
        existing.points = points;
        console.log("Aggiornato punteggio air per", user, "a", points);
      }
      // Non chiamiamo subito resolveNeed qui: attendiamo la scadenza del timer
    } else {
      // Per gli altri bisogni, raccogliamo semplicemente l'ordine di risposta
      if (!responseOrder.includes(user)) {
        responseOrder.push(user);
        console.log("Aggiunto ordine risposta per", user);
        if (responseOrder.length === 1) {
          console.log("Il primo utente a rispondere è:", user);
          resolveNeed(type, responseOrder);
        }
      }
    }
  });



    
  // gestione della richiesta di sfida
  socket.on('challenge request', (data) => {
    console.log(`Ricevuta challenge request da ${socket.username} per targetUser: ${data.targetUser}`);
  
    for (let [id, s] of io.of("/").sockets) {
      console.log(`Socket ID: ${id}, username: ${s.username}`);
    }
  
    // Cerca il socket il cui username corrisponde a targetUser (ignorando maiuscole e spazi)
    let targetSocket = null;
    for (let [id, s] of io.of("/").sockets) {
      if (s.username && s.username.trim().toLowerCase() === data.targetUser.trim().toLowerCase()) {
        targetSocket = s;
        break;
      }
    }
    
    if (!targetSocket) {
      console.log("Target non trovato!");
      socket.emit("challenge error", { message: "Target non trovato" });
      return;
    }
    
    const challengerScore = scores.find(s => s.user === socket.username)?.points || 0;
    const targetScore = scores.find(s => s.user === targetSocket.username)?.points || 0;
    
    if (challengerScore < 10 || targetScore < 10) {
      socket.emit('challenge error', { message: "Entrambi devono avere almeno 10 punti per sfidarsi" });
      return;
    }
    
    // Invia al target la richiesta di sfida
    targetSocket.emit('challenge incoming', { challengerId: socket.id, challengerName: socket.username });
    console.log(`${socket.username} ha sfidato ${targetSocket.username}`);
  });

 
  
  // Gestione della risposta alla sfida
  socket.on('challenge response', (data) => {
    console.log(`sfida arrivata`);
    

    const challengerSocket = io.sockets.sockets.get(data.challengerId);
    if (!challengerSocket) return;
    if (data.accepted) {
      // Crea una room unica per i due giocatori
      const roomId = uuidv4();
      challengerSocket.join(roomId);
      socket.join(roomId);
      // Invia l'evento per avviare il gioco a entrambi
      io.to(roomId).emit('challenge start', { roomId, players: [challengerSocket.username, socket.username] });
      console.log(`Sfida accettata: avvio partita in room ${roomId}`);
    } else {
      // Notifica al challenger il rifiuto
      challengerSocket.emit('challenge declined', { targetName: socket.username });
      console.log(`${socket.username} ha rifiutato la sfida da ${challengerSocket.username}`);
    }
  });
  
  // Gestione delle mosse del tris
  socket.on('tic tac toe move', (data) => {
    // data: { roomId, move } dove "move" potrebbe essere un oggetto { cell: number, player: username }
    // Inoltra la mossa a tutti gli altri nella room
    socket.to(data.roomId).emit('tic tac toe move', data);
    console.log(`Mossa in room ${data.roomId}:`, data.move);
  });
  /***** GESTIONE VIDEOCHIAMATA *****/
  socket.on('join-room', () => {
    const userName = socket.username;
    if (!userName) {
      console.log('Errore: utente senza nome ha tentato di entrare nella stanza');
      return;
    }
    socket.userName = userName;
    console.log(userName + ' si è unito alla stanza.');

    const otherUsers = [];
    for (let [id, s] of io.of("/").sockets) {
      if (id !== socket.id && s.userName) {
        otherUsers.push({ id: id, userName: s.userName });
      }
    }
    socket.emit('all-users', otherUsers);
    socket.broadcast.emit('user-joined', { id: socket.id, userName: userName });
  });

  socket.on('offer', (data) => {
    io.to(data.to).emit('offer', {
      from: socket.id,
      sdp: data.sdp,
      userName: socket.userName
    });
  });
  
  socket.on('answer', (data) => {
    io.to(data.to).emit('answer', {
      from: socket.id,
      sdp: data.sdp
    });
  });
  
  socket.on('leave-call', () => {
    console.log(socket.username + ' ha lasciato la videochiamata.');
    socket.broadcast.emit('user-disconnected', socket.id);
  });
  
  socket.on('leave-tama', () => {
    console.log(socket.username + ' ha lasciato il tamagotchi.');
    socket.broadcast.emit('user-disconnected', socket.id);
  });
  
  socket.on('candidate', (data) => {
    io.to(data.to).emit('candidate', {
      from: socket.id,
      candidate: data.candidate
    });
  });

  socket.on('disconnect', () => {
    console.log("Utente disconnesso:", socket.username, "ID:", socket.id);
    connectedUsers = connectedUsers.filter(u => u.id !== socket.id);
    io.emit('update users', connectedUsers.map(u => ({ user: u.user, color: u.color })));
    console.log("Elenco aggiornato dopo la disconnessione di", socket.username);
  });
});

server.listen(3000, () => {
  console.log('🚀 Server avviato su http://localhost:3000');
  triggerNeedOrRest();
});

