# API de Chat em Tempo Real e Autenticação
## Descrição
Esta é a API de um projeto de chat em tempo real e autenticação, construída com **Express**, **Firebase** e **Socket.IO**. O projeto foi desenvolvido como um projeto pessoal de **código aberto** com fins educacionais e para aprendizado.

## Funcionalidades
- **Autenticação de usuários**: Permite que os usuários se registrem, façam login, solicite a troca de senha via email, altere a senha e outras funções.
- **Chat em tempo real**: Utiliza o **Socket.IO** para permitir comunicação em tempo real entre os usuários conectados.
- **Persistência de mensagens**: As mensagens enviadas são armazenadas no **Firebase Realtime Database**. No momento, as mensagens ainda não são criptografadas, mas cuidaremos disso em atualizações futuras.

## Tecnologias Usadas
- **Node.js** com **Express**
- **Firebase Realtime Database** para armazenamento de dados
- **Socket.IO** para comunicação em tempo real
- **dotenv** para variáveis de ambiente
- **nodemailer** para envio de emails
- _Outras dependências_

### Contribuições
Este projeto é de **código aberto** e qualquer contribuição é bem-vinda. Se você deseja melhorar ou adicionar novas funcionalidades, fique à vontade para enviar um pull request.

### Licença
Este projeto está licenciado sob a [Apache 2.0 License](LICENSE).