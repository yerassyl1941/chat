const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 3000 });
let waitingUser = null;

wss.on('connection', (ws) => {
    console.log('✅ Новый пользователь подключился');

    ws.isAlive = true;
    ws.on('pong', () => ws.isAlive = true);

    ws.on('close', () => {
        console.warn("⚠️ Клиент отключился");
        if (ws.otherUser) {
            ws.otherUser.send(JSON.stringify({ message: '⚠️ Собеседник отключился' }));
            ws.otherUser.otherUser = null;
        }
        if (waitingUser === ws) {
            waitingUser = null;
        }
    });

    ws.on('error', (error) => {
        console.error("❌ WebSocket ошибка:", error);
    });

    if (waitingUser) {
        ws.otherUser = waitingUser;
        waitingUser.otherUser = ws;
        waitingUser.send(JSON.stringify({ message: '✅ Собеседник найден' }));
        ws.send(JSON.stringify({ message: '✅ Собеседник найден' }));
        waitingUser = null;
    } else {
        waitingUser = ws;
        ws.send(JSON.stringify({ message: '⏳ Ожидание собеседника...' }));

        // Если через 30 секунд не найден собеседник, отправляем сообщение
        setTimeout(() => {
            if (waitingUser === ws) {
                ws.send(JSON.stringify({ message: '❌ Собеседник не найден. Попробуйте позже.' }));
                waitingUser = null;
            }
        }, 30000);
    }

    ws.on('message', (message) => {
        console.log("📩 Получено сообщение:", message);
        
        if (ws.otherUser) {
            if (ws.otherUser.readyState === WebSocket.OPEN) {
                ws.otherUser.send(message);
            } else {
                console.warn("⚠️ Собеседник отключился, сообщение не отправлено");
                ws.send(JSON.stringify({ message: '⚠️ Ваш собеседник отключился.' }));
                ws.otherUser = null;
            }
        } else {
            console.warn("⚠️ Сообщение не отправлено, нет собеседника");
            ws.send(JSON.stringify({ message: '⚠️ У вас пока нет собеседника.' }));
        }
    });
});

// Пинг для поддержания соединения и предотвращения разрывов
setInterval(() => {
    wss.clients.forEach((ws) => {
        if (!ws.isAlive) return ws.terminate();
        ws.isAlive = false;
        ws.ping();
    });
}, 30000);

console.log('🚀 WebSocket сервер запущен на порту 3000');

