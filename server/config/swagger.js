/**
 * Swagger/OpenAPI Configuration
 * Smeta Pro API Documentation
 * Version: 1.8.0
 */

import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Smeta Pro API',
      version: '1.15.0',
      description: `
        Professional Estimate Management System API - полная документация всех эндпоинтов.
        
        **Новые функции v1.15:**
        - 🌳 4-уровневая иерархия категорий в справочниках (Материалы, Работы)
        - 📊 Поддержка категорий в закупках и импорте/экспорте
        - 🏷️ Автоматический путь категории в API (category_full_path)
        
        **Новые функции v1.13:**
        - 📊 Виджет параметров объекта в смете
        - 🏠 Компактный выдвижной sidebar с итогами по помещениям
        - 🎨 Обновленные статусы проектов (5 статусов)
        - 📈 Улучшенная аналитика дашборда с русскими месяцами
        
        **Функции v1.10:**
        - 📊 Dashboard analytics (общий доход, прибыльность проектов)
        - 📈 Месячная статистика роста проектов
        - 🔢 Данные по графикам "Общий рост" и "Проекты в работе"
      `,
      contact: {
        name: 'API Support',
        email: 'support@smeta-lab.ru',
      },
      license: {
        name: 'Proprietary',
        url: 'https://smeta-lab.ru/license',
      },
    },
    servers: [
      {
        url: 'https://smeta-lab.ru/api',
        description: 'Production Server',
      },
      {
        url: 'http://localhost:3001/api',
        description: 'Development Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT токен из /auth/login. Формат: Bearer {accessToken}',
        },
      },
      schemas: {
        // User Schema
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Уникальный ID пользователя',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Email пользователя',
            },
            emailVerified: {
              type: 'boolean',
              description: 'Email подтвержден?',
            },
            fullName: {
              type: 'string',
              description: 'Полное имя пользователя',
            },
            phone: {
              type: 'string',
              nullable: true,
              description: 'Телефон пользователя',
            },
            avatar_url: {
              type: 'string',
              nullable: true,
              description: 'URL аватара',
            },
            tenantId: {
              type: 'string',
              format: 'uuid',
              description: 'ID компании (tenant)',
            },
          },
          required: ['id', 'email', 'fullName'],
        },

        // Project Schema
        Project: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            name: {
              type: 'string',
              description: 'Название проекта',
            },
            description: {
              type: 'string',
              nullable: true,
              description: 'Описание проекта',
            },
            status: {
              type: 'string',
              enum: ['planning', 'approval', 'in_progress', 'rejected', 'completed'],
              description: 'Статус проекта: planning (Планирование), approval (Согласование), in_progress (В работе), rejected (Отказ), completed (Завершено)',
            },
            startDate: {
              type: 'string',
              format: 'date',
              nullable: true,
            },
            endDate: {
              type: 'string',
              format: 'date',
              nullable: true,
            },
            client: {
              type: 'string',
              description: 'Название клиента',
            },
            contractor: {
              type: 'string',
              description: 'Название подрядчика',
            },
            address: {
              type: 'string',
              nullable: true,
              description: 'Адрес объекта',
            },
            totalBudget: {
              type: 'number',
              format: 'decimal',
              nullable: true,
              description: 'Общий бюджет проекта',
            },
          },
          required: ['name', 'status', 'client', 'contractor'],
        },

        // Estimate Schema
        Estimate: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            projectId: {
              type: 'string',
              format: 'uuid',
              description: 'ID проекта',
            },
            name: {
              type: 'string',
              description: 'Название сметы',
            },
            description: {
              type: 'string',
              nullable: true,
            },
            estimateNumber: {
              type: 'string',
              description: 'Номер сметы',
            },
            estimateDate: {
              type: 'string',
              format: 'date',
            },
            totalAmount: {
              type: 'number',
              format: 'decimal',
              description: 'Общая сумма сметы',
            },
            status: {
              type: 'string',
              enum: ['draft', 'approved', 'in_progress', 'completed', 'cancelled'],
            },
            estimateType: {
              type: 'string',
              enum: ['full', 'preliminary', 'detailed', 'final'],
            },
          },
          required: ['projectId', 'name', 'estimateNumber', 'estimateDate'],
        },

        // Material Schema
        Material: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'ID материала',
            },
            sku: {
              type: 'string',
              description: 'Артикул материала',
            },
            name: {
              type: 'string',
              description: 'Название материала',
            },
            unit: {
              type: 'string',
              description: 'Единица измерения',
            },
            category: {
              type: 'string',
              nullable: true,
              description: 'Название категории (устаревшее)',
            },
            category_id: {
              type: 'string',
              format: 'uuid',
              nullable: true,
              description: 'ID иерархической категории',
            },
            category_full_path: {
              type: 'string',
              nullable: true,
              description: 'Полный путь категории (Уровень 1 / Уровень 2 / ...)',
            },
            price: {
              type: 'number',
              format: 'decimal',
              description: 'Цена за единицу',
            },
            supplier: {
              type: 'string',
              nullable: true,
            },
            image: {
              type: 'string',
              nullable: true,
              description: 'URL изображения',
            },
            isGlobal: {
              type: 'boolean',
              description: 'Глобальный материал?',
            },
          },
          required: ['sku', 'name', 'unit', 'price'],
        },

        // Work Schema
        Work: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
            },
            code: {
              type: 'string',
              description: 'Код работы',
            },
            name: {
              type: 'string',
              description: 'Название работы',
            },
            unit: {
              type: 'string',
              description: 'Единица измерения',
            },
            category: {
              type: 'string',
              nullable: true,
              description: 'Название категории (устаревшее)',
            },
            category_id: {
              type: 'string',
              format: 'uuid',
              nullable: true,
              description: 'ID иерархической категории',
            },
            basePrice: {
              type: 'number',
              format: 'decimal',
              description: 'Базовая цена',
            },
            isGlobal: {
              type: 'boolean',
              description: 'Глобальная работа?',
            },
          },
          required: ['code', 'name', 'unit', 'basePrice'],
        },

        // Success Response Schema
        SuccessResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              description: 'Сообщение об успехе',
            },
            data: {
              type: 'object',
              description: 'Данные ответа',
            },
          },
        },

        // Error Response Schema
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'string',
              description: 'Сообщение об ошибке',
            },
            message: {
              type: 'string',
              description: 'Детали ошибки',
            },
          },
        },

        // Password Reset Request Schema
        PasswordResetRequest: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'Email пользователя для сброса пароля',
              example: 'user@example.com',
            },
          },
          required: ['email'],
        },

        // Password Reset Schema
        PasswordReset: {
          type: 'object',
          properties: {
            token: {
              type: 'string',
              description: 'Токен сброса пароля из email',
              example: 'abc123def456ghi789',
            },
            password: {
              type: 'string',
              minLength: 8,
              description: 'Новый пароль (минимум 8 символов)',
              example: 'NewSecurePassword123',
            },
          },
          required: ['token', 'password'],
        },

        // Token Validation Schema
        TokenValidation: {
          type: 'object',
          properties: {
            token: {
              type: 'string',
              description: 'Токен для проверки',
              example: 'abc123def456ghi789',
            },
          },
          required: ['token'],
        },

        // Password Reset Response Schema
        PasswordResetResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              description: 'Сообщение об успешном сбросе пароля',
            },
            data: {
              type: 'object',
              properties: {
                email: {
                  type: 'string',
                  format: 'email',
                  description: 'Email пользователя',
                },
                resetAt: {
                  type: 'string',
                  format: 'date-time',
                  description: 'Время сброса пароля',
                },
              },
            },
          },
        },

        // Token Validation Response Schema
        TokenValidationResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              description: 'Статус токена',
            },
            data: {
              type: 'object',
              properties: {
                valid: {
                  type: 'boolean',
                  description: 'Токен действителен?',
                },
                email: {
                  type: 'string',
                  format: 'email',
                  description: 'Email пользователя',
                },
                expiresAt: {
                  type: 'string',
                  format: 'date-time',
                  description: 'Время истечения токена',
                },
                timeRemaining: {
                  type: 'string',
                  description: 'Оставшееся время действия',
                },
              },
            },
          },
        },

        // Pagination Response Schema
        PaginatedResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            count: {
              type: 'integer',
              description: 'Количество записей на странице',
            },
            total: {
              type: 'integer',
              description: 'Всего записей',
            },
            page: {
              type: 'integer',
              description: 'Текущая страница',
            },
            pageSize: {
              type: 'integer',
              description: 'Размер страницы',
            },
            totalPages: {
              type: 'integer',
              description: 'Всего страниц',
            },
            data: {
              type: 'array',
              items: {},
              description: 'Массив данных',
            },
            cached: {
              type: 'boolean',
              description: 'Данные из кэша?',
            },
          },
        },

        // Dashboard Analytics Schemas
        TotalIncomeResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            data: {
              type: 'object',
              properties: {
                totalIncomeWorks: {
                  type: 'number',
                  description: 'Общий доход от работ',
                  example: 939157.50,
                },
                totalIncomeMaterials: {
                  type: 'number',
                  description: 'Общий доход от материалов',
                  example: 2485623.45,
                },
              },
            },
          },
        },

        ProjectProfitData: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'ID проекта',
            },
            name: {
              type: 'string',
              description: 'Название проекта',
            },
            status: {
              type: 'string',
              description: 'Статус проекта',
            },
            totalProfit: {
              type: 'number',
              description: 'Общая прибыль',
            },
            worksProfit: {
              type: 'number',
              description: 'Прибыль от работ',
            },
            materialsProfit: {
              type: 'number',
              description: 'Прибыль от материалов',
            },
            totalIncome: {
              type: 'number',
              description: 'Общий доход',
            },
            totalExpense: {
              type: 'number',
              description: 'Общий расход',
            },
            profitPercentage: {
              type: 'number',
              description: 'Процент прибыльности',
            },
            isProfit: {
              type: 'boolean',
              description: 'Является ли проект прибыльным',
            },
          },
        },

        MonthlyGrowthData: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            data: {
              type: 'object',
              properties: {
                months: {
                  type: 'array',
                  items: {
                    type: 'string',
                  },
                  description: 'Названия месяцев на русском',
                  example: ['Дек', 'Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя'],
                },
                series: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: {
                        type: 'string',
                        description: 'Название серии данных',
                      },
                      data: {
                        type: 'array',
                        items: {
                          type: 'number',
                        },
                        description: 'Значения по месяцам (в тысячах рублей)',
                      },
                    },
                  },
                  description: 'Серии данных для графика',
                },
              },
            },
          },
        },

        ProjectsChartData: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            data: {
              type: 'object',
              properties: {
                categories: {
                  type: 'array',
                  items: {
                    type: 'string',
                  },
                  description: 'Названия месяцев на русском',
                  example: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'],
                },
                series: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: {
                        type: 'string',
                        description: 'Статус проекта',
                        enum: ['Планирование', 'Согласование', 'В работе', 'Отказ', 'Завершено'],
                      },
                      data: {
                        type: 'array',
                        items: {
                          type: 'integer',
                        },
                        description: 'Количество проектов по месяцам',
                      },
                    },
                  },
                  description: '5 серий данных по статусам проектов',
                },
              },
            },
          },
        },

        ProjectStats: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            data: {
              type: 'object',
              properties: {
                total: {
                  type: 'integer',
                  description: 'Всего проектов',
                  example: 24,
                },
                planning: {
                  type: 'integer',
                  description: 'Проектов в планировании',
                  example: 5,
                },
                approval: {
                  type: 'integer',
                  description: 'Проектов на согласовании',
                  example: 3,
                },
                in_progress: {
                  type: 'integer',
                  description: 'Проектов в работе',
                  example: 12,
                },
                rejected: {
                  type: 'integer',
                  description: 'Отказанных проектов',
                  example: 1,
                },
                completed: {
                  type: 'integer',
                  description: 'Завершенных проектов',
                  example: 3,
                },
              },
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'Аутентификация и авторизация пользователей',
      },
      {
        name: 'Email Verification',
        description: 'Верификация email адресов',
      },
      {
        name: 'Password Reset',
        description: 'Восстановление и сброс пароля',
      },
      {
        name: 'Users',
        description: 'Управление пользователями (Admin only)',
      },
      {
        name: 'Projects',
        description: 'Управление проектами (5 статусов: planning, approval, in_progress, rejected, completed)',
      },
      {
        name: 'Dashboard Analytics',
        description: 'Аналитика для дашборда: общий доход, прибыльность проектов, месячный рост, статистика проектов',
      },
      {
        name: 'Estimates',
        description: 'Управление сметами',
      },
      {
        name: 'Excel Export',
        description: 'Экспорт смет в Excel с профессиональным форматированием',
      },
      {
        name: 'Materials',
        description: 'Справочник материалов',
      },
      {
        name: 'Works',
        description: 'Справочник работ',
      },
      {
        name: 'Work Materials',
        description: 'Связи работ и материалов',
      },
      {
        name: 'Object Parameters',
        description: 'Параметры помещений объекта (площади, откосы, проемы). Используется в виджете сметы.',
      },
      {
        name: 'Purchases',
        description: 'Закупки материалов (план)',
      },
      {
        name: 'Global Purchases',
        description: 'Глобальные закупки (факт)',
      },
      {
        name: 'Schedules',
        description: 'Графики работ',
      },
      {
        name: 'Work Completion Acts',
        description: 'Акты выполненных работ (КС-2, КС-3)',
      },
      {
        name: 'Counterparties',
        description: 'Контрагенты',
      },
      {
        name: 'Health',
        description: 'Проверка состояния API',
      },
      {
        name: 'Admin',
        description: 'Административные функции (super_admin only): миграции, синхронизация Pinecone',
      },
      {
        name: 'Contracts',
        description: 'Управление договорами подряда с автозаполнением из контрагентов',
      },
      {
        name: 'Estimate Templates',
        description: 'Шаблоны смет для быстрого создания типовых работ',
      },
      {
        name: 'Permissions',
        description: 'Управление разрешениями и правами доступа пользователей',
      },
      {
        name: 'Roles',
        description: 'Управление ролями пользователей в системе',
      },
      {
        name: 'Tenants',
        description: 'Управление компаниями (тенантами) и их настройками',
      },
      {
        name: 'Work Completions',
        description: 'Отслеживание процента выполнения работ по сметам',
      },
      {
        name: 'Search',
        description: 'Семантический и умный AI-поиск по справочникам (OpenAI + Pinecone)',
      },
    ],
  },
  apis: [
    './server/controllers/*.js',         // Контроллеры с JSDoc комментариями
    './server/routes/*.js',              // Роуты (если есть дополнительная документация)
    './server/config/swagger-*.js',      // Дополнительные файлы документации
  ],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
