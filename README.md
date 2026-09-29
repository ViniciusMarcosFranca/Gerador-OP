# Gerador de OPs (Ordem de Produção)

Este é um sistema Full Stack para geração e controle de Ordens de Produção, construído com React, Vite, Tailwind CSS e Supabase.

## 🚀 Tecnologias Utilizadas

- **Frontend:** React.js, Vite, Tailwind CSS, React Router DOM, Lucide React (Ícones).
- **Backend/Database:** Supabase (PostgreSQL, Authentication, Row Level Security).
- **Deploy:** Vercel (Pronto para uso).

## 📦 Como fazer o Deploy na Vercel

1. Suba esta pasta para um repositório no **GitHub**.
2. Acesse sua conta na [Vercel](https://vercel.com/) e clique em **Add New... > Project**.
3. Importe o repositório do GitHub recém-criado.
4. A Vercel detectará automaticamente que é um projeto **Vite**.
5. Vá em **Environment Variables** (Variáveis de Ambiente) no Vercel e adicione as duas variáveis do Supabase:
   - `VITE_SUPABASE_URL`: (Sua URL do projeto Supabase)
   - `VITE_SUPABASE_ANON_KEY`: (Sua chave anon pública do Supabase)
6. Clique em **Deploy**. O Vercel lidará com todas as dependências (`npm install` e `npm run build`) automaticamente, graças ao `package.json` configurado!

## 🗄️ Configuração do Banco de Dados (Supabase)

1. Crie um projeto gratuito no [Supabase](https://supabase.com/).
2. Vá até a aba **SQL Editor** no painel do Supabase.
3. Copie todo o conteúdo do arquivo `supabase/schema.sql` (encontrado nesta pasta).
4. Cole no SQL Editor e clique em **Run**. Isso criará todas as tabelas, relacionamentos e regras de segurança necessárias.
5. Vá em **Authentication > Providers** e certifique-se de que o Email Provider está ativo (desative o "Confirm email" temporariamente se quiser testar o login sem precisar confirmar o email).

## 🛠️ Como rodar localmente (Requer Node.js instalado)

Caso deseje rodar no seu computador (se tiver o Node.js instalado):
1. Abra o terminal nesta pasta.
2. Rode `npm install`
3. Crie um arquivo `.env` baseado no `.env.example` com suas chaves do Supabase.
4. Rode `npm run dev`
