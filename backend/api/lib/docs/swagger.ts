/**
 * Dokumentacja API w formacie OpenAPI 3.0.
 */
export const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'SolidHome API Doc',
    version: '1.0.0',
    description: 'Dokumentacja REST API oraz Server-Sent Events (SSE) dla systemu.',
  },
  servers: [
    {
      url: 'http://localhost:3100',
      description: 'Dev serwer',
    },
  ],
  tags: [
    { name: 'System (Health)', description: 'Status działania serwera' },
    {
      name: 'Uwierzytelnianie (Auth)',
      description: 'Logowanie, odświeżanie tokenów i wylogowanie',
    },
    {
      name: 'Użytkownik (User)',
      description: 'Rejestracja, aktualizacja profilu oraz reset hasła',
    },
    { name: 'Oświetlenie - Sterowanie', description: 'Pobieranie i zmiana stanu lamp' },
    { name: 'Oświetlenie - Historia', description: 'Rejestr zdarzeń przełączania oświetlenia' },
    { name: 'Oświetlenie - Energia', description: 'Statystyki zużycia energii elektrycznej' },
    {
      name: 'Oświetlenie - Harmonogram',
      description: 'Reguły automatycznego włączania/wyłączania świateł',
    },
    { name: 'Oświetlenie - Sceny', description: 'Zdefiniowane profile i sceny oświetleniowe' },
    { name: 'Zdarzenia (SSE)', description: 'Strumień Server-Sent Events w czasie rzeczywistym' },
    {
      name: 'System (Sprzęt IoT)',
      description: 'Status połączenia z fizyczną płytką mikrokontrolera NXP',
    },
    {
      name: 'Powietrze (Air)',
      description: 'Bieżące odczyty i historia pomiarów z czujnika jakości powietrza',
    },
    {
      name: 'Pogoda (Weather)',
      description: 'Aktualna pogoda oraz 5-dniowa prognoza z OpenWeatherMap API',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Wpisz token JWT z endpointu /api/user/auth',
      },
    },
  },
  security: [
    {
      bearerAuth: [] as string[],
    },
  ],
  paths: {
    '/': {
      get: {
        tags: ['System (Health)'],
        summary: 'Sprawdzenie stanu serwera API (Health Check)',
        security: [] as Record<string, string[]>[],
        responses: {
          200: {
            description: 'Serwer działa poprawnie',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    message: { type: 'string', example: 'SolidHome API is running' },
                  },
                },
              },
            },
          },
        },
      },
    },

    '/api/hardware/status': {
      get: {
        tags: ['System (Sprzęt IoT)'],
        summary: 'Pobiera aktualny status fizycznej płytki mikrokontrolera (online / offline)',
        security: [] as Record<string, string[]>[],
        responses: {
          200: {
            description: 'Status połączenia z płytką',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    online: { type: 'boolean', example: true },
                  },
                },
              },
            },
          },
        },
      },
    },

    '/api/events': {
      get: {
        tags: ['Zdarzenia (SSE)'],
        summary: 'Otwiera strumień Server-Sent Events (SSE)',
        description:
          'Subskrypcja na żywo powiadomień z backendu (np. lights:light_updated, air itp.). Wymaga nagłówka Accept: text/event-stream oraz Bearer JWT.',
        responses: {
          200: {
            description: 'Strumień SSE nawiązany pomyślnie',
            content: {
              'text/event-stream': {
                schema: {
                  type: 'string',
                  example:
                    'event: lights:light_updated\\ndata: {"domain":"lights","event":"light_updated","data":{"name":"living_room","state":1}}\\n\\n',
                },
              },
            },
          },
          401: { description: 'Brak lub nieprawidłowy token JWT' },
          500: { description: 'Błąd nawiązania sesji SSE' },
        },
      },
    },

    '/api/user/auth': {
      post: {
        tags: ['Uwierzytelnianie (Auth)'],
        summary: 'Logowanie użytkownika',
        security: [] as Record<string, string[]>[],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['userName', 'password'],
                properties: {
                  userName: { type: 'string', example: 'admin' },
                  password: { type: 'string', example: 'password123' },
                  rememberMe: { type: 'boolean', example: true },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Zalogowano pomyślnie (zwraca token JWT)' },
          400: { description: 'Błędne dane wejściowe' },
          401: { description: 'Niepoprawne poświadczenia' },
        },
      },
    },

    '/api/user/auth/refresh': {
      post: {
        tags: ['Uwierzytelnianie (Auth)'],
        summary: 'Odświeżenie tokenu JWT',
        security: [] as Record<string, string[]>[],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['refreshToken'],
                properties: {
                  refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsIn...' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Wygenerowano nowy token JWT' },
          400: { description: 'Brak refreshTokenu' },
          401: { description: 'Nieprawidłowy lub wygasły token' },
        },
      },
    },

    '/api/user/logout': {
      delete: {
        tags: ['Uwierzytelnianie (Auth)'],
        summary: 'Wylogowanie użytkownika (unieważnienie aktywnej sesji tokenu)',
        responses: {
          200: { description: 'Wylogowano pomyślnie' },
          400: { description: 'Brak tokenu autoryzacyjnego' },
          401: { description: 'Błąd autoryzacji' },
        },
      },
    },

    '/api/user/create': {
      post: {
        tags: ['Użytkownik (User)'],
        summary: 'Rejestracja nowego użytkownika',
        security: [] as Record<string, string[]>[],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'userName', 'password'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'jan.kowalski@example.com' },
                  userName: { type: 'string', example: 'jankowalski' },
                  password: { type: 'string', minLength: 8, example: 'tajnehaslo123' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Pomyślnie utworzono konto' },
          400: { description: 'Błąd walidacji lub login/email zajęty' },
        },
      },
    },

    '/api/user/update': {
      post: {
        tags: ['Użytkownik (User)'],
        summary: 'Aktualizacja profilu użytkownika (email, login, zmiana hasła)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', format: 'email', example: 'nowy.email@example.com' },
                  userName: { type: 'string', example: 'nowyLogin' },
                  currentPassword: { type: 'string', example: 'stareHaslo123' },
                  password: { type: 'string', minLength: 8, example: 'noweHaslo123' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Pomyślnie zaktualizowano profil' },
          400: { description: 'Błędne dane wejściowe lub brak aktualnego hasła' },
          401: { description: 'Nieprawidłowe aktualne hasło lub brak autoryzacji' },
          409: { description: 'Podany login lub email jest już zajęty' },
        },
      },
    },

    '/api/user/reset/code': {
      post: {
        tags: ['Użytkownik (User)'],
        summary: 'Wysłanie 6-cyfrowego kodu weryfikacyjnego na email do resetu hasła',
        security: [] as Record<string, string[]>[],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'jan.kowalski@example.com' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Kod weryfikacyjny został wysłany (jeśli konto istnieje)' },
          400: { description: 'Błędny format adresu email' },
        },
      },
    },

    '/api/user/reset/password': {
      post: {
        tags: ['Użytkownik (User)'],
        summary: 'Ustawienie nowego hasła przy użyciu kodu weryfikacyjnego',
        security: [] as Record<string, string[]>[],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['code', 'password'],
                properties: {
                  code: { type: 'string', minLength: 6, maxLength: 6, example: '123456' },
                  password: { type: 'string', minLength: 8, example: 'noweBezpieczneHaslo123' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Hasło zostało pomyślnie zresetowane' },
          400: { description: 'Nieprawidłowy lub wygasły kod weryfikacyjny' },
        },
      },
    },

    '/api/lights/status/app': {
      get: {
        tags: ['Oświetlenie - Sterowanie'],
        summary: 'Pobiera stan wszystkich lamp dla aplikacji',
        responses: {
          200: {
            description: 'Lista zarejestrowanych lamp wraz ze statusem włączenia',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string', example: 'living_room' },
                      state: { type: 'number', enum: [0, 1], example: 1 },
                    },
                  },
                },
              },
            },
          },
          401: { description: 'Wymagana autoryzacja Bearer JWT' },
        },
      },
    },

    '/api/lights/update': {
      post: {
        tags: ['Oświetlenie - Sterowanie'],
        summary: 'Przełącza stan pojedynczej lampy (włącz / wyłącz)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'state'],
                properties: {
                  name: { type: 'string', example: 'living_room' },
                  state: {
                    type: 'number',
                    enum: [0, 1],
                    description: '1 = Włączone, 0 = Wyłączone',
                    example: 1,
                  },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Stan lampy zaktualizowany pomyślnie' },
          400: { description: 'Nieprawidłowa nazwa lampy lub stan' },
          401: { description: 'Brak autoryzacji' },
        },
      },
    },

    '/api/lights/history': {
      get: {
        tags: ['Oświetlenie - Historia'],
        summary: 'Pobiera historię przełączeń świateł',
        parameters: [
          {
            name: 'limit',
            in: 'query',
            description: 'Maksymalna liczba zwracanych wpisów',
            required: false,
            schema: { type: 'integer', example: 20 },
          },
        ],
        responses: {
          200: { description: 'Lista wpisów historii przełączeń' },
          401: { description: 'Brak autoryzacji' },
        },
      },
    },

    '/api/lights/history/reset': {
      delete: {
        tags: ['Oświetlenie - Historia'],
        summary: 'Czyści całą historię przełączeń świateł',
        responses: {
          200: { description: 'Historia została pomyślnie wyczyszczona' },
          401: { description: 'Brak autoryzacji' },
        },
      },
    },

    '/api/lights/energy': {
      get: {
        tags: ['Oświetlenie - Energia'],
        summary: 'Pobiera statystyki zużycia energii elektrycznej przez lampy',
        parameters: [
          {
            name: 'timeframe',
            in: 'query',
            description: 'Zakres czasu do analizy',
            required: false,
            schema: { type: 'string', enum: ['today', 'week', 'month'], default: 'today' },
          },
          {
            name: 'room',
            in: 'query',
            description: 'Pomieszczenie lub nazwa lampy',
            required: false,
            schema: { type: 'string', default: 'entireHouse' },
          },
        ],
        responses: {
          200: { description: 'Statystyki zużycia energii (kWh, koszt, podział na godziny)' },
          400: { description: 'Nieprawidłowy parametr zapytania' },
          401: { description: 'Brak autoryzacji' },
        },
      },
    },

    '/api/lights/energy/reset': {
      delete: {
        tags: ['Oświetlenie - Energia'],
        summary: 'Resetuje zgromadzone statystyki zużycia energii',
        responses: {
          200: { description: 'Statystyki energii zostały zresetowane' },
          401: { description: 'Brak autoryzacji' },
        },
      },
    },

    '/api/lights/rules': {
      get: {
        tags: ['Oświetlenie - Harmonogram'],
        summary: 'Pobiera listę wszystkich reguł harmonogramu oświetlenia',
        responses: {
          200: { description: 'Lista aktywnych i nieaktywnych reguł harmonogramu' },
          401: { description: 'Brak autoryzacji' },
        },
      },
      post: {
        tags: ['Oświetlenie - Harmonogram'],
        summary: 'Tworzy nową regułę harmonogramu oświetlenia',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'days', 'startTime', 'endTime'],
                properties: {
                  name: { type: 'string', example: 'Poranne budzenie' },
                  days: {
                    type: 'array',
                    items: { type: 'integer', minimum: 0, maximum: 6 },
                    example: [1, 2, 3, 4, 5],
                    description: 'Dni tygodnia (0 = niedziela, 1 = poniedziałek, ...)',
                  },
                  startTime: { type: 'string', example: '07:00' },
                  endTime: { type: 'string', example: '08:00' },
                  rooms: {
                    type: 'array',
                    items: { type: 'string' },
                    example: ['bedroom', 'kitchen'],
                  },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Reguła utworzona pomyślnie' },
          400: { description: 'Błąd walidacji danych reguły' },
          401: { description: 'Brak autoryzacji' },
        },
      },
    },

    '/api/lights/rules/{id}': {
      put: {
        tags: ['Oświetlenie - Harmonogram'],
        summary: 'Włącza lub wyłącza wybraną regułę harmonogramu',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Identyfikator reguły (ObjectId)',
            schema: { type: 'string', example: '6af9d1abcdb04ad922bb2b8b' },
          },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  active: { type: 'boolean', example: false },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Status reguły zaktualizowany' },
          400: { description: 'Nieprawidłowy format ID' },
          404: { description: 'Reguła nie znaleziona' },
        },
      },
      delete: {
        tags: ['Oświetlenie - Harmonogram'],
        summary: 'Usuwa wybraną regułę harmonogramu',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Identyfikator reguły (ObjectId)',
            schema: { type: 'string', example: '6af9d1abcdb04ad922bb2b8b' },
          },
        ],
        responses: {
          200: { description: 'Reguła usunięta pomyślnie' },
          400: { description: 'Nieprawidłowy format ID' },
          404: { description: 'Reguła nie znaleziona' },
        },
      },
    },

    '/api/lights/scenes': {
      get: {
        tags: ['Oświetlenie - Sceny'],
        summary: 'Pobiera listę wszystkich scen oświetlenia',
        responses: {
          200: { description: 'Lista zdefiniowanych scen' },
          401: { description: 'Brak autoryzacji' },
        },
      },
      post: {
        tags: ['Oświetlenie - Sceny'],
        summary: 'Tworzy nową scenę oświetlenia',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'icon'],
                properties: {
                  name: { type: 'string', example: 'Wieczór Filmowy' },
                  icon: { type: 'string', example: 'movie' },
                  rooms: {
                    type: 'array',
                    items: { type: 'string' },
                    example: ['living_room'],
                  },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Scena utworzona pomyślnie' },
          400: { description: 'Błąd walidacji danych sceny' },
          401: { description: 'Brak autoryzacji' },
        },
      },
    },

    '/api/lights/scenes/{id}': {
      put: {
        tags: ['Oświetlenie - Sceny'],
        summary: 'Włącza lub wyłącza wybraną scenę oświetlenia',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Identyfikator sceny (ObjectId)',
            schema: { type: 'string', example: '6af9d1accdb04ad922bb2ba1' },
          },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  active: { type: 'boolean', example: true },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Status sceny zaktualizowany' },
          400: { description: 'Nieprawidłowy format ID' },
          404: { description: 'Scena nie znaleziona' },
        },
      },
      delete: {
        tags: ['Oświetlenie - Sceny'],
        summary: 'Usuwa wybraną scenę oświetlenia',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Identyfikator sceny (ObjectId)',
            schema: { type: 'string', example: '6af9d1accdb04ad922bb2ba1' },
          },
        ],
        responses: {
          200: { description: 'Scena usunięta pomyślnie' },
          400: { description: 'Nieprawidłowy format ID' },
          404: { description: 'Scena nie znaleziona' },
        },
      },
    },

    '/api/air/current': {
      get: {
        tags: ['Powietrze (Air)'],
        summary: 'Pobiera najnowszy odczyt parametrów powietrza z czujnika',
        responses: {
          200: {
            description: 'Bieżące parametry powietrza (lub null przy braku pomiarów)',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    _id: { type: 'string', example: '6af9d1accdb04ad922bb2ba9' },
                    temperature: { type: 'number', example: 22.4 },
                    humidity: { type: 'number', example: 48.5 },
                    pressure: { type: 'number', example: 1013.2 },
                    createdAt: {
                      type: 'string',
                      format: 'date-time',
                      example: '2026-11-27T21:30:00.000Z',
                    },
                  },
                },
              },
            },
          },
          401: { description: 'Brak autoryzacji' },
          503: { description: 'Płytka sterownika jest offline' },
          500: { description: 'Błąd serwera' },
        },
      },
    },

    '/api/air/history': {
      get: {
        tags: ['Powietrze (Air)'],
        summary: 'Pobiera zagregowaną historię pomiarów powietrza do wykresów',
        parameters: [
          {
            name: 'timeframe',
            in: 'query',
            description: 'Przedział czasowy agregacji danych',
            required: false,
            schema: { type: 'string', enum: ['today', 'week', 'month'], default: 'today' },
          },
        ],
        responses: {
          200: {
            description: 'Zagregowane serie danych (temperatura, wilgotność, ciśnienie)',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    timeframe: {
                      type: 'string',
                      enum: ['today', 'week', 'month'],
                      example: 'today',
                    },
                    categories: {
                      type: 'array',
                      items: { type: 'string' },
                      example: ['18:00', '18:01', '18:02'],
                    },
                    temperature: {
                      type: 'array',
                      items: { type: 'number', nullable: true },
                      example: [22.1, 22.3, 22.4],
                    },
                    humidity: {
                      type: 'array',
                      items: { type: 'number', nullable: true },
                      example: [48.0, 48.2, 48.5],
                    },
                    pressure: {
                      type: 'array',
                      items: { type: 'number', nullable: true },
                      example: [1013.0, 1013.1, 1013.2],
                    },
                  },
                },
              },
            },
          },
          400: { description: 'Nieprawidłowy parametr timeframe' },
          401: { description: 'Brak autoryzacji' },
          500: { description: 'Błąd serwera' },
        },
      },
    },

    '/api/air/history/clear': {
      delete: {
        tags: ['Powietrze (Air)'],
        summary:
          'Usuwa całą zapisaną historię pomiarów powietrza i wysyła zdarzenie SSE air:history_cleared',
        responses: {
          200: {
            description: 'Historia pomiarów powietrza wyczyszczona pomyślnie',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'History cleared successfully' },
                    deletedCount: { type: 'integer', example: 42 },
                  },
                },
              },
            },
          },
          401: { description: 'Brak autoryzacji' },
          500: { description: 'Błąd serwera' },
        },
      },
    },

    '/api/weather/current': {
      get: {
        tags: ['Pogoda (Weather)'],
        summary: 'Pobiera aktualną pogodę dla skonfigurowanego miasta (z cache 10 min)',
        responses: {
          200: {
            description: 'Aktualne dane pogodowe z OpenWeatherMap',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    temperature: { type: 'number', example: 14.3 },
                    feelsLike: { type: 'number', example: 12.8 },
                    humidity: { type: 'number', example: 62 },
                    pressure: { type: 'number', example: 1016 },
                    windSpeed: { type: 'number', example: 14.4 },
                    clouds: { type: 'number', example: 40 },
                    condition: { type: 'string', example: 'Clouds' },
                    description: { type: 'string', example: 'zachmurzenie umiarkowane' },
                    icon: { type: 'string', example: '03d' },
                    updatedAt: {
                      type: 'string',
                      format: 'date-time',
                      example: '2026-11-27T12:00:00.000Z',
                    },
                  },
                },
              },
            },
          },
          401: { description: 'Brak autoryzacji' },
          500: { description: 'Błąd pobierania danych pogodowych' },
        },
      },
    },

    '/api/weather/forecast': {
      get: {
        tags: ['Pogoda (Weather)'],
        summary: 'Pobiera 5-dniową prognozę pogody co 3 godziny (z cache 30 min)',
        responses: {
          200: {
            description: 'Prognoza pogody z OpenWeatherMap',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    items: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          timestamp: { type: 'integer', example: 1700010800 },
                          dateTime: { type: 'string', example: '2026-11-27 15:00:00' },
                          temperature: { type: 'number', example: 15.4 },
                          condition: { type: 'string', example: 'Rain' },
                          icon: { type: 'string', example: '10d' },
                        },
                      },
                    },
                    updatedAt: {
                      type: 'string',
                      format: 'date-time',
                      example: '2026-11-27T12:00:00.000Z',
                    },
                  },
                },
              },
            },
          },
          401: { description: 'Brak autoryzacji' },
          500: { description: 'Błąd pobierania prognozy pogody' },
        },
      },
    },
  },
};
