// Importando dependências
require("dotenv").config({});
const express = require("express");
const router = express.Router();

const {
    ref,
    query,
    orderByChild,
    startAt,
    endAt,
    limitToFirst,
    equalTo,
    get,
    set,
    push,
    update,
    remove,
    child,
} = require("firebase/database");
const { database } = require("../src/firebase");

// Middleware para verificar se a API está ativa
router.get("/", (req, res) => {
    res.json({
        message: "Hello, World!",
        status: 200,
    });
});

// Middleware para carregar as mensagens de um usuário
router.post("/fetch", async (req, res) => {
    const { user, contact } = req.body;


    if (adminRequest(req)) {
        if (!user || !contact) {
            return res.status(400).json({
                status: 400,
                message:
                    "Dados de contato ou usuário inválidos, contate um administrador.",
            });
        }

        try {
            const fetchChat = await get(
                ref(database, `users/${user}/chats/${contact}`)
            );

            if (!fetchChat.exists()) {
                return res.status(200).json({
                    status: 200,
                    type: "info",
                    message:
                        "Não há mensagens para serem carregadas. Inicie sua conversa agora.",
                });
            }
            const chat = fetchChat.val();

            const chatRef = ref(database, `chats/${chat}`);
            const snapshot = await get(chatRef);

            if (!snapshot.exists()) {
                return res.status(404).json({
                    status: 404,
                    message: "Conversa com usuário não encontrada.",
                });
            }

            const messages = snapshot.val();
            res.status(200).json({
                messages,
                status: 200,
                chat,
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Erro interno do servidor." });
        }
    } else
        return res.status(401).json({
            message: "Não autorizado.",
            status: 401,
        });
});

// Middleware para enviar uma nova mensagem a um usuário
router.post("/send", async (req, res) => {
    const { sender, receiver, text, chat } = req.body;

    if (!sender || !text) {
        return res.status(400).json({
            message: "Dados de mensagem inválidos, contate um administrador.",
        });
    }

    if (adminRequest(req)) {
        try {
            const newMessage = {
                sender,
                receiver,
                text,
                timestamp: Date.now(),
            };

            if (chat) {
                const chatRef = ref(database, `chats/${chat}`);
                const snapshot = await get(chatRef);

                if (snapshot.exists()) {
                    newMessage.chat = chat;
                    push(chatRef, newMessage);
                }
            } else {
                const newChatRef = push(ref(database, "chats/"));
                newMessage.chat = newChatRef.key;

                push(newChatRef, newMessage);
            }

            const senderRef = ref(
                database,
                `users/${sender}/chats/${receiver}`
            );
            const receiverRef = ref(
                database,
                `users/${receiver}/chats/${sender}`
            );

            const senderSnapshot = await get(senderRef);
            const receiverSnapshot = await get(receiverRef);

            if (!senderSnapshot.exists()) {
                await update(ref(database, `users/${sender}/chats`), {
                    [receiver]: newMessage.chat,
                });
            }
            if (!receiverSnapshot.exists()) {
                await update(ref(database, `users/${receiver}/chats`), {
                    [sender]: newMessage.chat,
                });
            }

            res.status(201).json({
                status: 201,
                message: "Message sent",
                ...newMessage,
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Erro interno do servidor." });
        }
    } else
        return res
            .status(400)
            .json({ status: 401, message: "Não autorizado." });
});

// Middleware para verificar se a requisição é feita por um administrador
function adminRequest(req) {
    let key = req.body.admin_pass_key;
    if (!key) key = null;

    const isAdminRequest = key === process.env.ADMIN_PASS_KEY;

    if (isAdminRequest) return true;
    else return false;
}

module.exports = router;
