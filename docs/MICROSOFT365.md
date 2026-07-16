# Integração SolvitSoft com Microsoft 365

## 1. Registrar no Microsoft Entra ID

1. Acesse `https://entra.microsoft.com`.
2. Entre em **Identity > Applications > App registrations > New registration**.
3. Nome: `SolvitSoft Microsoft 365`.
4. Escolha contas organizacionais e pessoais (`common`) ou somente seu tenant.
5. Cadastre a URI Web: `https://api.solvitsoft.com.br/api/v1/microsoft/callback`.
6. Copie **Application (client) ID**.
7. Em **Certificates & secrets**, crie um Client secret e copie o valor imediatamente.
8. Em **Authentication**, habilite ID tokens. Não habilite implicit grant para access tokens.

## 2. Permissões delegadas do Microsoft Graph

Em **API permissions > Add permission > Microsoft Graph > Delegated permissions**, adicione:

```text
openid
profile
email
offline_access
User.Read
Files.ReadWrite
Mail.ReadWrite
Mail.Send
Calendars.ReadWrite
Contacts.ReadWrite
```

Use permissões delegadas, não permissões de aplicação. Se a política do cliente exigir, o administrador deve clicar em **Grant admin consent**. SharePoint amplo é opcional; prefira acesso delegado/selecionado e menor privilégio.

## 3. EasyPanel

No backend e no worker:

```env
MICROSOFT_CLIENT_ID=ID_DA_APLICACAO
MICROSOFT_CLIENT_SECRET=SEGREDO_DA_APLICACAO
MICROSOFT_TENANT_ID=common
MICROSOFT_REDIRECT_URI=https://api.solvitsoft.com.br/api/v1/microsoft/callback
```

Reimplante backend, worker e frontend. O backend executa `alembic upgrade head` e cria `microsoft_connections`. Access e refresh tokens são criptografados com uma chave derivada de `SECRET_KEY`; trocar `SECRET_KEY` invalida os tokens existentes.

## 4. Testar OAuth

1. Entre na SolvitSoft.
2. Abra **Perfil > Configurações > Microsoft 365**.
3. Clique em **Entrar com Microsoft 365**.
4. Autorize as permissões.
5. Confirme o retorno ao dashboard e o e-mail conectado.
6. Revogue em **My Account > Privacy > Apps and services** para testar reconexão.

## 5. Endpoints Graph disponíveis

```text
GET    /api/v1/microsoft/status
GET    /api/v1/microsoft/connect
DELETE /api/v1/microsoft
GET    /api/v1/microsoft/files
GET    /api/v1/microsoft/mail
POST   /api/v1/microsoft/mail/drafts
GET    /api/v1/microsoft/calendar
GET    /api/v1/microsoft/contacts
GET    /api/v1/microsoft/excel/{item_id}/range?address=A1:D20
PATCH  /api/v1/microsoft/excel/{item_id}/range?address=A1:D20
```

O backend renova access tokens automaticamente com o refresh token. Tokens Microsoft nunca são enviados ao frontend.

## 6. Testar o Office Add-in localmente

Os arquivos estão em `frontend/public/office-addin`.

1. Reimplante o frontend e confirme:
   - `https://app.solvitsoft.com.br/office-addin/taskpane.html`
   - `https://app.solvitsoft.com.br/office-addin/manifest.xml`
   - `https://app.solvitsoft.com.br/office-addin/manifest-outlook.xml`
2. No Word/Excel/PowerPoint web, use **Add-ins > More Add-ins > My Add-ins > Upload My Add-in** e envie `manifest.xml`.
3. No Outlook, envie `manifest-outlook.xml`.
4. Abra o painel **SolvitSoft IA**, faça login e teste leitura e inserção.

Para desenvolvimento localhost, use HTTPS confiável, troque as URLs dos manifests/taskpane e execute o frontend. Office bloqueia conteúdo HTTP.

## 7. Publicar para clientes

### Organização específica

1. O administrador acessa o Microsoft 365 Admin Center.
2. **Settings > Integrated apps > Upload custom apps**.
3. Envia os manifests.
4. Escolhe usuários/grupos ou toda a organização.
5. Publica. A propagação pode levar algumas horas.

### Microsoft Marketplace

Crie uma oferta Office Add-in no Partner Center, forneça manifests, política de privacidade, termos, suporte, conta de teste e passe pela certificação. Use domínios HTTPS estáveis e publique cada atualização de manifesto conforme as regras da certificação.

## 8. Segurança e operação

- Use sempre HTTPS.
- Preserve uma `SECRET_KEY` forte e estável.
- Nunca registre access tokens, refresh tokens ou authorization codes em logs.
- Solicite apenas permissões necessárias.
- Use consentimento delegado e permita desconexão.
- Revogue/exclua tokens quando a conta SolvitSoft for apagada.
- Restrinja CORS aos domínios da SolvitSoft.
- Faça rotação do Client secret antes do vencimento.
- Monitore falhas de refresh e respostas 401/403 do Graph.
- Valide IDs e intervalos antes de operações de escrita.
- Para clientes regulados, use tenant específico e aprovação administrativa.

## 9. Fluxo

```text
Usuário -> Office Add-in/Office.js -> API SolvitSoft -> IA SolvitSoft
        -> resposta -> Office.js -> Word/Excel/Outlook/PowerPoint

Usuário -> Entra ID OAuth -> API SolvitSoft -> token criptografado
API SolvitSoft -> Microsoft Graph -> arquivos/e-mail/calendário/contatos
```

Não há Microsoft Copilot ou Copilot Studio neste fluxo.
