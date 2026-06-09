# Implementação do Sistema de Notificações - Guardian2

## 1. Instalação
Instale as dependências necessárias via npm:
`npm install @guardian2/notifications --save`

## 2. Estrutura de Diretórios
/src/notifications/
  ├── config.js
  ├── service.js
  └── templates.js

## 3. Integração no HTML Principal
Adicione o script no final do seu arquivo index.html:
<script src="/assets/js/notifications-init.js"></script>

## 4. Configuração de Permissões
Solicite permissão ao usuário antes de inicializar:
Notification.requestPermission().then(permission => {
  if (permission === 'granted') {
    console.log('Permissão concedida');
  }
});

## 5. Exemplos de Uso
import { notify } from '@guardian2/notifications';

notify({
  title: 'Alerta de Sistema',
  body: 'O Guardian2 detectou uma nova atividade.',
  icon: '/assets/img/icon.png'
});

## 6. Endpoints Disponíveis
- POST /api/v1/notifications/send: Envia notificação push.
- GET /api/v1/notifications/history: Lista histórico de alertas.

## 7. Troubleshooting
- Verifique se o HTTPS está ativo (necessário para Service Workers).
- Certifique-se de que o navegador não bloqueou notificações nas configurações de site.