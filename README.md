# 🥄 A Colher (Meter a Colher)

> **Organize a vida a dois sem tretas.** > O app definitivo para casais que querem dividir tarefas, resolver impasses e gamificar a convivência.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React Native](https://img.shields.io/badge/React_Native-0.76-61DAFB.svg?logo=react)
![Expo](https://img.shields.io/badge/Expo-Router-black.svg?logo=expo)
![Firebase](https://img.shields.io/badge/Firebase-Firestore-FFCA28.svg?logo=firebase)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6.svg?logo=typescript)

---

## 📖 Sobre o Projeto

**A Colher** é um aplicativo mobile desenvolvido para ajudar casais a gerenciarem as responsabilidades domésticas de forma leve e divertida. 

Chega de discussões sobre quem vai lavar a louça! Com o recurso **"O Juiz"**, o app decide por vocês. Além disso, o **Mural da Discórdia** permite listar, priorizar e concluir tarefas, mantendo tudo sincronizado em tempo real entre os parceiros.

## ✨ Funcionalidades Principais

* 🔐 **Login & Autenticação:** Acesso seguro (Integração Google).
* ❤️ **Sincronização de Casal:** Sistema inteligente de vinculação via **Código Único (#A1B2)**. Um cria, o outro entra, e o app conecta os dois magicamente.
* 📝 **Mural da Discórdia:**
    * Adicione tarefas com data e observações.
    * Defina prioridades: *Suave*, *Atenção* ou *Pra Ontem!*.
    * Filtre entre pendentes e concluídas.
* ⚖️ **O Juiz:** Ferramenta de sorteio imparcial para decidir quem executa uma tarefa na hora do impasse.
* 📊 **Gamificação (Em breve):** Sistema de pontuação e níveis para o casal.

## 🛠️ Tecnologias Utilizadas

Este projeto foi construído com as tecnologias mais modernas do ecossistema React Native:

* **[React Native](https://reactnative.dev/)** + **[Expo](https://expo.dev/)**: Para desenvolvimento ágil e compatibilidade iOS/Android.
* **[Expo Router](https://docs.expo.dev/router/introduction/)**: Navegação baseada em arquivos (File-based routing), similar ao Next.js.
* **[Firebase](https://firebase.google.com/)**:
    * **Firestore**: Banco de dados NoSQL em tempo real para tarefas e usuários.
    * **Auth**: Gerenciamento de autenticação.
* **[TypeScript](https://www.typescriptlang.org/)**: Tipagem estática para código mais seguro e escalável.
* **AsyncStorage**: Persistência de sessão local.

## 🚀 Como Rodar o Projeto

### Pré-requisitos
* Node.js instalado.
* Conta no Firebase configurada.

### Passo a Passo

1.  **Clone o repositório:**
    ```bash
    git clone [https://github.com/MarcosPerdigao/A-colher-2.git](https://github.com/MarcosPerdigao/A-colher-2.git)
    cd A-colher-2
    ```

2.  **Instale as dependências:**
    ```bash
    npm install
    # ou
    yarn install
    ```

3.  **Configure o Firebase:**
    * Crie um arquivo `firebaseConfig.ts` na raiz do projeto (baseado no `firebaseConfig.example.ts`).
    * Insira suas chaves de API do Firebase Console.

4.  **Execute o projeto:**
    ```bash
    npx expo start
    ```
    * Escaneie o QR Code com o app **Expo Go** (Android/iOS) ou rode no emulador.

## 📂 Estrutura de Pastas

A estrutura segue o padrão do **Expo Router**:

