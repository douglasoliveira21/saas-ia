# Extensão SolvitSoft IA para Chrome e Edge

## Instalar para teste

1. Baixe ou clone o repositório.
2. Chrome: abra `chrome://extensions`. Edge: abra `edge://extensions`.
3. Ative **Modo do desenvolvedor**.
4. Clique em **Carregar sem compactação**.
5. Selecione a pasta `browser-extension`.
6. Fixe o ícone SolvitSoft na barra e clique nele para abrir o painel lateral.
7. Entre com sua conta SolvitSoft.

## Permissões e privacidade

- `activeTab`: acesso temporário apenas à aba em que o usuário acionou a extensão.
- `scripting`: extrai título, URL, seleção e texto visível sob demanda.
- `sidePanel`: exibe o painel lateral.
- `storage`: guarda a sessão SolvitSoft na área privada da extensão.
- Captura de tela é opcional e somente ocorre quando marcada.
- Páginas internas `chrome://`, `edge://` e lojas de extensões não são lidas.

Para publicar, compacte os arquivos da pasta (sem incluir a pasta pai) e envie ao Chrome Web Store Developer Dashboard e ao Microsoft Edge Add-ons Partner Center, fornecendo política de privacidade e justificativas das permissões.
