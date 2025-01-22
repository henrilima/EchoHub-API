// Importando as dependências
require("dotenv").config({});

const { Cipher } = require("cipher-sys");
const nodemailer = require("nodemailer");
const cipher = new Cipher();

const express = require("express");
const multer = require("multer");
const router = express.Router();
const path = require("path");
const fs = require("fs");

// Importando cloudinary e configurando
const cloudinary = require("cloudinary").v2;
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_SECRET,
});

// Importando funções da database
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

// Configurando os estilos para a estilização dos emails
const styles = {
    black: "#101010",
    white: "#f2f2f2",
    blurple: "#584cda",
    orange: "#feb029",
    lightgrey: "#8f8f8f",
    grey: "#606060",
    darkgrey: "#181818",
    btnBlurple: "#7168d6",
};

// Configurando o nodemailer
const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
        user: "cipherauthenticator@gmail.com",
        pass: `${process.env.NODEMAILER_PASSWORD}`,
    },
});

// Middleware para verificar se a API está ativa
router.get("/", (req, res) => {
    res.json({
        message: "Hello, World!",
        status: 200,
    });
});

// Middleware para realizar o login do usuário
router.post("/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            message: "Email ou senha estão faltando.",
            status: 400,
        });
    }

    if (adminRequest(req)) {
        const userRef = ref(database, "users");
        const userQuery = query(userRef, orderByChild("email"), equalTo(email));

        const snapshot = await get(userQuery);
        if (snapshot.exists()) {
            const user = snapshot.val();

            const isCorrectPassword = cipher.comparePasswords(
                password,
                user[Object.keys(user)[0]]["password"],
                process.env.PASS_KEY_TO_ENCRYPT
            );

            const sendToClient = { ...user[Object.keys(user)[0]] };
            delete sendToClient.password;

            if (isCorrectPassword) {
                return res.status(200).json({
                    message: "Logado com sucesso.",
                    status: 200,
                    data: sendToClient,
                });
            } else
                return res.status(401).json({
                    message: "Senha inválida.",
                    status: 401,
                });
        } else {
            return res.status(401).json({
                message: "Não autorizado. Usuário não existente.",
                status: 401,
            });
        }
    }
});

