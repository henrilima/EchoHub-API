// Importando dependências
require("dotenv").config();
const { initializeApp } = require("firebase/app");
const { getDatabase } = require("firebase/database");

// Configuração do Firebase
const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
};

// Inicializar o Firebase e gerar o objeto Database
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Exportar as configurações e o objeto Database para serem usados em outros scripts
module.exports = {
    firebaseConfig,
    database,
};
