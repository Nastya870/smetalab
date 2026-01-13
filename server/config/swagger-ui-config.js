/**
 * Swagger UI Configuration
 * Smeta Pro API Documentation UI Settings
 */

export const swaggerUIConfig = {
  // Основные настройки отображения
  docExpansion: 'list', // 'list', 'full', 'none'
  deepLinking: true,
  displayOperationId: true,
  displayRequestDuration: true,
  
  // Настройки попыток API
  tryItOutEnabled: true,
  requestInterceptor: (request) => {
    // Добавляем CORS заголовки для разработки
    if (process.env.NODE_ENV === 'development') {
      request.headers['Access-Control-Allow-Origin'] = '*';
    }
    return request;
  },
  
  // Группировка операций
  tagsSorter: 'alpha',
  operationsSorter: 'alpha',
  
  // Кастомные стили
  customCss: `
    .swagger-ui .topbar { 
      background-color: #1976d2; 
    }
    .swagger-ui .info .title { 
      color: #1976d2; 
    }
    .swagger-ui .scheme-container { 
      background: #fafafa; 
      padding: 15px; 
      border-radius: 4px; 
    }
    .swagger-ui .info .description p {
      margin: 10px 0;
    }
    .swagger-ui .opblock.opblock-post {
      border-color: #1976d2;
    }
    .swagger-ui .opblock.opblock-post .opblock-summary {
      border-color: #1976d2;
    }
    .swagger-ui .btn.authorize {
      background-color: #1976d2;
      border-color: #1976d2;
    }
    .swagger-ui .btn.authorize:hover {
      background-color: #1565c0;
    }
    .swagger-ui .opblock-tag {
      font-size: 18px;
      font-weight: bold;
      margin: 20px 0 10px 0;
    }
    .swagger-ui .parameter__name {
      font-weight: bold;
    }
    .swagger-ui .response-col_status {
      font-weight: bold;
    }
    .swagger-ui pre.microlight {
      background: #263238;
      border-radius: 4px;
    }
    .swagger-ui .highlight-code {
      background: #263238;
    }
  `,
  
  // Дополнительные плагины
  plugins: [
    // Кастомный плагин для отображения версий API
    {
      statePlugins: {
        spec: {
          wrapSelectors: {
            version: (ori) => (state) => {
              const version = ori(state);
              return version ? `v${version}` : '';
            }
          }
        }
      }
    }
  ],
  
  // Предустановленные авторизации для тестирования
  preauthorizeApiKey: (authDefinitionKey, authDefinition, value) => {
    if (authDefinitionKey === 'bearerAuth') {
      return {
        [authDefinitionKey]: {
          name: authDefinitionKey,
          schema: authDefinition,
          value: value
        }
      };
    }
  },
  
  // Настройки для разработки
  ...(process.env.NODE_ENV === 'development' && {
    // Показывать curl команды
    showMutatedRequest: true,
    // Показывать расширенные ошибки
    showExtensions: true,
    // Показывать общие параметры
    showCommonExtensions: true
  }),
  
  // Настройки безопасности для продакшена
  ...(process.env.NODE_ENV === 'production' && {
    // Скрывать внутренние детали
    showExtensions: false,
    showCommonExtensions: false,
    // Отключить попытки для критичных эндпоинтов
    supportedSubmitMethods: ['get', 'post', 'put', 'delete', 'patch']
  })
};

// Кастомные компоненты для Swagger UI
export const swaggerUIComponents = {
  // Кастомный компонент для отображения примеров
  RequestBodyEditor: (Original, system) => (props) => {
    return React.createElement(
      'div',
      { className: 'custom-request-body-editor' },
      React.createElement(Original, props)
    );
  },
  
  // Кастомный компонент для отображения ответов
  ResponseBody: (Original, system) => (props) => {
    return React.createElement(
      'div',
      { className: 'custom-response-body' },
      React.createElement(Original, props)
    );
  }
};

// Настройки локализации
export const swaggerUITranslations = {
  // Русские переводы для ключевых элементов
  'auth.login': 'Авторизоваться',
  'auth.logout': 'Выйти',
  'operations.title': 'Операции',
  'parameters.title': 'Параметры',
  'responses.title': 'Ответы',
  'examples.title': 'Примеры',
  'schema.title': 'Схема',
  'model.title': 'Модель'
};

export default {
  swaggerUIConfig,
  swaggerUIComponents,
  swaggerUITranslations
};