// Middleware para realizar o cadastro do usuário
router.post("/register", async (req, res) => {
    const { email, password, username } = req.body;

    if (!email || !password || !username) {
        return res.status(400).json({
            message: "Email, senha ou nome de usuário faltando.",
            status: 400,
        });
    }

    if (adminRequest(req)) {
        const userRef = ref(database, "users");
        const userQuery = query(userRef, orderByChild("email"), equalTo(email));
        const snapshot = await get(userQuery);

        if (snapshot.exists()) {
            return res.status(409).json({
                message: "Email já em uso.",
                status: 409,
            });
        } else {
            const usernameRef = ref(database, "users");
            const usernameQuery = query(
                usernameRef,
                orderByChild("username"),
                equalTo(String(username).toLowerCase())
            );
            const snapshotUsername = await get(usernameQuery);

            if (snapshotUsername.exists())
                return res.status(409).json({
                    message: "Este nome de usuário já está em uso.",
                    status: 409,
                });

            const newPassword = cipher.encrypt(
                password,
                process.env.PASS_KEY_TO_ENCRYPT
            );

            const user = {
                email,
                password: newPassword,
                username,
                created_at: new Date().toISOString(),
                verified: false,
            };

            // Usando push para criar um novo usuário com um ID único e fazendo uma verificação
            const newUserRef = push(userRef);
            await set(newUserRef, user);
            user.id = newUserRef.key;

            update(ref(database, "users/" + user.id), {
                id: user.id,
            });

            // Usando push para criar um sistema de verificação de email
            const verificationCode = Math.floor(
                100000 + Math.random() * 900000
            ).toString(); // Gera um código de 6 dígitos.
            const accountRef = ref(database, "logNotVerifiedAccounts");

            const request = {
                email,
                userid: user.id,
                verificationcode: verificationCode,
            };

            const newAccountRef = push(accountRef);
            await set(newAccountRef, request);
            request.id = newAccountRef.key;

            update(ref(database, "logNotVerifiedAccounts/" + request.id), {
                id: request.id,
            });

            // Enviando um email de verificação
            transporter.sendMail({
                from: "EchoHub by Cipher <cipherauthenticator@gmail.com>",
                to: user.email,
                subject: `EchoHub: Verificação de Conta`,
                html: `
            <div style="font-family: 'Montserrat', Arial, sans-serif; line-height: 1.6; color: ${styles.lightgrey}; max-width: 600px; margin: 0 auto; padding: 20px; border-radius: 8px; background-color: ${styles.darkgrey};">
                <h2 style="color: ${styles.blurple}; text-align: center;">EchoHub - Verificação de Conta</h2>
                <p>Olá, <strong style="color: ${styles.btnBlurple}; font-weight: 600;">${user.username}</strong>,</p>
                <p>Obrigado por criar uma conta na EchoHub! Antes de começar a usar nossa plataforma, precisamos verificar sua conta. Use o código abaixo para concluir a verificação:</p>
                <div style="text-align: center; margin: 16px 0;">
                    <p style="display: inline-block; padding: 10px 20px; font-size: 24px; font-weight: bold; color: ${styles.white}; background-color: ${styles.btnBlurple}; border-radius: 5px; letter-spacing: 4px;">
                        ${verificationCode}
                    </p>
                </div>
                <p>Se você não criou esta conta, ignore este email.</p>
                <hr style="border: none; border-top: 1px solid ${styles.grey}; margin: 20px 0;">
                <p style="font-size: 12px; color: ${styles.grey}; text-align: center;">EchoHub Inc. | Sua segurança é nossa prioridade.</p>
            </div>
            `,
            });

            delete user.password;

            res.status(200).json({
                message: "Usuário registrado com sucesso.",
                status: 200,
                data: user,
            });
            return;
        }
    } else
        return res.status(401).json({
            message: "Não autorizado.",
            status: 401,
        });
});

// Middleware para verificar se o email está validado ou validar
router.post("/verify", async (req, res, next) => {
    const { email, verificationcode } = req.body;

    if (!email) {
        return res.status(400).json({
            message:
                "Não foi possível validar sua conta devido a dados incorretos.",
            status: 400,
        });
    }

    if (adminRequest(req)) {
        var userRef = ref(database, "users");
        var userQuery = query(userRef, orderByChild("email"), equalTo(email));
        var snapshot = await get(userQuery);

        if (snapshot.exists()) {
            var findUser = snapshot.val();
            var user = findUser[Object.keys(findUser)[0]];
            const username = user.username;

            if (user.verified === true)
                res.status(200).json({ verified: true });
            else {
                if (verificationcode) {
                    userRef = ref(database, "logNotVerifiedAccounts");
                    userQuery = query(
                        userRef,
                        orderByChild("email"),
                        equalTo(email)
                    );
                    snapshot = await get(userQuery);

                    findUser = snapshot.val();
                    user = findUser[Object.keys(findUser)[0]];

                    if (user.verificationcode === verificationcode) {
                        await remove(
                            ref(database, "logNotVerifiedAccounts/" + user.id)
                        );
                        
                        await update(ref(database, "users/" + user.userid), {
                            verified: true,
                            verifiedIn: new Date().toISOString(),
                        });
                        

                        transporter.sendMail({
                            from: "EchoHub by Cipher <cipherauthenticator@gmail.com>",
                            to: user.email,
                            subject: `EchoHub: Conta verificada com sucesso!`,
                            html: `
                            <div style="font-family: 'Montserrat', Arial, sans-serif; line-height: 1.6; color: ${styles.lightgrey}; max-width: 600px; margin: 0 auto; padding: 20px; border-radius: 8px; background-color: ${styles.darkgrey};">
                                <h2 style="color: ${styles.blurple}; text-align: center;">EchoHub - Conta Verificada</h2>
                                <p>Olá, <strong style="color: ${styles.btnBlurple}; font-weight: 600;">${username}</strong>,</p>
                                <p>Estamos felizes em informar que sua conta foi <strong style="color: ${styles.orange};">verificada e validada</strong> com sucesso! Agora você pode acessar todos os recursos da EchoHub sem restrições.</p>
                                <p>Se precisar de ajuda ou tiver dúvidas, estamos sempre à disposição. Entre em contato conosco a qualquer momento.</p>
                                <div style="text-align: center; margin: 16px 0;">
                                    <a href="https://echohub-tau.vercel.app/" 
                                       style="display: inline-block; padding: 10px 20px; color: ${styles.white}; background-color: ${styles.btnBlurple}; border-radius: 5px; text-decoration: none; font-size: 14px; font-weight: 600;">
                                       Ir para EchoHub
                                    </a>
                                </div>
                                <hr style="border: none; border-top: 1px solid ${styles.grey}; margin: 20px 0;">
                                <p style="font-size: 12px; color: ${styles.grey}; text-align: center;">EchoHub Inc. | Sua segurança é nossa prioridade.</p>
                            </div>
                            `,
                        });

                        return res.status(200).json({
                            verified: true,
                            status: 200,
                            message: "ok",
                        });
                    } else
                        return res.status(409).json({
                            verified: false,
                            status: 409,
                            message: "Código de verificação incorreto.",
                        });
                } else
                    return res.status(400).json({
                        verified: false,
                        status: 400,
                        message:
                            "Seus dados de verificação de conta não forão encontrados, por favor, contate o suporte.",
                    });
            }
        } else
            return res.status(404).json({
                verified: false,
                status: 404,
                message:
                    "Usuário não encontrado, por favor, contate o suporte.",
            });
    } else
        return res.status(401).json({
            message: "Não autorizado.",
            status: 401,
        });
});

