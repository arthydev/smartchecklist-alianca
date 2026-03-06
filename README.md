<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1Mr9eWxCJaQexsfz-nhVYTG69xCsJFiPz

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Auth (session + cookie HttpOnly)

- O frontend não usa mais `localStorage` para usuário/permissões.
- Fluxo atual de autenticação:
  1. `POST /api/auth/login` cria a sessão no backend PHP.
  2. `GET /api/auth/me` recupera o usuário autenticado no boot do app.
  3. `POST /api/auth/logout` encerra a sessão.
- As chamadas HTTP enviam cookie com `credentials: 'include'`.

## Run Front + PHP backend

1. Suba o backend PHP:
   `php -S localhost:3001 -t backend-php/public`
2. Suba o frontend:
   `npm run dev`
3. O Vite usa proxy local (`/api -> http://localhost:3001`), então o frontend chama apenas `/api/*`.
4. Acesse o app no Vite (`http://localhost:3000`) e valide autenticação via `/api/auth/*`.

## Backend Node (legado arquivado)

- O backend Node/Express foi movido para `legacy/server-node`.
- Para uso local do app, **não é mais necessário iniciar o backend Node**.
- Fluxo local oficial:
  - Backend PHP em `localhost:3001`
  - Frontend Vite em `localhost:3000` com proxy `/api`.
