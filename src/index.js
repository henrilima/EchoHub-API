require("dotenv").config();
const cors = require("cors");
const express = require("express");
const bodyParser = require("body-parser");
const http = require("http");

const PORT = process.env.PORT || 8080;

const app = express();
// Middleware para permitir cross-origin resource sharing (CORS)
app.use(cors({
    origin: "https://echohub-tau.vercel.app",
    methods: ["GET", "POST"],
    credentials: true
}));

// Criar servidor HTTP
const server = http.createServer(app);

// Conectar o Socket.IO ao servidor
const io = new require("socket.io")(server, {
    cors: {
        origin: "https://echohub-tau.vercel.app",
        methods: ["GET", "POST"],
        credentials: true
    },
});

// Middleware para tratar e converter dados do corpo da requisição
app.use(bodyParser.json({ limit: "5mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "5mb" }));

// Rotas da API
const userRoutes = require("./../routes/user");
const messagesRoutes = require("./../routes/messages");
app.use("/user", userRoutes);
app.use("/messages", messagesRoutes);

app.get("/", function (req, res) {
    res.send("EchoHub Server");
});

// Configuração do Socket.IO
io.on("connection", (socket) => {
    console.log("Usuário conectado:", socket.id);

    socket.on("sendMessage", (message) => {
        io.emit("receiveMessage", message);
    });

    socket.on("disconnect", () => {
        console.log("Usuário desconectado:", socket.id);
    });
});

// Tratamento de erros
app.use("*", function (req, res) {
    res.status(404).json({ message: "Not Found", status: 404 });
});

// Iniciar o servidor
server.listen(PORT, function () {
    console.log(`Server is running on port ${PORT}`);
});
