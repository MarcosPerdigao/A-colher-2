# A Colher

Aplicativo para casais feito com React Native, Expo Router, TypeScript e Firebase.

O fluxo atual usa cadastro, login e recuperação de senha por e-mail. Depois do cadastro, a pessoa cria um código de casal ou entra com o código do parceiro. O app inclui Mural de tarefas, Juiz, histórico de ações, notificações, Financeiro e Perfil.

## Preparação

1. Instale as dependências com `npm ci`.
2. Configure as variáveis públicas do projeto Expo: `EXPO_PUBLIC_API_KEY`, `EXPO_PUBLIC_AUTH_DOMAIN`, `EXPO_PUBLIC_PROJECT_ID`, `EXPO_PUBLIC_STORAGE_BUCKET`, `EXPO_PUBLIC_MESSAGING_SENDER_ID`, `EXPO_PUBLIC_APP_ID` e, se aplicável, `EXPO_PUBLIC_MEASUREMENT_ID`. O código lê essas variáveis em `firebaseConfig.ts`. Não coloque credenciais de administração do Firebase em variáveis `EXPO_PUBLIC_`.
3. Para build Android, forneça o `google-services.json` do projeto Firebase indicado por `app.json`. Confirme a configuração de credenciais e variáveis no EAS antes de gerar uma build.
4. Inicie com `npm start`. Para uma build de desenvolvimento, use o perfil `development` de `eas.json`.

## Verificações

- `npx tsc --noEmit`
- `npm run lint`
- `npx expo export --platform web` verifica o bundle web quando as dependências e variáveis necessárias estiverem disponíveis.

As rotas atuais ficam em `app/`: `index`, `onboarding`, `vincular` e as abas `mural`, `financeiro` e `perfil`. A lógica compartilhada fica em `src/services`, `src/hooks`, `src/context` e `src/components`.

O arquivo `google-services.json` já faz parte do histórico Git. `.gitignore` e `.easignore` não removem arquivos que foram versionados anteriormente. Revise o histórico e as permissões do projeto Firebase antes de mudar essa configuração; retirar o arquivo sem substituto quebra o build Android.