// Middleware para enviar uma solicitação de reset da senha
router.post("/resetpassword", async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({
            message: "Email está faltando.",
            status: 400,
        });
    }

    if (adminRequest(req)) {
        const userRef = ref(database, "users");
        const userQuery = query(userRef, orderByChild("email"), equalTo(email));

        const snapshot = await get(userQuery);
        if (snapshot.exists()) {
            const findUser = snapshot.val();
            const user = findUser[Object.keys(findUser)[0]];
            if (user.email) {
                try {
                    const passwordRef = ref(database, "logChangedPasswords");

                    const request = {
                        email,
                        timestamp: new Date().toISOString(),
                        userid: user.id,
                    };

                    const newPasswordRef = push(passwordRef);
                    await set(newPasswordRef, request);
                    request.id = newPasswordRef.key;

                    update(ref(database, "logChangedPasswords/" + request.id), {
                        id: request.id,
                    });

                    transporter.sendMail({
                        from: "EchoHub by Cipher <cipherauthenticator@gmail.com>",
                        to: user.email,
                        subject: `EchoHub: Redefinição de senha solicitada.`,
                        html: `
                        <div style="font-family: 'Montserrat', Arial, sans-serif; line-height: 1.6; color: ${
                            styles.lightgrey
                        }; max-width: 600px; margin: 0 auto; padding: 20px; border-radius: 8px; background-color: ${
                            styles.darkgrey
                        };">
                            <h2 style="color: ${
                                styles.blurple
                            }; text-align: center;">EchoHub - Redefinição de Senha</h2>
                            <p>Olá, <strong style="color: ${
                                styles.btnBlurple
                            }; font-weight: 600;">${
                            user.username
                        }</strong>. Recebemos uma solicitação para redefinir sua senha. Caso tenha sido você, clique no botão abaixo para redefini-la:</p>
                            <div style="text-align: center; margin: 16px 0;">
                                <a href="https://echohub-tau.vercel.app/changepassword?request=${request.id}"
                                style="display: inline-block; padding: 10px 20px; color: ${
                                    styles.white
                                }; background-color: ${
                            styles.btnBlurple
                        }; border: none; border-radius: 5px; text-decoration: none; font-size: 14px; font-weight: 600;">
                                Redefinir Senha
                                </a>
                            </div>
                            <p>Se você não solicitou a redefinição de senha, ignore este email. Sua senha continuará segura.</p>
                            <p style="font-size: 14px; color: ${
                                styles.orange
                            }; font-weight: 700; text-align: center;">Este link é válido por 24 horas. Caso expire, solicite novamente.</p>
                            <hr style="border: none; border-top: 1px solid ${
                                styles.grey
                            }; margin: 20px 0;">
                            <p style="font-size: 12px; color: ${
                                styles.grey
                            }; text-align: center;">EchoHub Inc. | Sua segurança é nossa prioridade.</p>
                        </div>
                    `,
                    });
                } catch (e) {
                    console.error("Error sending email:", e);
                    return res.status(500).json({
                        message: "Erro ao enviar email.",
                        status: 500,
                    });
                } finally {
                    res.status(200).json({
                        message: "Um email foi enviado com instruções.",
                        status: 200,
                    });
                }
            } else {
                return res.status(401).json({
                    message: "Este usuário não existe.",
                    status: 401,
                });
            }
        } else
            return res.status(401).json({
                message: "Este usuário não existe.",
                status: 401,
            });
    } else
        return res.status(401).json({
            message: "Não autorizado.",
            status: 401,
        });
});

// Middleware para alterar a senha
router.post("/changepassword", async (req, res) => {
    const { request } = req.query;
    const { password } = req.body;

    if (!request)
        return res.status(401).json({
            message:
                "Não autorizado. Nenhuma requisição de troca de senha foi encontrada.",
            status: 401,
        });

    if (!password)
        return res.status(401).json({
            message: "Não autorizado. Nenhuma senha foi fornecida.",
            status: 401,
        });

    if (adminRequest(req)) {
        const passwordRef = ref(database, "logChangedPasswords/" + request);
        const passwordRequest = await get(passwordRef);

        if (passwordRequest.exists()) {
            const requestData = passwordRequest.val();

            const timeDiff = new Date() - new Date(requestData.timestamp);
            const hoursDiff = timeDiff / (1000 * 60 * 60);
            if (hoursDiff <= 24) {
                const newPassword = cipher.encrypt(
                    password,
                    process.env.PASS_KEY_TO_ENCRYPT
                );

                const userRef = ref(database, "users/" + requestData.userid);
                update(userRef, {
                    password: newPassword,
                });

                const findUser = await get(userRef);
                const user = findUser.val();

                remove(ref(database, "logChangedPasswords/" + request));

                transporter.sendMail({
                    from: "EchoHub by Cipher <cipherauthenticator@gmail.com>",
                    to: user.email,
                    subject: `EchoHub: Senha alterada com sucesso`,
                    html: `
                        <div style="font-family: 'Montserrat', Arial, sans-serif; line-height: 1.6; color: ${styles.lightgrey}; max-width: 600px; margin: 0 auto; padding: 20px; border-radius: 8px; background-color: ${styles.darkgrey};">
                            <h2 style="color: ${styles.blurple}; text-align: center;">EchoHub - Senha Alterada</h2>
                            <p>Olá, <strong style="color: ${styles.btnBlurple}; font-weight: 600;">${user.username}</strong>. Informamos que sua senha foi alterada com sucesso.</p>
                            <p>Se você realizou essa alteração, não precisa fazer mais nada.</p>
                            <p style="color: ${styles.orange}; font-weight: 600;">⚠️ Caso você não tenha solicitado essa alteração, recomendamos imediatamente entrar em contato com nosso suporte, através deste mesmo gmail.</p>
                            <hr style="border: none; border-top: 1px solid ${styles.grey}; margin: 20px 0;">
                            <p style="font-size: 12px; color: ${styles.grey}; text-align: center;">EchoHub Inc. | Sua segurança é nossa prioridade.</p>
                        </div>
                    `,
                });

                res.status(200).json({
                    message: "Senha alterada com sucesso.",
                    status: 200,
                });
            } else
                return res.status(404).json({
                    message: "Esta requisição de troca de senha expirou.",
                    status: 404,
                });
        } else
            return res.status(404).json({
                message: "Requisição de troca de senha não encontrada.",
                status: 404,
            });
    } else
        return res.status(401).json({
            message: "Não autorizado.",
            status: 401,
        });
});

