import { beforeAll, afterEach, afterAll } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

/**
 * Ustawienie zmiennej środowiskowej JWT_SECRET dla testów.
 * Jeśli nie jest ustawiona, przypisuje domyślną wartość 'test_jwt_secret_key_123456789'.
 */
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_key_123456789';

let mongoServer: MongoMemoryServer;

/**
 * Inicjalizacja bazy danych w pamięci RAM przed uruchomieniem testów.
 */
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

/**
 * Czyszczenie wszystkich kolekcji po każdym pojedynczym teście.
 */
afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

/**
 * Zatrzymanie serwera w pamięci i zamknięcie połączenia po zakończeniu testów.
 */
afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});
