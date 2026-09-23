# Análise de Desempenho Mktplace — Pavoni + Supabase

Este pacote transforma a aplicação em uma versão com banco centralizado.

## Arquivos

- `index.html` — aplicação.
- `config.js` — onde você coloca a URL e a chave pública do Supabase.
- `supabase-adapter.js` — integração com login e banco.
- `01_supabase_schema.sql` — cria tabelas e regras de segurança.
- `02_cadastrar_perfis.sql` — vincula os usuários Matheus, Carlos, Noemy e Yasmin.

## Como configurar

### 1. Crie um projeto no Supabase

Acesse o Supabase e crie um projeto novo para a aplicação.

Não é necessário criar tabelas manualmente pela interface.

### 2. Crie as tabelas

No Supabase:

`SQL Editor` → `New query`

Cole todo o conteúdo do arquivo:

`01_supabase_schema.sql`

Execute.

Isso cria:

- `profiles`
- `performance_evaluations`
- regras de segurança RLS
- permissões para usuários autenticados

### 3. Crie os usuários

Vá em:

`Authentication` → `Users` → `Add user`

Crie quatro usuários:

- Matheus
- Carlos
- Noemy
- Yasmin

Use os e-mails corporativos que você quiser utilizar.

Defina uma senha inicial para cada um.

Para uso interno, é mais simples criar os usuários manualmente e não permitir cadastro público.

### 4. Pegue os UUIDs dos usuários

Na tela de usuários, cada conta terá um `User UID`.

Copie os quatro UUIDs.

Abra o arquivo:

`02_cadastrar_perfis.sql`

Troque:

- `<UUID_MATHEUS>`
- `<UUID_CARLOS>`
- `<UUID_NOEMY>`
- `<UUID_YASMIN>`

pelos UUIDs reais.

Depois rode esse SQL no `SQL Editor`.

### 5. Pegue as credenciais públicas do projeto

No Supabase, abra:

`Project Settings` → `API`

Você precisará de:

- Project URL
- anon/public key (ou publishable key, conforme aparecer no painel)

Abra `config.js` e substitua:

`COLE_AQUI_A_PROJECT_URL`

e

`COLE_AQUI_A_ANON_PUBLIC_KEY`

Não coloque a chave `service_role` no HTML ou no config.js.

### 6. Publique os arquivos

Para uso real no celular e computador, publique a pasta em um host estático.

Pode usar, por exemplo:

- Vercel
- Netlify
- GitHub Pages

Os quatro arquivos principais precisam ficar juntos na mesma pasta:

`index.html`
`config.js`
`supabase-adapter.js`

Os arquivos SQL não precisam ser publicados.

### 7. Teste

Faça primeiro estes testes:

1. Entre com Carlos.
2. Confirme que ele consegue fazer apenas a própria autoavaliação.
3. Entre com Noemy e faça o mesmo.
4. Entre com Yasmin e faça o mesmo.
5. Entre com Matheus.
6. Confirme que aparecem Carlos, Noemy e Yasmin para avaliação da liderança.
7. Salve uma análise de cada um.
8. Confira Histórico e Comparar no usuário de Matheus.

## Regras de acesso configuradas

### Matheus / gestor

Pode:

- visualizar as avaliações do time;
- fazer avaliações da liderança;
- comparar resultados;
- consultar histórico;
- excluir avaliações.

### Carlos, Noemy e Yasmin

Podem:

- entrar com conta própria;
- fazer a própria autoavaliação;
- visualizar as próprias autoavaliações.

Eles não recebem, pelo banco, acesso às avaliações da liderança feitas pelo gestor.

## Onde os dados ficam

As avaliações ficam em:

`public.performance_evaluations`

As respostas das 12 perguntas ficam salvas no campo `answers` em JSON.

Exemplo:

```json
{
  "q1": 3,
  "q2": 4,
  "q3": 2
}
```

A nota final também é salva no campo `score`.

## Segurança

A aplicação usa a chave pública do Supabase junto com autenticação e RLS.

A chave pública pode ficar no frontend.

Nunca coloque `service_role` no frontend.

## Próximo passo possível

Depois de validar essa etapa, a estrutura já permite acrescentar:

- Nine Box;
- ciclos de avaliação;
- fechamento de período;
- histórico anual;
- notas por dimensão;
- gráfico de evolução;
- plano de desenvolvimento individual.
