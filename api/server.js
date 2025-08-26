const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Настройка CORS для продакшена
const allowedOrigins = [
  'http://localhost:3000',
  'https://your-frontend-domain.vercel.app',
  'https://mymessenger.vercel.app'
];

const io = socketIo(server, {
  cors: {
    origin: function (origin, callback) {
      // Разрешаем запросы без origin (например, от мобильных приложений)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Хранилище данных (в реальном приложении используйте базу данных)
let users = new Map();
let messages = new Map();
let onlineUsers = new Set();

// Генерируем уникальный ID для чата
const generateChatId = (userId1, userId2) => {
  return [userId1, userId2].sort().join('_');
};

// Добавляем health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    users: users.size,
    messages: messages.size,
    online: onlineUsers.size
  });
});

io.on('connection', (socket) => {
  console.log('Пользователь подключился:', socket.id);

  // Регистрация пользователя
  socket.on('register', (userData) => {
    const userId = socket.id;
    users.set(userId, {
      id: userId,
      name: userData.name || 'Пользователь',
      avatar: userData.avatar || '👤',
      status: 'online',
      lastSeen: new Date().toISOString()
    });
    
    onlineUsers.add(userId);
    
    // Уведомляем всех о новом пользователе
    io.emit('userList', Array.from(users.values()));
    
    socket.emit('registered', users.get(userId));
  });

  // Отправка сообщения
  socket.on('sendMessage', (data) => {
    const { to, text, type = 'text' } = data;
    const from = socket.id;
    const fromUser = users.get(from);
    
    if (!fromUser) return;

    const message = {
      id: Date.now().toString(),
      from,
      to,
      text,
      type,
      time: new Date().toISOString(),
      reactions: []
    };

    // Сохраняем сообщение
    const chatId = generateChatId(from, to);
    if (!messages.has(chatId)) {
      messages.set(chatId, []);
    }
    messages.get(chatId).push(message);

    // Отправляем сообщение получателю
    socket.to(to).emit('newMessage', message);
    
    // Подтверждаем отправку отправителю
    socket.emit('messageSent', message);
  });

  // Получение истории сообщений
  socket.on('getChatHistory', (data) => {
    const { withUser } = data;
    const chatId = generateChatId(socket.id, withUser);
    const chatMessages = messages.get(chatId) || [];
    
    socket.emit('chatHistory', {
      chatId,
      messages: chatMessages
    });
  });

  // Получение списка пользователей
  socket.on('getUsers', () => {
    socket.emit('userList', Array.from(users.values()));
  });

  // Изменение статуса
  socket.on('updateStatus', (status) => {
    const user = users.get(socket.id);
    if (user) {
      user.status = status;
      user.lastSeen = new Date().toISOString();
      io.emit('userStatusChanged', { userId: socket.id, status, lastSeen: user.lastSeen });
    }
  });

  // Пользователь печатает
  socket.on('typing', (data) => {
    const { to, isTyping } = data;
    socket.to(to).emit('userTyping', {
      userId: socket.id,
      isTyping
    });
  });

  // Отключение пользователя
  socket.on('disconnect', () => {
    console.log('Пользователь отключился:', socket.id);
    
    const user = users.get(socket.id);
    if (user) {
      user.status = 'offline';
      user.lastSeen = new Date().toISOString();
      onlineUsers.delete(socket.id);
      
      io.emit('userStatusChanged', { 
        userId: socket.id, 
        status: 'offline', 
        lastSeen: user.lastSeen 
      });
    }
  });
});

// REST API endpoints
app.get('/api/users', (req, res) => {
  res.json(Array.from(users.values()));
});

app.get('/api/messages/:chatId', (req, res) => {
  const { chatId } = req.params;
  const chatMessages = messages.get(chatId) || [];
  res.json(chatMessages);
});

app.post('/api/users', (req, res) => {
  const { name, avatar } = req.body;
  const userId = Date.now().toString();
  
  users.set(userId, {
    id: userId,
    name: name || 'Пользователь',
    avatar: avatar || '👤',
    status: 'offline',
    lastSeen: new Date().toISOString()
  });
  
  res.json(users.get(userId));
});

// Обработка ошибок
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Что-то пошло не так!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Маршрут не найден' });
});

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`Сервер запущен на ${HOST}:${PORT}`);
  console.log(`API доступен по адресу: http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