// Middleware para pegar os dados do perfil de um usuário
router.post("/profile", async (req, res) => {
    const { id } = req.query;

    if (!id)
        return res.status(401).json({
            message: "Nenhum ID de usuário foi recebido.",
            status: 401,
        });

    if (adminRequest(req)) {
        const userRef = ref(database, "users/" + id);
        const user = await get(userRef);
        if (user.exists()) {
            const userData = user.val();
            delete userData.password;
            res.json(userData);
        } else {
            return res.status(404).json({
                message: "Usuário não encontrado.",
                status: 404,
            });
        }
        return user;
    } else
        return res.status(401).json({
            message: "Não autorizado.",
            status: 401,
        });
});

// Middleware para buscar uma pessoa por nome de usuário
router.post("/fetchbyusername", async (req, res) => {
    const { username } = req.query;

    if (!username)
        return res.status(401).json({
            message: "Nenhum nome de usuário foi fornecido.",
            status: 401,
        });

    if (adminRequest(req)) {
        const usersRef = ref(database, "users");
        const usersQuery = query(
            usersRef,
            orderByChild("username"),
            startAt(username.trim()),
            endAt(username.trim() + "\uf8ff"),
            limitToFirst(5)
        );

        const users = await get(usersQuery);
        if (users.exists()) {
            for (let i in users) {
                delete users[i].password;
            }

            res.status(200).json(users.val());
        } else {
            return res.status(404).json({
                message: "Usuário não encontrado.",
                status: 404,
            });
        }
        return users;
    } else
        return res.status(401).json({
            message: "Não autorizado.",
            status: 401,
        });
});

// Middleware para buscar os contatos recentes do usuário
router.post("/fetchcontacts", async (req, res) => {
    const { user } = req.body;

    if (!user)
        return res.status(401).json({
            message: "Nenhum usuário foi encontrado.",
            status: 401,
        });

    if (adminRequest(req)) {
        const userRef = ref(database, `users/${user}`);
        const getContacts = await get(userRef);

        const usersList = [];

        if (getContacts.exists()) {
            for (let i in getContacts.val()["chats"]) {
                const findUserRef = ref(database, `users/${i}`);
                const getContactData = await get(findUserRef);
                if (getContactData.exists()) {
                    const userData = getContactData.val();
                    delete userData.password;

                    const lastMessageRef = ref(
                        database,
                        `chats/${getContacts.val()["chats"][i]}`
                    );

                    const lastMessage = await get(lastMessageRef);
                    userData.lastMessage = Object.values(lastMessage.val())[
                        Object.values(lastMessage.val()).length - 1
                    ];

                    usersList.push(userData);
                }
            }

            usersList.sort((a, b) => {
                const lastMessageA = a.lastMessage
                    ? a.lastMessage.timestamp
                    : 0;
                const lastMessageB = b.lastMessage
                    ? b.lastMessage.timestamp
                    : 0;
                return lastMessageB - lastMessageA; // Ordena do mais recente para o mais antigo
            });

            res.status(200).json({
                message: "Contatos recuperados com sucesso.",
                status: 200,
                contacts: usersList,
            });
        } else {
            return res.status(404).json({
                message: "Usuário não encontrado.",
                status: 404,
            });
        }
    } else
        return res.status(401).json({
            message: "Não autorizado.",
            status: 401,
        });
});

// Configurando o storage com multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/"); // Define o diretório de upload
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Define o nome do arquivo
    },
});
const upload = multer({ storage: storage });

