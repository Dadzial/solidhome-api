export const swaggerDocument = {
    openapi: '3.0.0',
    info: {
        title: 'SolidHome API Documentation',
        version: '1.0.0',
        description: 'Documentation REST API and SSE',
    },
    servers: [
        {
            url: 'http://localhost:3100',
            description: 'Dev serwer',
        },
    ],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                description: 'Token JWT from /api/user/auth',
            },
        },
    },
    security: [
        {
            bearerAuth: [] as string[],
        },
    ],
    paths: {},
};