// Middleware para inserir dados de um usuário na base de dados
router.post("/insertdata", upload.single("avatar"), async (req, res) => {
    const { id, data } = req.body;

    if (!id || !data) {
        return res.status(404).json({
            message: "Nenhum ID de usuário ou dados foi encontrado.",
            status: 404,
        });
    }

    if (adminRequest(req)) {
        const uploadImageToCloudinary = async (filePath) => {
            try {
                const result = await cloudinary.uploader.upload(filePath, {
                    folder: "avatars",
                    transformation: [
                        { width: 1024, height: 1024, crop: "limit" },
                    ],
                });
                return result; // Retorna o resultado completo do upload, incluindo a URL e public_id
            } catch (error) {
                throw new Error("Erro ao enviar a imagem para o Cloudinary");
            }
        };

        const deleteOldAvatar = async (publicId) => {
            try {
                await cloudinary.uploader.destroy(publicId); // Deleta a imagem antiga usando o public_id
            } catch (error) {
                console.error(
                    "Erro ao excluir a imagem antiga do Cloudinary:",
                    error
                );
            }
        };

        const userRef = ref(database, "users/" + id);
        const snapshot = await get(userRef);

        if (snapshot.exists()) {
            const userData = snapshot.val();
            const currentAvatarUrl = userData.avatar; // URL da imagem do avatar antigo
            let currentPublicId = null;

            // Se existir um avatar atual, pega o public_id para deletar no Cloudinary
            if (currentAvatarUrl) {
                const urlParts = currentAvatarUrl.split("/");
                currentPublicId = urlParts[urlParts.length - 2]; // Public ID da imagem (antes da extensão)
            }

            if (req.file) {
                try {
                    // Se existir uma imagem antiga, a excluímos
                    if (currentPublicId) {
                        await deleteOldAvatar(currentPublicId);
                    }

                    // Envia a nova imagem para o Cloudinary
                    const uploadResult = await uploadImageToCloudinary(
                        req.file.path
                    );
                    const avatarUrl = uploadResult.secure_url; // URL segura da nova imagem

                    // Apaga a imagem temporária após o upload para o Cloudinary
                    fs.unlinkSync(req.file.path);

                    // Atualiza os dados do usuário com a nova URL de avatar
                    const parsedData = JSON.parse(data);
                    parsedData.avatar = avatarUrl;

                    await update(userRef, parsedData);

                    res.status(200).json({
                        message:
                            "Dados e imagem de avatar guardados com sucesso.",
                        status: 200,
                        data: { avatar: avatarUrl },
                    });
                } catch (error) {
                    res.status(500).json({
                        message: "Erro ao processar a imagem de avatar.",
                        status: 500,
                    });
                }
            } else {
                // Se não houver imagem de avatar, apenas atualiza os dados
                await update(userRef, JSON.parse(data));

                res.status(200).json({
                    message: "Seus dados foram guardados.",
                    status: 200,
                });
            }
        } else {
            return res.status(404).json({
                message: "Usuário não encontrado.",
                status: 404,
            });
        }
    } else {
        return res.status(401).json({
            message: "Não autorizado.",
            status: 401,
        });
    }
});

// Middleware para remover dados de um usuário na base de dados
router.post("/removedata", async (req, res) => {
    const { id, data } = req.body;

    if (!id || !data)
        return res.status(404).json({
            message: "Nenhum ID de usuário ou dados foi fornecido.",
            status: 404,
        });

    if (adminRequest(req)) {
        const userRef = ref(database, "users/" + id);
        const snapshot = await get(userRef);

        if (snapshot.exists()) {
            const dataToRemove = JSON.parse(JSON.stringify(data));
            for (let i in dataToRemove) {
                remove(child(userRef, dataToRemove[i]));
            }

            res.status(200).json({
                message: "Dados do usuário removidos.",
                status: 200,
            });
        } else
            return res.status(404).json({
                message: "Usuário não encontrado.",
                status: 404,
            });
    } else
        return res.status(401).json({
            message: "Não autorizado.",
            status: 401,
        });
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
